/**
 * يشغّل wife-production-gate --prod بقيم .env.production.example فقط
 * (بدون دمج .env المحلي) — إثبات مسار --prod على عقد المستودع.
 *
 * لا يستبدل أسراراً حية / --live.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = path.join(ROOT, '.env.production.example');

if (!fs.existsSync(examplePath)) {
  console.error('[prod-gate-from-example] missing .env.production.example');
  process.exit(1);
}

/** @type {NodeJS.ProcessEnv} */
const env = { ...process.env };
// أزل مفاتيح حساسة قد تلوّث من .env المحلي قبل تطبيق المثال
const wipeKeys = [
  'VITE_SHELL_AUTH_OPEN',
  'VITE_BFF_AUTH',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WIFE_REDIS_REST_URL',
  'WIFE_REDIS_REST_TOKEN',
  'WIFE_DISABLE_EDGE_KV_PROXY',
  'ADMIN_ACCESS_KEY',
  'ADMIN_UUID',
  'NODE_ENV',
];
for (const k of wipeKeys) delete env[k];

for (const line of fs.readFileSync(examplePath, 'utf8').split(/\r?\n/)) {
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
  env[key] = val;
}

const extra = process.argv.slice(2);
const result = spawnSync(
  'node',
  ['scripts/wife-production-gate.mjs', '--prod', ...extra],
  { cwd: ROOT, stdio: 'inherit', env },
);

process.exit(result.status ?? 1);
