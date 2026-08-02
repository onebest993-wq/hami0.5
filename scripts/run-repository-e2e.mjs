#!/usr/bin/env node
/**
 * E2E المستودع — preview بعد build:e2e (shell auth + Supabase من info.ts).
 * Usage: npm run test:e2e:repository
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { distNeedsE2eBuild } from './e2e-dist-stamp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (distNeedsE2eBuild() && process.env.E2E_SKIP_BUILD !== '1') {
    console.log('E2E dist missing or stale — running npm run build:e2e …\n');
    const build = spawnSync('npm', ['run', 'build:e2e'], { stdio: 'inherit', shell: true, cwd: ROOT });
    if (build.status !== 0) process.exit(build.status ?? 1);
}

const env = {
    ...process.env,
    E2E_USE_PREVIEW: process.env.E2E_USE_PREVIEW ?? '1',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
};

const extra = process.argv.slice(2);
const projectFlag = extra.some((a) => a.startsWith('--project')) ? [] : ['--project=chromium'];
const args = [
    'playwright',
    'test',
    'e2e/smart-repository.spec.ts',
    'e2e/smart-vault.spec.ts',
    'e2e/voice-recorder.spec.ts',
    '--workers=1',
    ...projectFlag,
    ...extra,
];
const result = spawnSync('npx', args, { stdio: 'inherit', shell: true, env, cwd: ROOT });
process.exit(result.status ?? 1);
