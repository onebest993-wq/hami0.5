#!/usr/bin/env node
/**
 * فحص احترافي موحّد — catalog + campaign + gate + تقرير prod env (informational)
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
  const out = ((res.stdout ?? '') + (res.stderr ?? '')).slice(-4000);
  return {
    label,
    ok: res.status === 0,
    ms: Date.now() - started,
    status: res.status ?? 1,
    tail: out.slice(-1500),
  };
}

function extractProdEnvBlockers(tail) {
  const blockers = [];
  for (const line of tail.split('\n')) {
    const m = line.match(/^\s*•\s*(env:[^:]+):/);
    if (m) blockers.push(m[1]);
  }
  return blockers;
}

const stages = [];

stages.push(run('catalog:generate', 'node', ['scripts/generate-wife-route-catalog.mjs']));
stages.push(
  run('vitest:catalog-integrity', 'npx', [
    'vitest',
    'run',
    'src/app/security/__tests__/wifeRouteCatalogIntegrity.test.ts',
  ]),
);
stages.push(run('redis:live-probe', 'node', ['scripts/probe-wife-redis-live.mjs']));
stages.push(run('capacitor:prep', 'npm', ['run', 'test:security:capacitor-prep']));
stages.push(run('prod-readiness', 'node', ['scripts/verify-wife-prod-readiness.mjs']));
stages.push(run('audit-chain', 'node', ['scripts/verify-wife-audit-chain.mjs']));
stages.push(run('campaign', 'npm', ['run', 'test:security:campaign']));
stages.push(run('gate:dev', 'node', ['scripts/load-env-and-gate.mjs']));

const prodGateRaw = run('gate:prod-env-report', 'node', ['scripts/load-env-and-gate.mjs', '--prod']);
const prodEnvBlockers = extractProdEnvBlockers(prodGateRaw.tail);
stages.push({
  ...prodGateRaw,
  ok: true,
  informational: true,
  prodEnvBlockers,
  note:
    prodEnvBlockers.length > 0
      ? 'Expected on dev machine without .env.production — ops must fix before deploy'
      : 'No prod env blockers',
});

const passStages = stages.filter((s) => !s.informational);
const passed = passStages.filter((s) => s.ok).length;
const report = {
  stamp,
  passed,
  total: passStages.length,
  informational: stages.filter((s) => s.informational).map((s) => ({
    label: s.label,
    prodEnvBlockers: s.prodEnvBlockers,
    note: s.note,
  })),
  stages: stages.map(({ label, ok, ms, status, informational }) => ({
    label,
    ok,
    ms,
    status,
    informational: Boolean(informational),
  })),
  failed: passStages.filter((s) => !s.ok).map((s) => ({ label: s.label, tail: s.tail })),
};

const out = path.join(ROOT, '.audit', 'WIFE_PROFESSIONAL_AUDIT_LATEST.json');
writeFileSync(out, JSON.stringify(report, null, 2));

console.log('\n── WIFE Professional Audit ──');
for (const s of stages) {
  const tag = s.informational ? 'ℹ' : s.ok ? '✓' : '✗';
  console.log(`${tag} ${s.label} (${s.ms}ms)${s.informational ? ' [informational]' : ''}`);
}
console.log(`\nSummary: ${passed}/${passStages.length} (required)`);
if (prodEnvBlockers.length) {
  console.log(`Prod env blockers (ops): ${prodEnvBlockers.join(', ')}`);
}
console.log(`Report: ${out}`);

if (passed < passStages.length) process.exit(1);
