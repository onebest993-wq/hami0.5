#!/usr/bin/env node
/**
 * Boot E2E — يستخدم preview بعد build افتراضياً (E2E_USE_PREVIEW=1).
 * للتطوير على dev: E2E_USE_PREVIEW=0 npm run test:e2e:boot
 */
import { spawnSync } from 'node:child_process';

const env = {
    ...process.env,
    E2E_USE_PREVIEW: process.env.E2E_USE_PREVIEW ?? '1',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
};

const extra = process.argv.slice(2);
const projectFlag = extra.some((a) => a.startsWith('--project')) ? [] : ['--project=chromium'];
const args = ['playwright', 'test', 'e2e/app-boot-smoke.spec.ts', '--workers=1', ...projectFlag, ...extra];
const result = spawnSync('npx', args, { stdio: 'inherit', shell: true, env });
process.exit(result.status ?? 1);
