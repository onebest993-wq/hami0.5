#!/usr/bin/env node
/**
 * قياس زمن فتح إضبارة دعوى مدنية (أرشيف → SmartFile) — مؤشر TTFI لقسم الدعاوى.
 *
 *   npm run build:e2e
 *   npm run perf:lawsuits-dossier-ttfi -- --preview
 *   npm run perf:lawsuits-dossier-ttfi -- --preview --device=mobile --throttle=slow-mobile --samples=3
 *   npm run perf:lawsuits-dossier-ttfi -- --url=http://192.168.1.10:4173 --device=iphone14
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import {
    applyPerfCdpThrottle,
    median,
    resolvePlaywrightDeviceProfile,
} from './perf-cdp-throttle.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'perf-reports');
const PREVIEW_PORT = 4173;

const urlArg = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1];
const usePreview = process.argv.includes('--preview');
const deviceArg = process.argv.find((a) => a.startsWith('--device='))?.split('=')[1] ?? 'desktop';
const throttleArg = process.argv.find((a) => a.startsWith('--throttle='))?.split('=')[1] ?? 'none';
const samplesArg = Number(process.argv.find((a) => a.startsWith('--samples='))?.split('=')[1] ?? '1');

async function waitForServer(url, ms = 45_000) {
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

function resolveContextOptions(device) {
    const meta = resolvePlaywrightDeviceProfile(device);
    if (meta.key === 'pixel7') return { meta, options: { ...devices['Pixel 7'] } };
    if (meta.key === 'iphone14') return { meta, options: { ...devices['iPhone 14'] } };
    return { meta, options: {} };
}

async function measureOnce(baseUrl, device, throttle) {
    const { meta, options } = resolveContextOptions(device);
    const browser = await chromium.launch();
    const context = await browser.newContext({ ...options });
    const E2E_CIVIL_FILE_ID = 990_001;
    const fileJson = JSON.stringify([
        {
            id: E2E_CIVIL_FILE_ID,
            type: 'lawsuit',
            status: 'active',
            caseNo: '100/2026',
            court: 'محكمة اختبار',
            docType: 'مدنية',
            date: '1/1/2026',
            parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعي', isClient: true, side: 'right' }],
            history: [],
            notes: [],
            images: [],
            stages: [
                {
                    id: 's1',
                    name: 'البداءة',
                    stageName: 'البداءة',
                    status: 'active',
                    caseNo: '100/2026',
                    court: 'محكمة اختبار',
                    parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعي', isClient: true, side: 'right' }],
                    timeline: [],
                    tasks: [],
                },
            ],
            activeStageIndex: 0,
        },
    ]);

    await context.addInitScript(
        ({ storageKey, activeKey, json, authKey, lastScreenKey }) => {
            localStorage.setItem(storageKey, json);
            localStorage.setItem(activeKey, json);
            sessionStorage.setItem(lastScreenKey, 'lawyer');
            const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
            localStorage.setItem(
                authKey,
                JSON.stringify({
                    access_token: 'e2e-dev-access-token-with-length-ok-abc',
                    refresh_token: 'e2e-dev-refresh-token',
                    expires_at: expiresAt,
                    expires_in: 3600,
                    token_type: 'bearer',
                    user: {
                        id: 'dev-user-uuid-1',
                        email: 'dev@local',
                        role: 'authenticated',
                        user_metadata: { accountType: 'lawyer', fullName: 'E2E Dev' },
                    },
                }),
            );
        },
        {
            storageKey: 'lawyer_files',
            activeKey: 'lawyer_files_active',
            json: fileJson,
            authKey: 'sb-wldjvjnodvyodmgbgzab-auth-token',
            lastScreenKey: 'hami:last-screen',
        },
    );

    const page = await context.newPage();
    const restoreThrottle = await applyPerfCdpThrottle(context, page, throttle);

    const marks = {};
    const t0 = Date.now();

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    marks.navigationMs = Date.now() - t0;

    await page.getByTestId('lawyer-dashboard-ready').waitFor({
        state: 'visible',
        timeout: throttle === 'none' ? 45_000 : 90_000,
    });
    await page.evaluate(() => {
        document.getElementById('hami-boot-failure')?.remove();
    });
    const hubTile = page.getByTestId('hub-archive-lawsuit');
    await hubTile.waitFor({ state: 'visible', timeout: 20_000 });
    await hubTile.hover({ timeout: 8_000 }).catch(() => undefined);

    /** Host المفتوح فقط — InstantChrome بلا data-open="true" وبلا FAB. */
    const openWorkspace = page.locator(
        '[data-testid="lawsuits-workspace"][data-open="true"]:visible',
    );
    const instantChrome = page.locator(
        '[data-testid="lawsuits-workspace"][aria-busy="true"]:visible',
    );
    const visibleFab = page.locator('[data-testid="lawsuits-add-new"]:visible');
    const archiveSurface = page.locator(
        '[data-testid="lawsuit-archive-grid"]:visible, [data-testid="lawsuit-archive-empty"]:visible',
    );
    const workspaceExit = page.locator('[data-testid="lawsuits-workspace-exit"]:visible');

    const clickHubTile = () =>
        page.evaluate(() => {
            document.getElementById('hami-boot-failure')?.remove();
            const hub = document.querySelector('[data-testid="hub-archive-lawsuit"]');
            if (hub instanceof HTMLElement) hub.click();
        });

    const hubStart = Date.now();
    const openDeadline = Date.now() + 45_000;
    let hubClicks = 0;
    while (Date.now() < openDeadline) {
        if (await openWorkspace.isVisible().catch(() => false)) break;
        if (await instantChrome.isVisible().catch(() => false)) {
            await page.waitForTimeout(250);
            continue;
        }
        if (await workspaceExit.isVisible().catch(() => false)) {
            await page.waitForTimeout(250);
            continue;
        }
        if (hubClicks === 0) {
            await clickHubTile();
            hubClicks = 1;
            const graceUntil = Date.now() + 4_000;
            while (Date.now() < graceUntil) {
                if (await openWorkspace.isVisible().catch(() => false)) break;
                if (await instantChrome.isVisible().catch(() => false)) break;
                if (await workspaceExit.isVisible().catch(() => false)) break;
                await page.waitForTimeout(250);
            }
            continue;
        }
        if (hubClicks === 1) {
            await clickHubTile();
            hubClicks = 2;
        }
        await page.waitForTimeout(250);
    }
    marks.hubToArchiveMs = Date.now() - hubStart;
    await openWorkspace.waitFor({ state: 'visible', timeout: 20_000 });
    await instantChrome.waitFor({ state: 'hidden', timeout: 25_000 }).catch(() => undefined);

    const civilTab = openWorkspace.getByTestId('lawsuits-tab-civil').locator('visible=true');
    await civilTab.first().waitFor({ state: 'visible', timeout: 15_000 });
    if ((await civilTab.first().getAttribute('aria-selected')) !== 'true') {
        await civilTab.first().evaluate((el) => {
            if (el instanceof HTMLElement) el.click();
        });
    }

    const archiveStart = Date.now();
    await visibleFab.first().waitFor({ state: 'visible', timeout: 25_000 });
    await archiveSurface.first().waitFor({ state: 'visible', timeout: 25_000 });
    marks.archiveShellMs = Date.now() - archiveStart;

    const dossierStart = Date.now();
    const fileCard = openWorkspace.locator(`[data-testid="lawsuit-file-${E2E_CIVIL_FILE_ID}"]`);
    await fileCard.first().waitFor({ state: 'visible', timeout: 20_000 });
    const dossierDeadline = Date.now() + 45_000;
    while (Date.now() < dossierDeadline) {
        if (await page.getByTestId('smart-file-dossier').isVisible().catch(() => false)) break;
        await fileCard
            .first()
            .click({ force: true, timeout: 3_000 })
            .catch(() => undefined);
        await page.waitForTimeout(80);
    }
    await page.getByTestId('smart-file-dossier').waitFor({ state: 'visible', timeout: 15_000 });
    marks.dossierOpenMs = Date.now() - dossierStart;
    marks.totalMs = Date.now() - t0;

    await restoreThrottle();
    await browser.close();

    return { marks, deviceProfile: meta.name, throttle };
}

