#!/usr/bin/env node
/**
 * يطبّق RPC زيادة محاولات OTP الذرّية.
 * ينسخ SQL إلى %TEMP% لأن مسار المشروع فيه مسافات.
 *
 *   npm run db:auth-otp-attempt
 *   npm run db:auth-otp-attempt -- --verify-only
 *   npm run db:auth-otp-attempt -- --db-url "postgresql://..."
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const dbUrlIdx = args.indexOf('--db-url');
const dbUrl = dbUrlIdx >= 0 ? args[dbUrlIdx + 1] : process.env.SUPABASE_DB_URL;
const verifyOnly = args.includes('--verify-only');
const MIGRATION = join(
    ROOT,
    'supabase',
    'migrations',
    '20260830220000_auth_otp_register_failed_attempt.sql',
);

function runSupabaseDbQueryFile(absFileNoSpaces) {
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
    const dir = mkdtempSync(join(tmpdir(), 'hami-otp-'));
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
    console.log('\n── Verify OTP attempt RPC ──');
    const sql = `SELECT
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'auth_otp_register_failed_attempt'
  ) AS rpc_exists,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'auth_otp_register_failed_attempt'
    )
    THEN has_function_privilege(
      'service_role',
      'public.auth_otp_register_failed_attempt(uuid, integer)',
      'EXECUTE'
    )
    ELSE false
  END AS service_role_can_execute;
`;
    const dir = mkdtempSync(join(tmpdir(), 'hami-otp-v-'));
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

if (!existsSync(MIGRATION)) {
    console.error(`Migration not found: ${MIGRATION}`);
    process.exit(1);
}

if (verifyOnly) {
    const r = verify();
    process.exit(r.status ?? 1);
}

console.log(dbUrl ? 'Applying OTP attempt RPC via --db-url...' : 'Applying OTP attempt RPC via linked Supabase project...');
const applied = runCopied(MIGRATION, 'auth_otp_register_failed_attempt.sql');
if (applied.status !== 0) {
    console.error('\nFailed to apply auth_otp_register_failed_attempt');
    console.error('  npx supabase login && npx supabase link');
    console.error('  npm run db:auth-otp-attempt -- --db-url "postgresql://..."');
    process.exit(applied.status ?? 1);
}

const v = verify();
process.exit(v.status ?? 1);
