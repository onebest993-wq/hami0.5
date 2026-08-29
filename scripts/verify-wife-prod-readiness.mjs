#!/usr/bin/env node
/**
 * تقرير جاهزية إنتاج WIFE — env blockers + gate dev pass.
 * Usage: node scripts/verify-wife-prod-readiness.mjs [--json]
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadEnvFile(rel, override = false) {
  const full = path.join(ROOT, rel);
  if (!existsSync(full)) return;
  const text = readFileSync(full, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (override || !(key in process.env) || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

loadEnvFile('.env');
loadEnvFile('.env.production', true);
loadEnvFile('.env.local', true);
loadEnvFile('.env.production.local', true);

const jsonOnly = process.argv.includes('--json');

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

const REQUIRED_PROD = [
  { key: 'WIFE_REDIS_REST_URL', why: 'distributed nonce / CSRF / rate-limit' },
  { key: 'WIFE_REDIS_REST_TOKEN', why: 'Redis auth' },
  { key: 'WIFE_DISABLE_EDGE_KV_PROXY', expect: 'true', why: 'no Edge kv bypass' },
  { key: 'ADMIN_ACCESS_KEY', minLen: 16, why: 'Edge admin diagnostics' },
  { key: 'VITE_BFF_AUTH', expect: 'true', why: 'HttpOnly session cookies' },
  { key: 'VITE_SHELL_AUTH_OPEN', forbid: 'true', why: 'no guest shell in prod' },
  { key: 'SUPABASE_URL', why: 'auth + BFF' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', minLen: 20, why: 'server BFF' },
];

function checkItem(item) {
  const raw = env(item.key);
  if (!raw) return { key: item.key, ok: false, detail: 'missing', why: item.why };
  if (item.expect && raw.toLowerCase() !== item.expect.toLowerCase()) {
    return { key: item.key, ok: false, detail: `want ${item.expect}, got ${raw}`, why: item.why };
  }
  if (item.forbid && raw.toLowerCase() === item.forbid.toLowerCase()) {
    return { key: item.key, ok: false, detail: `must not be ${item.forbid}`, why: item.why };
  }
  if (item.minLen && raw.length < item.minLen) {
    return { key: item.key, ok: false, detail: `too short (${raw.length})`, why: item.why };
  }
  return { key: item.key, ok: true, detail: 'set', why: item.why };
}

const envChecks = REQUIRED_PROD.map(checkItem);
const envMissing = envChecks.filter((c) => !c.ok);

const gateDev = spawnSync('node', ['scripts/load-env-and-gate.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const gateProd = spawnSync('node', ['scripts/load-env-and-gate.mjs', '--prod'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const optionalStaging = {
  WIFE_GOTRUE_STAGING_EMAIL: Boolean(env('WIFE_GOTRUE_STAGING_EMAIL')),
  WIFE_GOTRUE_STAGING_PASSWORD: Boolean(env('WIFE_GOTRUE_STAGING_PASSWORD')),
  ready: Boolean(env('WIFE_GOTRUE_STAGING_EMAIL') && env('WIFE_GOTRUE_STAGING_PASSWORD')),
};

const report = {
  stamp: new Date().toISOString(),
  codeGateDev: { ok: gateDev.status === 0, status: gateDev.status ?? 1 },
  codeGateProd: { ok: gateProd.status === 0, status: gateProd.status ?? 1 },
  envChecks,
  envMissingCount: envMissing.length,
  optionalGoTrueStaging: optionalStaging,
  deployReady: gateDev.status === 0 && envMissing.length === 0,
  note:
    envMissing.length > 0
      ? 'Code OK — set missing env in hosting before production claims'
      : 'Env + dev gate look ready; run gate --prod --live on staging host',
};

const outPath = path.join(ROOT, '.audit', 'WIFE_PROD_READINESS_LATEST.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

if (!jsonOnly) {
  console.log('\n── WIFE Production Readiness ──');
  console.log(`${report.codeGateDev.ok ? '✓' : '✗'} gate:dev (${report.codeGateDev.status})`);
  console.log(`${report.codeGateProd.ok ? '✓' : 'ℹ'} gate:prod (${report.codeGateProd.status})`);
  console.log(`Env: ${envChecks.filter((c) => c.ok).length}/${envChecks.length} required keys`);
  for (const m of envMissing) {
    console.log(`  ✗ ${m.key} — ${m.detail} (${m.why})`);
  }
  console.log(
    `GoTrue staging E2E: ${optionalStaging.ready ? 'ready' : 'skip (set WIFE_GOTRUE_STAGING_*)'}`,
  );
  console.log(`Deploy ready: ${report.deployReady ? 'YES' : 'NO (env)'}`);
  console.log(`Report: ${outPath}`);
}

process.exit(report.codeGateDev.ok ? 0 : 1);
