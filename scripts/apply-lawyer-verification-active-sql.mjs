#!/usr/bin/env node
/**
 * ترحيل lawyer-verification عبر supabase db query --linked
 * (يتجنب فشل sb_secret مع PostgREST/JS على بعض المشاريع)
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sqlFile = join(
  ROOT,
  'supabase',
  'migrations',
  'ops',
  '20260812000002_seed_lawyer_verification_active.sql',
);

if (!existsSync(sqlFile)) {
  console.error('Missing', sqlFile);
  process.exit(1);
}

function runFile(abs) {
  return spawnSync(
    'npx',
    ['supabase', 'db', 'query', '--yes', '--linked', `--file=${abs}`],
    { stdio: 'inherit', shell: true, cwd: ROOT, env: process.env },
  );
}

const dir = mkdtempSync(join(tmpdir(), 'hami-kv-'));
const dest = join(dir, 'seed_lawyer_verification_active.sql');
try {
  copyFileSync(sqlFile, dest);
  console.log('Applying KV verification seed via linked DB...');
  const r = runFile(dest);
  if (r.status !== 0) process.exit(r.status ?? 1);
} finally {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

const verifySql = `SELECT
  count(*) FILTER (WHERE key LIKE 'lawyer-verification:%') AS verification_keys,
  count(*) FILTER (WHERE key LIKE 'lawyer-verification:%' AND value->>'status'='active') AS verification_active
FROM public.kv_store_f09713ba;`;
const vdir = mkdtempSync(join(tmpdir(), 'hami-kv-v-'));
const vfile = join(vdir, 'verify.sql');
try {
  writeFileSync(vfile, verifySql, 'utf8');
  console.log('\n── Verify ──');
  const r = runFile(vfile);
  if (r.status !== 0) process.exit(r.status ?? 1);
} finally {
  try {
    rmSync(vdir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

console.log('\nOK — verification_active should be > 0 (unless no eligible profiles).');
