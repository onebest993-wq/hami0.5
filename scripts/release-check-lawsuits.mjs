#!/usr/bin/env node
/** محور release:lawsuits — وحدة + E2E دفعتين + cloud + boot */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runStep(name, cmd, args, extraEnv = {}) {
    console.log(`\n=== ${name} ===\n`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: true,
        cwd: ROOT,
        env: { ...process.env, ...extraEnv },
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

runStep('gate:lawsuits (unit)', 'npm', ['run', 'gate:lawsuits']);
runStep('desktop E2E (batched)', 'node', ['scripts/run-lawsuits-ci-e2e.mjs'], {
    E2E_USE_PREVIEW: '0',
    LAWSUITS_E2E_USE_PREVIEW: '0',
    E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '1',
    PW_WORKERS: '1',
});
runStep('cloud-sync E2E', 'npm', ['run', 'test:e2e:civil-lawsuits:cloud'], {
    E2E_USE_PREVIEW: '0',
    E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '1',
    PW_WORKERS: '1',
});
runStep('boot E2E', 'npm', ['run', 'test:e2e:boot', '--', '--project=chromium'], {
    E2E_SKIP_BUILD: '1',
    LAWSUITS_E2E_SKIP_BUILD: '1',
    E2E_USE_PREVIEW: '0',
    E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '1',
});

console.log('\n✓ release:check:lawsuits passed\n');
