#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'perf-reports');
const PREVIEW_PORT = 4173;

const urlArg = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1];
const usePreview = process.argv.includes('--preview');
const label = process.argv.find((a) => a.startsWith('--label='))?.split('=')[1] ?? 'visual-stability';
const deviceArg = process.argv.find((a) => a.startsWith('--device='))?.split('=')[1] ?? 'desktop';
const throttleArg = process.argv.find((a) => a.startsWith('--throttle='))?.split('=')[1] ?? 'none';

function resolveDeviceProfile(device) {
    if (device === 'mobile' || device === 'pixel7') {
        return { name: 'Pixel 7', profile: devices['Pixel 7'] };
    }
    if (device === 'iphone14') {
        return { name: 'iPhone 14', profile: devices['iPhone 14'] };
    }
    return { name: 'Desktop Chrome', profile: {} };
}

async function applyThrottleProfile(context, page, throttle) {
    if (throttle !== 'slow-mobile') return async () => {};

    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
        uploadThroughput: Math.round((0.75 * 1024 * 1024) / 8),
        connectionType: 'cellular4g',
    });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    return async () => {
        await session.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => undefined);
        await session.send('Network.disable').catch(() => undefined);
    };
}

async function waitForServer(url, ms = 30_000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch {
            /* retry */
        }
        await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error(`server not ready: ${url}`);
}

function spawnCmd(cmd, args) {
    return spawn(cmd, args, {
        cwd: ROOT,
        stdio: 'ignore',
        shell: process.platform === 'win32',
    });
}

function startPreview() {
    return spawnCmd('npx', [
        'vite',
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        String(PREVIEW_PORT),
        '--strictPort',
    ]);
}

function isVisible(state) {
    return Boolean(
        state &&
            state.present &&
            !state.hidden &&
            state.display !== 'none' &&
            state.visibility !== 'hidden' &&
            state.area > 0 &&
            state.opacity > 0.02,
    );
}

function maxAbs(values) {
    return values.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
}

function analyzeFrames(raw) {
    const selectorKeys = ['main', 'header', 'hub', 'dock', 'boot'];
    const summary = {
        framesCaptured: raw.frames.length,
        durationMs: raw.doneAt ?? (raw.frames.at(-1)?.t ?? null),
        layoutShiftScore: raw.layoutShiftEntries
            .filter((entry) => entry && entry.hadRecentInput !== true)
            .reduce((sum, entry) => sum + (entry.value ?? 0), 0),
        elements: {},
        sync: {},
    };

    for (const key of selectorKeys) {
        const firstVisibleIndex = raw.frames.findIndex((frame) => isVisible(frame[key]));
        const firstVisibleFrame = firstVisibleIndex >= 0 ? raw.frames[firstVisibleIndex] : null;
        const firstVisibleMs = firstVisibleFrame?.t ?? null;
        const stableFrames = firstVisibleIndex >= 0 ? raw.frames.slice(firstVisibleIndex) : [];
        const deltas = [];
        for (let i = 1; i < stableFrames.length; i += 1) {
            const prev = stableFrames[i - 1][key];
            const next = stableFrames[i][key];
            if (!isVisible(prev) || !isVisible(next)) continue;
            deltas.push({
                dx: next.x - prev.x,
                dy: next.y - prev.y,
                dw: next.w - prev.w,
                dh: next.h - prev.h,
                dopacity: Number((next.opacity - prev.opacity).toFixed(3)),
            });
        }

        const maxRectShiftPx = deltas.length
            ? maxAbs(
                  deltas.flatMap((delta) => [delta.dx, delta.dy, delta.dw, delta.dh]),
              )
            : 0;
        const maxOpacityStep = deltas.length ? maxAbs(deltas.map((delta) => delta.dopacity)) : 0;
        const mutationFrames = deltas.filter(
            (delta) =>
                Math.abs(delta.dx) > 1 ||
                Math.abs(delta.dy) > 1 ||
                Math.abs(delta.dw) > 1 ||
                Math.abs(delta.dh) > 1 ||
                Math.abs(delta.dopacity) > 0.05,
        ).length;

        summary.elements[key] = {
            firstVisibleMs,
            maxRectShiftPx,
            maxOpacityStep,
            mutationFrames,
        };
    }

    const mainVisibleMs = summary.elements.main.firstVisibleMs;
    for (const key of ['header', 'hub', 'dock']) {
        const targetVisibleMs = summary.elements[key].firstVisibleMs;
        summary.sync[key] =
            mainVisibleMs == null || targetVisibleMs == null ? null : targetVisibleMs - mainVisibleMs;
    }

    return summary;
}

function evaluateSummary(summary) {
    const failures = [];
    if (summary.layoutShiftScore > 0.02) {
        failures.push(`layoutShiftScore=${summary.layoutShiftScore.toFixed(4)} > 0.02`);
    }

    for (const [key, gap] of Object.entries(summary.sync)) {
        if (gap != null && gap > 120) {
            failures.push(`${key} sync gap=${gap}ms > 120ms`);
        }
    }

    for (const [key, element] of Object.entries(summary.elements)) {
        if (key === 'boot') continue;
        if (element.firstVisibleMs == null) {
            failures.push(`${key} never became visible`);
            continue;
        }
        if (element.maxRectShiftPx > 4) {
            failures.push(`${key} maxRectShiftPx=${element.maxRectShiftPx} > 4`);
        }
        if (element.maxOpacityStep > 0.35) {
            failures.push(`${key} maxOpacityStep=${element.maxOpacityStep} > 0.35`);
        }
    }

    return failures;
}

