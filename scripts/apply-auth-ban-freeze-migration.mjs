#!/usr/bin/env node
/**
 * يطبّق bootstrap لـ public.profiles ثم هجرة تجميد الحظر.
 * ينسخ SQL إلى %TEMP% (بلا مسافات) لأن مسار المشروع فيه "New folder".
 *
 * Usage:
 *   npm run db:auth-ban-freeze
 *   npm run db:auth-ban-freeze -- --db-url "postgresql://..."
 *   npm run db:auth-ban-freeze -- --verify-only
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const dbUrlIdx = args.indexOf('--db-url');
const dbUrl = dbUrlIdx >= 0 ? args[dbUrlIdx + 1] : process.env.SUPABASE_DB_URL;
const verifyOnly = args.includes('--verify-only');

const migrations = [
  {
    file: join(
      ROOT,
      'supabase',
      'migrations',
      'ops',
      '20260812000000_bootstrap_profiles_for_ban_freeze.sql',
    ),
    label: 'bootstrap profiles',
    tempName: '01_bootstrap_profiles.sql',
  },
  {
    file: join(
      ROOT,
      'supabase',
      'migrations',
      '20260812000001_freeze_profile_ban_flags_and_verification_meta.sql',
    ),
    label: 'freeze ban flags',
    tempName: '02_freeze_ban_flags.sql',
  },
];

function runSupabaseDbQueryFile(absFileNoSpaces) {
  // PowerShell-friendly: shell + quoted --file= (path must not contain spaces)
  const flags = ['supabase', 'db', 'query', '--yes', `--file=${absFileNoSpaces}`];
  if (dbUrl) flags.push(`--db-url=${dbUrl}`);
  else flags.push('--linked');
  return spawnSync('npx', flags, {
    stdio: 'inherit',
    shell: true,
    cwd: ROOT,
    env: process.env,
  });
}

function runCopied(sourceAbs, tempName) {
  const dir = mkdtempSync(join(tmpdir(), 'hami-auth-'));
  const dest = join(dir, tempName);
  try {
    copyFileSync(sourceAbs, dest);
    return runSupabaseDbQueryFile(dest);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function verify() {
  console.log('\n── Verify ──');
  const sql = `SELECT
  to_regclass('public.profiles') IS NOT NULL AS profiles_exists,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_own_safe'
  ) AS freeze_policy_exists,
  (SELECT count(*)::int FROM public.profiles) AS profile_rows;
`;
  const dir = mkdtempSync(join(tmpdir(), 'hami-auth-v-'));
  const file = join(dir, 'verify.sql');
  try {
    writeFileSync(file, sql, 'utf8');
    return runSupabaseDbQueryFile(file);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

for (const m of migrations) {
  if (!existsSync(m.file)) {
    console.error(`Migration not found: ${m.file}`);
    process.exit(1);
  }
}

if (verifyOnly) {
  const r = verify();
  process.exit(r.status ?? 1);
}

console.log(dbUrl ? 'Applying via --db-url...' : 'Applying via linked Supabase project...');

for (const m of migrations) {
  console.log(`\n→ ${m.label}`);
  const result = runCopied(m.file, m.tempName);
  if (result.status !== 0) {
    console.error(`\nFailed on: ${m.label}`);
    console.error('بدائل:');
    console.error('  A) npx supabase login && npx supabase link');
    console.error('  B) npm run db:auth-ban-freeze -- --db-url "postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"');
    console.error('  C) SQL Editor اليدوي (خطوتان أدناه في الدليل)');
    process.exit(result.status ?? 1);
  }
}

const v = verify();
if (v.status !== 0) process.exit(v.status ?? 1);

console.log('\nOK — تأكد أن profiles_exists=true و freeze_policy_exists=true في المخرجات أعلاه.');
