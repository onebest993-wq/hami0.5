#!/usr/bin/env node
/**
 * فحص إصدار الإشعارات — preview مُدار + E2E على دفعات (يتجنّب تعارض 8090 على Windows).
 *
 * Usage:
 *   node scripts/release-check-notifications.mjs
 *   node scripts/release-check-notifications.mjs --full
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGlobalSearchE2eProjects } from './e2e-platform-projects.mjs';
import {
    freePreviewPort,
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
} from './e2e-preview-manager.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAMP_PATH = path.join(ROOT, '.audit', 'e2e-dist-stamp.json');
const full = process.argv.includes('--full');

function readE2eStamp() {
    try {
        return JSON.parse(fs.readFileSync(STAMP_PATH, 'utf8'));
    } catch {
        return null;
    }
}

function runBuildE2e() {
    console.log('\n[release-check-notifications] npm run build:e2e...\n');
    const result = spawnSync('npm', ['run', 'build:e2e'], {
        stdio: 'inherit',
        shell: true,
        cwd: ROOT,
    });
    if ((result.status ?? 1) === 0) return;

    const stamp = readE2eStamp();
    const distReady = fs.existsSync(path.join(ROOT, 'dist', 'index.html'));
    if (distReady && stamp?.viteE2e) {
        console.warn(
            '[release-check-notifications] build:e2e failed — reusing existing VITE_E2E dist (retry build for a clean dist)',
        );
        return;
    }
    process.exit(result.status ?? 1);
}

function runNpm(script) {
    console.log(`\n[release-check-notifications] npm run ${script}...\n`);
    const result = spawnSync('npm', ['run', script], {
        stdio: 'inherit',
        shell: true,
        cwd: ROOT,
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

function runPlaywright(label, specs, projectFlags) {
    console.log(`\n=== ${label} ===\n`);
    const result = spawnSync(
        'npx',
        ['playwright', 'test', ...specs, '--workers=1', ...projectFlags],
        {
            stdio: 'inherit',
            shell: true,
            cwd: ROOT,
            env: {
                ...process.env,
                E2E_USE_PREVIEW: '1',
                E2E_SKIP_WEBSERVER: '1',
                PW_WORKERS: '1',
            },
        },
    );
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

async function ensurePreviewAlive() {
    freePreviewPort();
    return startPreviewServer({ force: true, keepAttached: true });
}

runNpm('gate:notifications');
runBuildE2e();

freePreviewPort();
let preview = await startPreviewServer({ force: true, keepAttached: true });

try {
    await verifyPreviewE2eReady();

    runPlaywright(
        'Notifications release — boot smoke (chromium)',
        ['e2e/app-boot-smoke.spec.ts'],
        ['--project=chromium'],
    );

    const projectFlags = full
        ? await resolveGlobalSearchE2eProjects({ allPlatforms: true })
        : ['--project=chromium', '--project=mobile-chrome'];

    for (const projectFlag of projectFlags) {
        preview = await ensurePreviewAlive();
        const projectName = projectFlag.replace('--project=', '');
        runPlaywright(
            `Notifications release E2E (${projectName})`,
            ['e2e/notifications-panel.spec.ts'],
            [projectFlag],
        );
    }

    console.log('\n✓ release-check-notifications passed\n');
} finally {
    await stopPreviewServer(preview);
}
