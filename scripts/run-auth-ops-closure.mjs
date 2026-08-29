#!/usr/bin/env node
/**
 * يشغّل إغلاق auth التشغيلي محلياً بعد تحميل .env*
 *   node scripts/run-auth-ops-closure.mjs
 *   node scripts/run-auth-ops-closure.mjs --skip-apply-kv
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipApplyKv = process.argv.includes('--skip-apply-kv');

function loadEnvFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

for (const f of ['.env', '.env.local', '.env.production.local', '.env.production']) {
  loadEnvFile(f);
}

function run(label, cmd, cmdArgs) {
  console.log(`\n══ ${label} ══`);
  const r = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`FAILED: ${label} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

const hasUrl = Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim());
const hasService = Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim());
console.log(`Env loaded: SUPABASE_URL=${hasUrl ? 'yes' : 'NO'} SERVICE_ROLE=${hasService ? 'yes' : 'NO'}`);

run('db:auth-ban-freeze', 'npm', ['run', 'db:auth-ban-freeze']);
run('db:auth-ban-freeze:verify', 'npm', ['run', 'db:auth-ban-freeze:verify']);

if (!hasUrl || !hasService) {
  console.error('\nSkip KV migrate — missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env files.');
  process.exit(1);
}

run('lawyer-verification dry-run', 'npm', ['run', 'db:lawyer-verification-active']);
if (!skipApplyKv) {
  run('lawyer-verification --apply', 'npm', [
    'run',
    'db:lawyer-verification-active',
    '--',
    '--apply',
  ]);
}

console.log('\nAuth ops closure commands finished.');
