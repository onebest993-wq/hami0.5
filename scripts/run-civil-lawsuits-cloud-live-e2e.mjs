#!/usr/bin/env node
/** Staging cloud E2E — يتطلب E2E_LAWSUIT_CLOUD_LIVE=1 و VITE_SUPABASE_* */
import { spawnSync } from 'node:child_process';

const env = {
    ...process.env,
    E2E_USE_PREVIEW: '0',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
};

const result = spawnSync(
    'npx',
    [
        'playwright',
        'test',
        'e2e/civil-lawsuit-cloud-live.spec.ts',
        '--project=chromium',
        '--workers=1',
        ...process.argv.slice(2),
    ],
    { stdio: 'inherit', shell: true, env },
);
process.exit(result.status ?? 1);
