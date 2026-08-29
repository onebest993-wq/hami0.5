#!/usr/bin/env node
/**
 * يفحص إن كان SUPABASE_SERVICE_ROLE_KEY (JWT أو sb_secret) يقرأ profiles عبر JS.
 * لا يطبع المفتاح.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
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

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) {
  console.error('PROBE_FAIL missing url/key');
  process.exit(1);
}

const kind = key.startsWith('eyJ')
  ? 'jwt-service'
  : key.startsWith('sb_secret_')
    ? 'sb_secret'
    : key.startsWith('sb_publishable_')
      ? 'sb_publishable-WRONG'
      : 'unknown';

if (kind === 'sb_publishable-WRONG') {
  console.error('PROBE_FAIL publishable key cannot admin');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const { data, error, count } = await admin
  .from('profiles')
  .select('id', { count: 'exact', head: true });

if (error) {
  console.log(`PROBE_JS_PROFILES kind=${kind} ok=false code=${error.code || ''} msg=${error.message}`);
  process.exit(2);
}

console.log(`PROBE_JS_PROFILES kind=${kind} ok=true count=${count ?? data?.length ?? '?'}`);
process.exit(0);
