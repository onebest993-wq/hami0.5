#!/usr/bin/env node
/**
 * يطبّق migration 026 (تشديد RLS للمنتدى) على Supabase المرتبط.
 * يتطلب: supabase CLI + supabase link أو SUPABASE_DB_URL
 *
 * Usage: node scripts/apply-forum-rls-migration.mjs
 *    or: npm run db:forum-rls
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const migration = join('supabase', 'migrations', '026_forum_rls_privacy_tightening.sql');

if (!existsSync(migration)) {
    console.error(`Migration not found: ${migration}`);
    process.exit(1);
}

console.log('Applying forum RLS migration via supabase db push...');
const result = spawnSync('npx', ['supabase', 'db', 'push', '--include-all'], {
    stdio: 'inherit',
    shell: true,
});

if (result.status !== 0) {
    console.error('\nFailed. Ensure: supabase login + supabase link, or set remote DB credentials.');
    process.exit(result.status ?? 1);
}

console.log('Forum RLS migration applied successfully.');
