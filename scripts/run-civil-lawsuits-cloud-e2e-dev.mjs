#!/usr/bin/env node
/** Civil lawsuit cloud-sync E2E — dev server فقط (dynamic import لـ cloudSyncEngine) */
import { spawnSync } from 'node:child_process';

const env = {
    ...process.env,
    E2E_USE_PREVIEW: '0',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
};

const extra = process.argv.slice(2);
const result = spawnSync(
    'npx',
    [
        'playwright',
        'test',
        'e2e/civil-lawsuit-cloud-sync.spec.ts',
        '--project=chromium',
        '--workers=1',
        ...extra,
    ],
    { stdio: 'inherit', shell: true, env },
);
process.exit(result.status ?? 1);