async function measureVisualStability(url) {
    const browser = await chromium.launch({ headless: true });
    const deviceProfile = resolveDeviceProfile(deviceArg);
    const context = await browser.newContext({ ...deviceProfile.profile });
    const page = await context.newPage();
    const restoreThrottle = await applyThrottleProfile(context, page, throttleArg);

    await page.addInitScript(() => {
        try {
            localStorage.setItem('hami:last-screen', 'lawyer');
        } catch {
            /* ignore */
        }

        const selectors = {
            main: '[data-testid="home-main-zone"]',
            header: '[data-testid="header-toolbar-nav"]',
            hub: '[data-testid="home-hub-card"]',
            dock: '[data-testid="home-bottom-chrome"]',
            boot: '[data-testid="lawyer-boot-shell"]',
        };

        const snapshot = (selector) => {
            const el = document.querySelector(selector);
            if (!(el instanceof HTMLElement)) {
                return {
                    present: false,
                    x: 0,
                    y: 0,
                    w: 0,
                    h: 0,
                    area: 0,
                    opacity: 0,
                    display: 'none',
                    visibility: 'hidden',
                    hidden: false,
                };
            }

            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return {
                present: true,
                x: Math.round(rect.x * 100) / 100,
                y: Math.round(rect.y * 100) / 100,
                w: Math.round(rect.width * 100) / 100,
                h: Math.round(rect.height * 100) / 100,
                area: Math.round(rect.width * rect.height),
                opacity: Number(style.opacity || '1'),
                display: style.display,
                visibility: style.visibility,
                hidden: el.hidden,
            };
        };

        window.__hamiVisualAudit = {
            selectors,
            frames: [],
            layoutShiftEntries: [],
            done: false,
            doneAt: null,
        };

        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    window.__hamiVisualAudit.layoutShiftEntries.push({
                        value: entry.value,
                        startTime: Math.round(entry.startTime),
                        hadRecentInput: entry.hadRecentInput,
                    });
                }
            });
            observer.observe({ type: 'layout-shift', buffered: true });
        } catch {
            /* layout shift not supported */
        }

        let trailingFrames = 0;
        const tick = (ts) => {
            const frame = { t: Math.round(ts) };
            for (const [key, selector] of Object.entries(selectors)) {
                frame[key] = snapshot(selector);
            }
            window.__hamiVisualAudit.frames.push(frame);

            const bootDone =
                performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark').length > 0 &&
                performance.getEntriesByName('hami:boot:overlay-removed', 'mark').length > 0;
            if (bootDone) trailingFrames += 1;

            if ((bootDone && trailingFrames >= 30) || ts >= 12_000) {
                window.__hamiVisualAudit.done = true;
                window.__hamiVisualAudit.doneAt = Math.round(ts);
                return;
            }
            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('lawyer-dashboard-ready').waitFor({ timeout: 60_000 });
    await page.getByTestId('home-main-zone').waitFor({ timeout: 30_000 });
    await page.getByTestId('home-bottom-chrome').waitFor({ timeout: 30_000 });
    await page
        .waitForFunction(() => window.__hamiVisualAudit?.done === true, undefined, { timeout: 20_000 })
        .catch(() => undefined);

    const raw = await page.evaluate(() => window.__hamiVisualAudit);
    await page.screenshot({ path: path.join(outDir, `${label}-${deviceArg}-${throttleArg}.png`), fullPage: true });

    await restoreThrottle();
    await context.close();
    await browser.close();

    const summary = analyzeFrames(raw);
    const failures = evaluateSummary(summary);

    return {
        url,
        device: deviceProfile.name,
        throttle: throttleArg,
        measuredAt: new Date().toISOString(),
        raw,
        summary,
        failures,
    };
}

let previewProc = null;
const baseUrl = urlArg ?? (usePreview ? `http://127.0.0.1:${PREVIEW_PORT}/` : 'http://localhost:8080/');

try {
    if (usePreview) {
        if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
            console.error('[visual-stability] run npm run build first, or omit --preview');
            process.exit(1);
        }
        previewProc = startPreview();
        await waitForServer(baseUrl);
    } else {
        await waitForServer(baseUrl, 8_000).catch(() => {
            console.error(`[visual-stability] no server at ${baseUrl} — start dev/preview or pass --preview`);
            process.exit(1);
        });
    }

    fs.mkdirSync(outDir, { recursive: true });
    const report = await measureVisualStability(baseUrl);
    const outJson = path.join(outDir, `${label}-${deviceArg}-${throttleArg}.json`);
    fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

    console.log(`[visual-stability] frames: ${report.summary.framesCaptured}`);
    console.log(`[visual-stability] duration: ${report.summary.durationMs} ms`);
    console.log(`[visual-stability] layoutShiftScore: ${report.summary.layoutShiftScore}`);
    console.log(`[visual-stability] sync gaps: ${JSON.stringify(report.summary.sync)}`);
    console.log(`[visual-stability] failures: ${report.failures.length}`);
    for (const failure of report.failures) {
        console.error(`[visual-stability] BLOCKED ${failure}`);
    }
    console.log(`[visual-stability] saved ${outJson}`);

    if (report.failures.length > 0) {
        process.exit(1);
    }
} finally {
    previewProc?.kill('SIGTERM');
}
