#!/usr/bin/env node
/**
 * محور worldclass كامل لقسم الدعاوى.
 *
 *   npm run release:check:lawsuits:worldclass
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAMP_PATH = path.join(ROOT, '.audit', 'lawsuits-worldclass-verified.json');

function runStep(name, cmd, args, extraEnv = {}) {
    console.log(`\n=== ${name} ===\n`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: true,
        cwd: ROOT,
        env: { ...process.env, ...extraEnv },
    });
    if ((result.status ?? 1) !== 0) {
        console.error(`\n✗ ${name} failed (exit ${result.status ?? 1})\n`);
        process.exit(result.status ?? 1);
    }
    console.log(`\n✓ ${name}\n`);
    return { axis: name, status: 'passed' };
}

const startedAt = new Date().toISOString();
const axes = [];

const viteAxis = {
    LAWSUITS_E2E_SKIP_BUILD: '1',
    E2E_SKIP_BUILD: '1',
    E2E_USE_PREVIEW: '0',
    LAWSUITS_E2E_USE_PREVIEW: '0',
    E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '1',
    PW_WORKERS: '1',
};

axes.push(
    runStep('release:lawsuits (unit+desktop+cloud+boot)', 'node', [
        'scripts/release-check-lawsuits.mjs',
    ], viteAxis),
);

axes.push(runStep('mobile E2E', 'node', ['scripts/run-civil-lawsuits-mobile-e2e.mjs'], viteAxis));
axes.push(runStep('perf gate (TTFI)', 'npm', ['run', 'gate:lawsuits:perf'], viteAxis));

const liveReady =
    process.env.E2E_LAWSUIT_CLOUD_LIVE === '1'
    && Boolean(process.env.VITE_SUPABASE_URL)
    && Boolean(process.env.VITE_SUPABASE_ANON_KEY);

if (liveReady) {
    axes.push(runStep('cloud live E2E (staging)', 'npm', ['run', 'test:e2e:civil-lawsuits:cloud:live']));
} else {
    console.log('\n⚠ cloud live E2E skipped — set E2E_LAWSUIT_CLOUD_LIVE=1 + VITE_SUPABASE_* for production-worldclass\n');
    axes.push({ axis: 'cloud live E2E (staging)', status: 'skipped', reason: 'missing staging credentials' });
}

const stamp = {
    verifiedAt: new Date().toISOString(),
    startedAt,
    command: 'release:check:lawsuits:worldclass',
    axes,
    engineeringWorldclass: true,
    productionWorldclass: liveReady,
    manualSoakRequired: !liveReady,
};

mkdirSync(path.dirname(STAMP_PATH), { recursive: true });
writeFileSync(STAMP_PATH, `${JSON.stringify(stamp, null, 2)}\n`);

console.log('\n========================================');
console.log('PASSED — lawsuits worldclass engineering axis');
if (liveReady) {
    console.log('+ staging cloud live verified');
} else {
    console.log('(production axis: staging cloud + device soak still manual)');
}
console.log(`stamp: ${STAMP_PATH}`);
console.log('========================================\n');
