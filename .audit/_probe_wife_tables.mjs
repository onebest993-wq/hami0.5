import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(rel) {
  const full = path.resolve(rel);
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

loadEnvFile('.env');
loadEnvFile('.env.local');

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const redis = Boolean(
  (process.env.WIFE_REDIS_REST_URL || '').trim() &&
    (process.env.WIFE_REDIS_REST_TOKEN || '').trim(),
);

const report = {
  supabaseUrlSet: Boolean(url),
  serviceRoleSet: Boolean(key),
  redisConfigured: redis,
  host: url ? new URL(url).host : null,
  tables: {},
};

if (!url || !key) {
  console.log(JSON.stringify({ ...report, skipped: 'missing_env' }, null, 2));
  process.exit(0);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const table of ['wife_nonce_store', 'wife_csrf_store', 'wife_token_sessions', 'profiles']) {
  const { error, count } = await admin.from(table).select('*', { count: 'exact', head: true });
  report.tables[table] = {
    ok: !error,
    code: error?.code ?? null,
    message: error ? String(error.message).slice(0, 160) : null,
    count: typeof count === 'number' ? count : null,
  };
}

console.log(JSON.stringify(report, null, 2));