async function main() {
    let baseUrl = urlArg ?? (usePreview ? `http://127.0.0.1:${PREVIEW_PORT}` : 'http://localhost:8080');
    let previewProc = null;

    if (!urlArg && usePreview) {
        if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
            console.error('dist missing — run: npm run build:e2e');
            process.exit(1);
        }
        previewProc = spawnCmd('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort']);
    }

    await waitForServer(baseUrl);

    const sampleCount = Math.max(1, Math.min(5, Number.isFinite(samplesArg) ? samplesArg : 1));
    const runs = [];
    for (let i = 0; i < sampleCount; i += 1) {
        if (i > 0) await new Promise((r) => setTimeout(r, 800));
        runs.push(await measureOnce(baseUrl, deviceArg, throttleArg));
    }

    const markKeys = ['navigationMs', 'hubToArchiveMs', 'archiveShellMs', 'dossierOpenMs', 'totalMs'];
    const marks = {};
    for (const key of markKeys) {
        const med = median(runs.map((r) => r.marks[key]));
        if (med != null) marks[key] = med;
    }

    const report = {
        label: 'lawsuits-dossier-ttfi',
        device: deviceArg,
        deviceProfile: runs[0]?.deviceProfile,
        throttle: throttleArg,
        samples: sampleCount,
        url: baseUrl,
        measuredAt: new Date().toISOString(),
        marks,
        runs: runs.map((r) => r.marks),
    };

    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'lawsuits-dossier-ttfi.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    console.log(JSON.stringify(report, null, 2));
    console.log(`\nwritten: ${outPath}`);

    if (previewProc) previewProc.kill();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
