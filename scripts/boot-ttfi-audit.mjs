/**
 * قياس TTFI ومراحل الإقلاع — يتطلب خادماً جاهزاً (dev أو preview).
 *
 * الاستخدام:
 *   npm run build && npm run perf:boot-ttfi -- --preview
 *   npm run perf:boot-ttfi -- --url=http://localhost:8080
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'perf-reports');
const PREVIEW_PORT = 4173;

const urlArg = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1];
const usePreview = process.argv.includes('--preview');
const label = process.argv.find((a) => a.startsWith('--label='))?.split('=')[1] ?? 'boot-ttfi';

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

async function measureBoot(url) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.addInitScript(() => {
        try {
            localStorage.setItem('hami:last-screen', 'lawyer');
        } catch {
            /* ignore */
        }
    });

    const navStart = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.getByTestId('lawyer-dashboard-ready').waitFor({ timeout: 60_000 });
    await page.locator('[data-hami-drop-zone="main"]').waitFor({ timeout: 20_000 });

    const metrics = await page.evaluate(() => {
        const phases = [
            'start',
            'static-shell-visible',
            'app-render',
            'shell-visible',
            'dashboard-chunk-loaded',
            'dashboard-interactive',
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
        return {
            timeline,
            ttfiMs: timeline.find((r) => r.phase === 'dashboard-interactive')?.ms ?? null,
            staticShellMs: timeline.find((r) => r.phase === 'static-shell-visible')?.ms ?? null,
            chunkLoadedMs: timeline.find((r) => r.phase === 'dashboard-chunk-loaded')?.ms ?? null,
            fcpMs: fcp ? Math.round(fcp.startTime) : null,
            domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        };
    });

    await browser.close();

    return {
        url,
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
    console.log(`[boot-ttfi] dashboard chunk loaded: ${report.chunkLoadedMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] FCP: ${report.fcpMs ?? 'n/a'} ms | DCL: ${report.domContentLoadedMs ?? 'n/a'} ms`);
    console.log(`[boot-ttfi] wall clock to ready: ${report.wallClockMs} ms`);
    console.log(`[boot-ttfi] saved ${outJson}`);
} finally {
    previewProc?.kill('SIGTERM');
}
