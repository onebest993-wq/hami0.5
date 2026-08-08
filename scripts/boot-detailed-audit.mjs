/**
 * قياس تفصيلي للإقلاع — شعار ثابت، سواد، TTFI، استئناف.
 * يتطلب: npm run build && vite preview على المنفذ 4173
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/`;

async function waitForServer(ms = 30_000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        try {
            const res = await fetch(BASE);
            if (res.ok) return;
        } catch {
            /* retry */
        }
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error('preview server not ready');
}

function startPreview() {
    return spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
        cwd: ROOT,
        stdio: 'ignore',
        shell: true,
    });
}

function killProc(proc) {
    if (!proc?.pid) return;
    try {
        if (process.platform === 'win32') {
            spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
        } else {
            proc.kill('SIGTERM');
        }
    } catch {
        /* ignore */
    }
}

async function seedSession(page) {
    await page.addInitScript(() => {
        try {
            sessionStorage.setItem('hami:last-screen', 'lawyer');
            sessionStorage.setItem('hami:lawyer-dashboard-tab', 'home');
            localStorage.setItem('hami:weekly-backup-reminder-at', String(Date.now()));
            const raw = localStorage.getItem('lawyer_settings');
            let s = {};
            if (raw) {
                try {
                    s = JSON.parse(raw);
                } catch {
                    s = {};
                }
            }
            localStorage.setItem(
                'lawyer_settings',
                JSON.stringify({
                    ...s,
                    version: s.version ?? 2,
                    security: { ...(s.security ?? {}), biometricLock: false, autoLockMinutes: 0 },
                    homeLayout: { ...(s.homeLayout ?? {}), dockVisible: true, quickNoteVisible: false },
                }),
            );
        } catch {
            /* ignore */
        }
    });
}

async function measureColdBoot(deviceName, deviceProfile) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ...deviceProfile });
    const page = await context.newPage();
    await seedSession(page);

    const samples = [];
    const poll = async () => {
        return page.evaluate(() => {
            const staticBoot = document.getElementById('hami-static-boot');
            const wordmark = document.querySelector('[data-testid="hami-boot-wordmark"]');
            const stBoot = staticBoot ? getComputedStyle(staticBoot) : null;
            const stWordmark = wordmark ? getComputedStyle(wordmark) : null;
            const homeGrid = document.querySelector('[data-testid="home-main-grid"]');
            const ready = document.querySelector('[data-testid="lawyer-dashboard-ready"]');
            const timeline = performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark')[0];
            const firstTab = performance.getEntriesByName('hami:boot:first-tab-open', 'mark')[0];
            const start = performance.getEntriesByName('hami:boot:start', 'mark')[0];
            const origin = start?.startTime ?? 0;
            const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
            const wordmarkText = wordmark?.textContent?.trim() ?? '';
            return {
                t: Math.round(performance.now()),
                staticBootVisible:
                    !!staticBoot &&
                    stBoot?.display !== 'none' &&
                    stBoot?.visibility !== 'hidden' &&
                    Number(stBoot?.opacity ?? 1) > 0.05,
                wordmarkVisible:
                    !!wordmark &&
                    stWordmark?.display !== 'none' &&
                    stWordmark?.visibility !== 'hidden' &&
                    Number(stWordmark?.opacity ?? 1) > 0.05,
                wordmarkReady: wordmarkText === 'حامي',
                homeGrid: !!homeGrid,
                dashboardReady: !!ready,
                ttfiMs: timeline ? Math.round(timeline.startTime - origin) : null,
                firstTabMs: firstTab ? Math.round(firstTab.startTime - origin) : null,
                fcpMs: fcp ? Math.round(fcp.startTime) : null,
                bootRevealed: document.documentElement.dataset.hamiBootRevealed === '1',
            };
        });
    };

    const navStart = Date.now();
    await page.goto(BASE, { waitUntil: 'commit', timeout: 90_000 });

    let done = false;
    while (Date.now() - navStart < 12_000 && !done) {
        const s = await poll();
        samples.push({ ...s, wallMs: Date.now() - navStart });
        if (s.dashboardReady && s.homeGrid && !s.staticBootVisible) {
            done = true;
            break;
        }
        await page.waitForTimeout(50);
    }

    await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'attached', timeout: 60_000 }).catch(() => undefined);
    const final = await poll();
    final.wallMs = Date.now() - navStart;

    const resourceSummary = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const bootJs = entries.find((e) => e.name.includes('hami-boot.js'));
        const bootCss = entries.find((e) => e.name.includes('hami-boot-shell.css'));
        return {
            bootJsMs: bootJs ? Math.round(bootJs.duration) : null,
            bootCssMs: bootCss ? Math.round(bootCss.duration) : null,
        };
    });

    await context.close();
    await browser.close();

    const firstWordmark = samples.find((s) => s.wordmarkVisible || s.wordmarkReady);
    const firstGrid = samples.find((s) => s.homeGrid);
    const staticGone = samples.find((s) => s.dashboardReady && !s.staticBootVisible);
    const blackGap = samples.filter(
        (s) => !s.wordmarkVisible && !s.homeGrid && s.wallMs < 2000,
    );

    return {
        device: deviceName,
        wallToCompleteMs: final.wallMs,
        ttfiMs: final.ttfiMs,
        firstTabMs: final.firstTabMs,
        fcpMs: final.fcpMs,
        wordmarkFirstSeenWallMs: firstWordmark?.wallMs ?? null,
        homeGridWallMs: firstGrid?.wallMs ?? null,
        staticBootRemovedWallMs: staticGone?.wallMs ?? null,
        ...resourceSummary,
        maxBlackGapMs: blackGap.length ? Math.max(...blackGap.map((s) => s.wallMs)) : 0,
        sampleCount: samples.length,
    };
}

