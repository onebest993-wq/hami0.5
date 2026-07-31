/**
 * قياس TTFI ومراحل الإقلاع — يتطلب خادماً جاهزاً (dev أو preview).
 *
 * الاستخدام:
 *   # بناء قياس (يفتح shell بدون جلسة Supabase) ثم preview:
 *   VITE_SHELL_AUTH_OPEN=true npm run build
 *   npm run perf:boot-ttfi -- --preview
 *   npm run perf:boot-ttfi -- --url=http://localhost:8080
 *
 * ملاحظة صدق: بناء القياس بـ VITE_SHELL_AUTH_OPEN=true ليس عقد إنتاج —
 * أعد البناء بـ false قبل النشر.
 */
import { spawn, spawnSync } from 'node:child_process';
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
const label = process.argv.find((a) => a.startsWith('--label='))?.split('=')[1] ?? 'boot-ttfi';
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

async function assertPortFree(port) {
    try {
        const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(800) });
        if (res) {
            throw new Error(
                `port ${port} already serves HTTP — kill the stale vite preview before cold TTFI`,
            );
        }
    } catch (err) {
        if (err && typeof err === 'object' && 'message' in err && String(err.message).includes('already serves')) {
            throw err;
        }
    }
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

async function measureBoot(url) {
    const browser = await chromium.launch({ headless: true });
    const deviceProfile = resolveDeviceProfile(deviceArg);
    const context = await browser.newContext({ ...deviceProfile.profile });
    const page = await context.newPage();
    const restoreThrottle = await applyThrottleProfile(context, page, throttleArg);

    // يطابق e2e/helpers/bootFixtures.prepareBootE2E — last-screen في sessionStorage
    await page.addInitScript(() => {
        try {
            sessionStorage.setItem('hami:last-screen', 'lawyer');
            sessionStorage.setItem('hami:lawyer-dashboard-tab', 'home');
            sessionStorage.removeItem('hami:lawyer-community-open');
            localStorage.setItem('hami:weekly-backup-reminder-at', String(Date.now()));
            const rawSettings = localStorage.getItem('lawyer_settings');
            let parsedSettings = {};
            if (rawSettings && rawSettings.trim()) {
                try {
                    parsedSettings = JSON.parse(rawSettings);
                } catch {
                    parsedSettings = {};
                }
            }
            const security =
                parsedSettings.security && typeof parsedSettings.security === 'object'
                    ? parsedSettings.security
                    : {};
            localStorage.setItem(
                'lawyer_settings',
                JSON.stringify({
                    ...parsedSettings,
                    version: parsedSettings.version ?? 2,
                    security: {
                        ...security,
                        biometricLock: false,
                        autoLockMinutes: 0,
                    },
                    homeLayout: {
                        ...(parsedSettings.homeLayout && typeof parsedSettings.homeLayout === 'object'
                            ? parsedSettings.homeLayout
                            : {}),
                        dockVisible: true,
                        quickNoteVisible: false,
                    },
                }),
            );
        } catch {
            /* ignore */
        }
        const strip = () => document.getElementById('hami-boot-failure')?.remove();
        strip();
        const observer = new MutationObserver(strip);
        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    });

    const navStart = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });

    const devBypass = page.getByRole('button', { name: /تخطي المطور|دخول تجريبي|تخطي/i });
    if (await devBypass.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await devBypass.click().catch(() => undefined);
    }

    await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'attached', timeout: 90_000 });
    await Promise.any([
        page.getByTestId('home-bottom-chrome').waitFor({ state: 'attached', timeout: 30_000 }),
        page.getByTestId('home-main-zone').waitFor({ state: 'attached', timeout: 30_000 }),
        page.getByTestId('lawyer-dashboard-home-surface').waitFor({ state: 'attached', timeout: 30_000 }),
    ]);
    await page
        .getByTestId('lawyer-boot-shell')
        .waitFor({ state: 'hidden', timeout: 30_000 })
        .catch(() => undefined);
    await page
        .getByTestId('lawyer-boot-shell')
        .waitFor({ state: 'detached', timeout: 30_000 })
        .catch(() => undefined);

    const metrics = await page.evaluate(() => {
        const phases = [
            'start',
            'static-shell-visible',
            'app-render',
            'shell-visible',
            'overlay-removed',
            'dashboard-chunk-loaded',
            'dashboard-interactive',
            'first-tab-open',
        ];
        const startMark = performance.getEntriesByName('hami:boot:start', 'mark')[0];
        const origin = startMark?.startTime ?? 0;
        const timeline = phases.map((phase) => {
            const entry = performance.getEntriesByName(`hami:boot:${phase}`, 'mark')[0];
            return { phase, ms: entry ? Math.round(entry.startTime - origin) : null };
        });
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find((e) => e.name === 'first-contentful-paint');
        const nav = performance.getEntriesByType('navigation')[0];
        const probeTtfi =
            typeof window !== 'undefined'
                ? /** @type {Window & { __hamiTtfiMs?: number | null }} */ (window).__hamiTtfiMs
                : null;
        return {
            timeline,
            ttfiMs: timeline.find((r) => r.phase === 'dashboard-interactive')?.ms ?? null,
            probeTtfiMs: typeof probeTtfi === 'number' ? probeTtfi : null,
            overlayRemovedMs: timeline.find((r) => r.phase === 'overlay-removed')?.ms ?? null,
            firstTabOpenMs: timeline.find((r) => r.phase === 'first-tab-open')?.ms ?? null,
            staticShellMs: timeline.find((r) => r.phase === 'static-shell-visible')?.ms ?? null,
            chunkLoadedMs: timeline.find((r) => r.phase === 'dashboard-chunk-loaded')?.ms ?? null,
            fcpMs: fcp ? Math.round(fcp.startTime) : null,
            domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        };
    });

    await restoreThrottle();
    await context.close();
    await browser.close();

    return {
        url,
        device: deviceProfile.name,
        throttle: throttleArg,
        measuredAt: new Date().toISOString(),
        wallClockMs: Date.now() - navStart,
        ...metrics,
    };
}

