#!/usr/bin/env node
/** E2E دعاوى — mobile-chrome. افتراضي Vite :8080؛ LAWSUITS_E2E_USE_PREVIEW=1 لـ preview. */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
} from './e2e-preview-manager.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SPECS = [
    'e2e/civil-lawsuit-smoke.spec.ts',
    'e2e/civil-lawsuit-new-case.spec.ts',
    'e2e/criminal-dossier-open.spec.ts',
];

const buildEnv = {
    ...process.env,
    VITE_SHELL_AUTH_OPEN: 'true',
    VITE_BFF_AUTH: 'true',
};

const usePreview = process.env.LAWSUITS_E2E_USE_PREVIEW === '1';

function runMobile(env) {
    const result = spawnSync(
        'npx',
        [
            'playwright',
            'test',
            ...SPECS,
            '--project=mobile-chrome',
            '--workers=1',
            '--retries=1',
            '--trace=off',
            ...process.argv.slice(2),
        ],
        {
            stdio: 'inherit',
            shell: true,
            cwd: ROOT,
            env,
        },
    );
    return result.status ?? 1;
}

if (!usePreview) {
    console.log('[lawsuits-mobile-e2e] Vite :8080 (set LAWSUITS_E2E_USE_PREVIEW=1 for preview)');
    const code = runMobile({
        ...process.env,
        E2E_USE_PREVIEW: '0',
        E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '0',
        PW_WORKERS: '1',
    });
    process.exit(code);
}

if (process.env.LAWSUITS_E2E_SKIP_BUILD !== '1' || !existsSync(path.join(ROOT, 'dist/index.html'))) {
    const build = spawnSync('npm', ['run', 'build:e2e'], {
        stdio: 'inherit',
        shell: true,
        cwd: ROOT,
        env: buildEnv,
    });
    if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);
}

const preview = await startPreviewServer({ force: true, keepAttached: true });
let code = 1;
try {
    await verifyPreviewE2eReady();
    code = runMobile({
        ...process.env,
        E2E_USE_PREVIEW: '1',
        E2E_SKIP_WEBSERVER: '1',
        PW_WORKERS: '1',
    });
} finally {
    await stopPreviewServer(preview);
}
process.exit(code);
