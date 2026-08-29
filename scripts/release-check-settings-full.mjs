#!/usr/bin/env node
/**
 * فحص إصدار الإعدادات الشامل — preview مُدار + E2E على دفعات (يتجنّب تعارض 8090 على Windows).
 */
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    E2E_PREVIEW_PORT,
    freePreviewPort,
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
} from './e2e-preview-manager.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = `http://127.0.0.1:${E2E_PREVIEW_PORT}`;

function probePreview() {
    return new Promise((resolve) => {
        const req = http.get(BASE_URL, (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2_500, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function ensurePreviewReady() {
    try {
        if (await probePreview()) {
            await verifyPreviewE2eReady();
            return;
        }
    } catch {
        freePreviewPort();
    }
    freePreviewPort();
    await startPreviewServer({ force: true, keepAttached: true });
}

function runPlaywright(label, specs, project) {
    console.log(`\n=== ${label} ===\n`);
    const result = spawnSync(
        'npx',
        ['playwright', 'test', ...specs, `--project=${project}`, '--workers=1'],
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

function runNpm(script) {
    const result = spawnSync('npm', ['run', script], {
        stdio: 'inherit',
        shell: true,
        cwd: ROOT,
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

freePreviewPort();
let preview = await startPreviewServer({ force: true, keepAttached: true });

try {
    await ensurePreviewReady();
    runPlaywright('Settings release E2E — boot smoke (chromium)', ['e2e/app-boot-smoke.spec.ts'], 'chromium');

    await ensurePreviewReady();
    runPlaywright('Settings release E2E — settings shell (chromium)', ['e2e/settings-shell.spec.ts'], 'chromium');

    console.log('\n=== Native verify (Android + iOS templates) ===\n');
    runNpm('verify:native');

    await ensurePreviewReady();
    runPlaywright(
        'Settings release E2E — phone web (mobile-chrome / Pixel 7)',
        ['e2e/settings-mobile.spec.ts', 'e2e/settings-shell.spec.ts'],
        'mobile-chrome',
    );

    await ensurePreviewReady();
    runPlaywright(
        'Settings release E2E — tablet (tablet-chrome / iPad Mini)',
        ['e2e/settings-mobile.spec.ts'],
        'tablet-chrome',
    );

    await ensurePreviewReady();
    runPlaywright(
        'Settings release E2E — phone Safari (mobile-safari / iPhone 14)',
        ['e2e/settings-mobile.spec.ts', 'e2e/settings-shell.spec.ts'],
        'mobile-safari',
    );

    console.log('\n✓ release-check-settings-full E2E phases passed\n');
} finally {
    await stopPreviewServer(preview);
}