let previewProc = null;
let baseUrl = urlArg ?? (usePreview ? `http://127.0.0.1:${PREVIEW_PORT}/` : 'http://localhost:8080/');

try {
    if (usePreview) {
        if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
            console.error('[boot-ttfi] run npm run build first, or omit --preview');
            process.exit(1);
        }
        await assertPortFree(PREVIEW_PORT);
        previewProc = startPreview();
        await waitForServer(baseUrl);
    } else {
        await waitForServer(baseUrl, 8_000).catch(() => {
            console.error(`[boot-ttfi] no server at ${baseUrl} — start dev/preview or pass --preview`);
            process.exit(1);
        });
    }

    fs.mkdirSync(outDir, { recursive: true });
    const report = await measureBoot(baseUrl);
    const outJson = path.join(outDir, `${label}.json`);
    fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

    console.log(`[boot-ttfi] TTFI (dashboard-interactive): ${report.ttfiMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] static shell mark: ${report.staticShellMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] overlay removed: ${report.overlayRemovedMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] dashboard chunk loaded: ${report.chunkLoadedMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] first tab open: ${report.firstTabOpenMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] FCP: ${report.fcpMs ?? 'n/a'} ms | DCL: ${report.domContentLoadedMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] wall clock to ready: ${report.wallClockMs} ms`);
    console.log(`[boot-ttfi] saved ${outJson}`);
} finally {
    if (previewProc?.pid) {
        try {
            if (process.platform === 'win32') {
                spawnSync('taskkill', ['/pid', String(previewProc.pid), '/T', '/F'], {
                    stdio: 'ignore',
                    windowsHide: true,
                });
            } else {
                previewProc.kill('SIGTERM');
            }
        } catch {
            /* */
        }
    }
}
