#!/usr/bin/env node
/**
 * E2E التنفيذ — يقرأ المواصفات من execution-gate-manifest (مصدر واحد مع gate:execution)
 */
import { spawnSync } from 'node:child_process';
import { EXECUTION_GATE_E2E_SPECS } from './execution-gate-manifest.mjs';

function run(cmd, args, opts = {}) {
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...opts,
    });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

run('npm', ['run', 'build:e2e']);

run(
    'npx',
    [
        'playwright',
        'test',
        ...EXECUTION_GATE_E2E_SPECS,
        '--project=chromium',
        '--workers=1',
        '--retries=1',
    ],
    { env: { ...process.env, PW_WORKERS: '1' } },
);
