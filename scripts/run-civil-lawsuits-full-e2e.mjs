#!/usr/bin/env node
/**
 * كل E2E الدعاوى المدنية على preview واحد (ما عدا cloud-sync الذي يحتاج dev).
 */
import { spawnSync } from 'node:child_process';
import {
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
} from './e2e-preview-manager.mjs';

const SPECS = [
    'e2e/civil-lawsuit-smoke.spec.ts',
    'e2e/civil-lawsuit-procedural.spec.ts',
    'e2e/civil-lawsuit-new-case.spec.ts',
    'e2e/civil-lawsuit-scenarios.spec.ts',
];

function run(cmd, args, opts = {}) {
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...opts,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npm', ['run', 'build:e2e']);

const previewEnv = {
    ...process.env,
    E2E_SKIP_WEBSERVER: '1',
    E2E_USE_PREVIEW: '1',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
};

let previewStarted = null;
try {
    previewStarted = await startPreviewServer({ force: true, keepAttached: true });
    await verifyPreviewE2eReady();

    run(
        'npx',
        [
            'playwright',
            'test',
            ...SPECS,
            '--project=chromium',
            '--workers=1',
            '--retries=1',
            '--trace=off',
            ...process.argv.slice(2),
        ],
        { env: previewEnv },
    );
} finally {
    await stopPreviewServer(previewStarted);
}
