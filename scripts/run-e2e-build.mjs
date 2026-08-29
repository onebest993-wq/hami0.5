#!/usr/bin/env node
/**
 * بناء dist لبوابات E2E — VITE_E2E + shell auth + Supabase من info.ts.
 * Usage: npm run build:e2e
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { e2eViteBuildEnv, hamiBootScriptFingerprint } from './e2e-build-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAMP_PATH = path.join(ROOT, '.audit', 'e2e-dist-stamp.json');

const result = spawnSync('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...e2eViteBuildEnv() },
});

if (result.status === 0) {
    const env = e2eViteBuildEnv();
    const distIndex = path.join(ROOT, 'dist', 'index.html');
    const distHtml = fs.readFileSync(distIndex, 'utf8');
    if (!distHtml.includes('data-hami-boot-guard-ms=')) {
        console.error('[build:e2e] BLOCKED — dist/index.html missing data-hami-boot-guard-ms');
        process.exit(1);
    }
    if (env.VITE_SHELL_AUTH_OPEN === 'true' && !distHtml.includes('data-hami-demo-boot="1"')) {
        console.error('[build:e2e] BLOCKED — dist/index.html missing data-hami-demo-boot');
        process.exit(1);
    }
    fs.mkdirSync(path.dirname(STAMP_PATH), { recursive: true });
    fs.writeFileSync(
        STAMP_PATH,
        JSON.stringify({
            builtAt: new Date().toISOString(),
            viteE2e: env.VITE_E2E === '1',
            shellAuthOpen: env.VITE_SHELL_AUTH_OPEN === 'true',
            hamiBootScript: hamiBootScriptFingerprint(),
        }),
        'utf8',
    );
}

process.exit(result.status ?? 1);