async function measureResume(deviceName, deviceProfile) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ...deviceProfile });
    const page = await context.newPage();
    await seedSession(page);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'attached', timeout: 60_000 });
    await page.getByTestId('home-main-grid').waitFor({ state: 'attached', timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(500);

    const resumeStart = Date.now();
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(80);
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('pageshow'));
    });

    let resumeRecoverMs = null;
    for (let i = 0; i < 40; i++) {
        const s = await page.evaluate(() => {
            const shield = document.getElementById('hami-privacy-blur-shield');
            const st = shield ? getComputedStyle(shield) : null;
            const shieldVisible = shield && st?.visibility !== 'hidden' && Number(st?.opacity ?? 0) > 0.05;
            const staticBoot = document.getElementById('hami-static-boot');
            const stBoot = staticBoot ? getComputedStyle(staticBoot) : null;
            const bootVisible =
                !!staticBoot &&
                stBoot?.display !== 'none' &&
                stBoot?.visibility !== 'hidden' &&
                Number(stBoot?.opacity ?? 1) > 0.05;
            return { shieldVisible, bootVisible, grid: !!document.querySelector('[data-testid="home-main-grid"]') };
        });
        if (!s.shieldVisible && !s.bootVisible && s.grid) {
            resumeRecoverMs = Date.now() - resumeStart;
            break;
        }
        await page.waitForTimeout(25);
    }

    await context.close();
    await browser.close();
    return { device: deviceName, resumeRecoverMs };
}

let preview = null;
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.error('run npm run build first');
    process.exit(1);
}

try {
    preview = startPreview();
    await waitForServer();

    const desktop = await measureColdBoot('Desktop Chrome', {});
    const mobile = await measureColdBoot('Pixel 7', devices['Pixel 7']);
    const resumeDesktop = await measureResume('Desktop Chrome', {});

    const report = {
        measuredAt: new Date().toISOString(),
        environment: 'vite preview prod build (VITE_SHELL_AUTH_OPEN)',
        bootMode: 'text-wordmark-only',
        criticalPathGzipKb: 112,
        coldBoot: { desktop, mobile },
        resume: resumeDesktop,
        verdict: {},
    };

    report.verdict = {
        desktopTtfiOk: (desktop.ttfiMs ?? 9999) < 1000,
        mobileTtfiOk: (mobile.ttfiMs ?? 9999) < 1500,
        wallClockSlow: (desktop.wallToCompleteMs ?? 0) > 2500,
        firstTabSlow: (desktop.firstTabMs ?? 0) > 1500,
        resumeSlow: (resumeDesktop.resumeRecoverMs ?? 0) > 200,
    };

    const outDir = path.join(ROOT, 'perf-reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'boot-detailed-audit.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    console.log('\n=== Hami Boot Detailed Audit ===\n');
    console.log('Boot mode: text wordmark only (حامي)');
    console.log('\n--- Desktop cold boot ---');
    console.log('  Wall to complete:', desktop.wallToCompleteMs, 'ms');
    console.log('  TTFI:', desktop.ttfiMs, 'ms');
    console.log('  First tab open:', desktop.firstTabMs, 'ms');
    console.log('  FCP:', desktop.fcpMs, 'ms');
    console.log('  Wordmark first seen:', desktop.wordmarkFirstSeenWallMs, 'ms');
    console.log('  Home grid:', desktop.homeGridWallMs, 'ms');
    console.log('  Static boot removed:', desktop.staticBootRemovedWallMs, 'ms');
    console.log('\n--- Pixel 7 cold boot ---');
    console.log('  Wall to complete:', mobile.wallToCompleteMs, 'ms');
    console.log('  TTFI:', mobile.ttfiMs, 'ms');
    console.log('  First tab open:', mobile.firstTabMs, 'ms');
    console.log('\n--- Resume (desktop sim) ---');
    console.log('  Recover:', resumeDesktop.resumeRecoverMs, 'ms');
    console.log('\nSaved:', outPath);
} finally {
    killProc(preview);
}
