#!/usr/bin/env node
/**
 * بناء dist لبوابات E2E — VITE_E2E + shell auth + Supabase من info.ts.
 * Usage: npm run build:e2e
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { e2eViteBuildEnv } from './e2e-build-env.mjs';
import { writeE2eDistStamp } from './e2e-dist-stamp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnSync('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...e2eViteBuildEnv() },
});

if (result.status === 0) {
    const env = e2eViteBuildEnv();
    writeE2eDistStamp({
        viteE2e: env.VITE_E2E === '1',
        shellAuthOpen: env.VITE_SHELL_AUTH_OPEN === 'true',
    });
}

process.exit(result.status ?? 1);
