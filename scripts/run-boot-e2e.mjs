#!/usr/bin/env node
/**
 * Boot E2E — يستخدم preview بعد build:e2e افتراضياً (E2E_USE_PREVIEW=1).
 * للتطوير على dev: E2E_USE_PREVIEW=0 npm run test:e2e:boot
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distReady = existsSync(path.join(ROOT, 'dist/index.html'));
const STAMP = path.join(ROOT, '.audit', 'e2e-dist-stamp.json');

function distNeedsE2eBuild() {
    if (!distReady) return true;
    if (process.env.E2E_FORCE_REBUILD === '1') return true;
    if (!existsSync(STAMP)) return true;
    try {
        const stamp = JSON.parse(readFileSync(STAMP, 'utf8'));
        if (stamp.shellAuthOpen !== true || stamp.viteE2e !== true) return true;
    } catch {
        return true;
    }
    return false;
}

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
const args = ['playwright', 'test', 'e2e/app-boot-smoke.spec.ts', '--workers=1', ...projectFlag, ...extra];
const result = spawnSync('npx', args, { stdio: 'inherit', shell: true, env, cwd: ROOT });
process.exit(result.status ?? 1);
