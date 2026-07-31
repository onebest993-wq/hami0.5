#!/usr/bin/env node
/**
 * Civil lawsuits E2E على dev server (E2E_USE_PREVIEW=0).
 * Usage: npm run test:e2e:civil-lawsuits:dev [-- extra playwright args]
 */
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
        'e2e/civil-lawsuit-new-case.spec.ts',
        '--project=chromium',
        '--workers=1',
        ...extra,
    ],
    { stdio: 'inherit', shell: true, env },
);
process.exit(result.status ?? 1);
