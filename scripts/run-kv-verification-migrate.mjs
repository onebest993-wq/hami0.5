#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
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
    if (!(key in process.env) || process.env[key] === '') process.env[key] = val;
  }
}

for (const f of ['.env', '.env.local', '.env.production.local']) loadEnvFile(f);

const hasUrl = Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim());
const svc = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
console.log(`URL=${hasUrl ? 'yes' : 'no'} SERVICE=${svc ? svc.slice(0, 10) + '…' : 'no'}`);

if (!hasUrl || !svc) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function run(args) {
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('\n── dry-run ──');
run([path.join(ROOT, 'scripts/migrate-lawyer-verification-active.mjs')]);
console.log('\n── apply ──');
run([path.join(ROOT, 'scripts/migrate-lawyer-verification-active.mjs'), '--apply']);
console.log('\nDone.');
