#!/usr/bin/env node
/**
 * يطبّق migrations 027 + 028 (inbox Supabase + rebuild RPC) على Supabase المرتبط.
 * يستخدم `supabase db query --file` لتجنّب فشل db push على migrations قديمة (مثل 020).
 *
 * Usage:
 *   npm run db:shell-notifications
 *   npm run db:shell-notifications -- --db-url "postgresql://..."
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dbUrlIdx = args.indexOf('--db-url');
const dbUrl = dbUrlIdx >= 0 ? args[dbUrlIdx + 1] : process.env.SUPABASE_DB_URL;

const migrations = [
    {
        file: join('supabase', 'migrations', '027_lawyer_shell_notifications.sql'),
        version: '027',
        name: 'lawyer_shell_notifications',
    },
    {
        file: join('supabase', 'migrations', '028_lawyer_shell_inbox_rebuild_from_events.sql'),
        version: '028',
        name: 'lawyer_shell_inbox_rebuild_from_events',
    },
];

for (const m of migrations) {
    if (!existsSync(m.file)) {
        console.error(`Migration not found: ${m.file}`);
        process.exit(1);
    }
}

function runQuery({ file, sql }) {
    const flags = ['supabase', 'db', 'query', '--yes'];
    if (sql) {
        flags.push(sql);
    } else {
        flags.push('--file', file);
    }
    if (dbUrl) {
        flags.push('--db-url', dbUrl);
    } else {
        flags.push('--linked');
    }
    return spawnSync('npx', flags, { stdio: 'inherit', shell: true });
}

function recordMigration({ version, name }) {
    const sql = `INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ('${version}', '${name}', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING;`;
    return runQuery({ sql });
}

console.log(
    dbUrl
        ? 'Applying shell notifications migrations (027, 028) via SUPABASE_DB_URL...'
        : 'Applying shell notifications migrations (027, 028) via linked Supabase project...',
);

for (const m of migrations) {
    console.log(`\n→ ${m.file}`);
    const result = runQuery(m);
    if (result.status !== 0) {
        console.error('\nFailed. Ensure: supabase login + supabase link, or pass --db-url / SUPABASE_DB_URL.');
        process.exit(result.status ?? 1);
    }
    recordMigration(m);
}

console.log('\nShell notifications migrations applied successfully.');
console.log('Verify: GET /api/notifications/health → ready: true');
