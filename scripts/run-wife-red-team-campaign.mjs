#!/usr/bin/env node
/**
 * حملة Red Team كاملة — Vitest + Playwright + Gate
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const stamp = new Date().toISOString();

function run(label, cmd, args, env = {}) {
  const started = Date.now();
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const ms = Date.now() - started;
  const ok = res.status === 0;
  return {
    label,
    ok,
    ms,
    status: res.status ?? 1,
    stdout: (res.stdout ?? '').slice(-4000),
    stderr: (res.stderr ?? '').slice(-2000),
  };
}

const results = [];

results.push(run('generate:catalog', 'node', ['scripts/generate-wife-route-catalog.mjs']));
results.push(
  run('vitest:catalog-integrity', 'npx', [
    'vitest',
    'run',
    'src/app/security/__tests__/wifeRouteCatalogIntegrity.test.ts',
  ]),
);
results.push(run('redis:live-probe', 'node', ['scripts/probe-wife-redis-live.mjs']));

results.push(run('vitest:security', 'npm', ['run', 'test:security']));
results.push(run('vitest:auth-assault', 'npm', ['run', 'test:security:auth-assault']));
results.push(run('vitest:destruction', 'npm', ['run', 'test:security:destruction']));

const e2eEnv = {
  E2E_USE_PREVIEW: '0',
  E2E_SKIP_WEBSERVER: '1',
  PW_RETRIES: '0',
};

results.push(
  run('e2e:professional', 'npx', [
    'playwright',
    'test',
    'e2e/wife-assault-professional.spec.ts',
    '--project=chromium',
    '--workers=1',
  ], e2eEnv),
);
results.push(
  run('e2e:uuid-session', 'npx', [
    'playwright',
    'test',
    'e2e/wife-assault-uuid-session.spec.ts',
    '--project=chromium',
    '--workers=1',
  ], e2eEnv),
);
results.push(
  run('e2e:three-waves+maximum', 'npx', [
    'playwright',
    'test',
    'e2e/wife-assault-three-waves.spec.ts',
    'e2e/wife-assault-maximum.spec.ts',
    '--project=chromium',
    '--workers=1',
  ], e2eEnv),
);
results.push(
  run('e2e:live-server', 'npx', [
    'playwright',
    'test',
    'e2e/wife-live-server.spec.ts',
    '--project=chromium',
    '--workers=1',
  ], e2eEnv),
);
results.push(
  run('e2e:ultimate', 'npx', [
    'playwright',
    'test',
    'e2e/wife-assault-ultimate.spec.ts',
    '--project=chromium',
    '--workers=1',
  ], e2eEnv),
);
results.push(
  run('e2e:destructive-guard', 'npx', [
    'playwright',
    'test',
    'e2e/wife-assault-destructive-guard.spec.ts',
    '--project=chromium',
    '--workers=1',
  ], e2eEnv),
);
results.push(
  run('e2e:gotrue-staging', 'npx', [
    'playwright',
    'test',
    'e2e/wife-gotrue-staging.spec.ts',
    '--project=chromium',
    '--workers=1',
  ], e2eEnv),
);

results.push(run('gate', 'node', ['scripts/load-env-and-gate.mjs']));

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);

const report = {
  stamp,
  passed,
  total: results.length,
  closure: '.audit/PHASE_WIFE_SECTION_CLOSURE_FINAL.md',
  failed: failed.map((f) => ({ label: f.label, status: f.status })),
  results: results.map(({ label, ok, ms, status }) => ({ label, ok, ms, status })),
};

const outPath = path.join(ROOT, '.audit', 'WIFE_RED_TEAM_CAMPAIGN_LATEST.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log('\n── WIFE Red Team Campaign ──');
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.label} (${r.ms}ms)`);
}
console.log(`\nSummary: ${passed}/${results.length} stages OK`);
console.log(`Report: ${outPath}`);

if (failed.length) {
  for (const f of failed) {
    console.error(`\nFAILED: ${f.label}\n${f.stderr || f.stdout}`);
  }
  process.exit(1);
}
