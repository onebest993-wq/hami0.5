/**
 * W4 fail-closed: عقد بيئة الإنتاج من الملفات المودَعة في المستودع.
 * لا يحتاج أسراراً حية — يفشل إن كان المثال/الاستضافة غير آمنة.
 *
 * Usage: node scripts/guard-prod-env-contract.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(ROOT, '.cursor', 'prod-env-contract-result.json');

/** @type {{ id: string; ok: boolean; detail: string }[]} */
const gates = [];
function record(id, ok, detail) {
  gates.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
}

function parseEnvFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  /** @type {Record<string, string>} */
  const map = {};
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
    map[key] = val;
  }
  return map;
}

const exampleRel = '.env.production.example';
const example = parseEnvFile(exampleRel);
if (!example) {
  record('example-present', false, `${exampleRel} missing`);
} else {
  record('example-present', true, exampleRel);

  const required = [
    'VITE_SHELL_AUTH_OPEN',
    'VITE_BFF_AUTH',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'WIFE_REDIS_REST_URL',
    'WIFE_REDIS_REST_TOKEN',
    'WIFE_DISABLE_EDGE_KV_PROXY',
    'WIFE_DISABLE_EDGE_COMMS_DISPATCHER',
    'ADMIN_ACCESS_KEY',
  ];
  const missing = required.filter((k) => !(k in example) || example[k] === '');
  record(
    'example-required-keys',
    missing.length === 0,
    missing.length === 0 ? `${required.length} keys present` : `missing: ${missing.join(', ')}`,
  );

  record(
    'example-shell-auth-closed',
    example.VITE_SHELL_AUTH_OPEN === 'false',
    `VITE_SHELL_AUTH_OPEN=${example.VITE_SHELL_AUTH_OPEN ?? '(unset)'}`,
  );
  record(
    'example-bff-auth-on',
    example.VITE_BFF_AUTH === 'true',
    `VITE_BFF_AUTH=${example.VITE_BFF_AUTH ?? '(unset)'}`,
  );
  record(
    'example-edge-kv-disabled',
    example.WIFE_DISABLE_EDGE_KV_PROXY === 'true',
    `WIFE_DISABLE_EDGE_KV_PROXY=${example.WIFE_DISABLE_EDGE_KV_PROXY ?? '(unset)'}`,
  );
  record(
    'example-edge-comms-disabled',
    example.WIFE_DISABLE_EDGE_COMMS_DISPATCHER === 'true',
    `WIFE_DISABLE_EDGE_COMMS_DISPATCHER=${example.WIFE_DISABLE_EDGE_COMMS_DISPATCHER ?? '(unset)'}`,
  );
  record(
    'example-admin-not-placeholder',
    Boolean(example.ADMIN_ACCESS_KEY) &&
      example.ADMIN_ACCESS_KEY !== 'CHANGE_ME_IN_PRODUCTION',
    example.ADMIN_ACCESS_KEY === 'CHANGE_ME_IN_PRODUCTION'
      ? 'CHANGE_ME_IN_PRODUCTION forbidden'
      : 'ADMIN_ACCESS_KEY set (placeholder template ok)',
  );
}

// Live .env.production إن وُجد — نفس عقود الأمان (قيم حقيقية أو placeholders مرفوضة للفتح)
const live = parseEnvFile('.env.production');
if (live) {
  record(
    'live-shell-auth-closed',
    live.VITE_SHELL_AUTH_OPEN !== 'true',
    `VITE_SHELL_AUTH_OPEN=${live.VITE_SHELL_AUTH_OPEN ?? '(unset)'}`,
  );
  record(
    'live-bff-auth-on',
    live.VITE_BFF_AUTH === 'true',
    `VITE_BFF_AUTH=${live.VITE_BFF_AUTH ?? '(unset)'}`,
  );
  record(
    'live-edge-kv-disabled',
    live.WIFE_DISABLE_EDGE_KV_PROXY === 'true',
    `WIFE_DISABLE_EDGE_KV_PROXY=${live.WIFE_DISABLE_EDGE_KV_PROXY ?? '(unset)'}`,
  );
  record(
    'live-edge-comms-disabled',
    live.WIFE_DISABLE_EDGE_COMMS_DISPATCHER === 'true',
    `WIFE_DISABLE_EDGE_COMMS_DISPATCHER=${live.WIFE_DISABLE_EDGE_COMMS_DISPATCHER ?? '(unset)'}`,
  );
} else {
  record(
    'live-env-production',
    true,
    'SKIP — no .env.production locally (fail-closed via example + hosting)',
  );
}

// Netlify: مسار الإنتاج مغلق؛ BFF=false مقبول لواجهة ثابتة بلا Functions
const netlifyPath = path.join(ROOT, 'netlify.toml');
if (fs.existsSync(netlifyPath)) {
  const toml = fs.readFileSync(netlifyPath, 'utf8');
  const buildEnv = toml.match(/\[build\.environment\]([\s\S]*?)(?=\n\[|\n*$)/)?.[1] ?? '';
  const shellClosed = /VITE_SHELL_AUTH_OPEN\s*=\s*"false"/i.test(buildEnv);
  const shellOpen = /VITE_SHELL_AUTH_OPEN\s*=\s*"true"/i.test(buildEnv);
  record(
    'netlify-prod-shell-closed',
    shellClosed && !shellOpen,
    shellClosed ? 'build.environment closed' : 'production path must set VITE_SHELL_AUTH_OPEN="false"',
  );
} else {
  record('netlify-prod-shell-closed', true, 'no netlify.toml');
}

const ok = gates.every((g) => g.ok);
const payload = {
  ok,
  at: new Date().toISOString(),
  mode: 'fail-closed-contract',
  liveSecretsPresent: Boolean(live),
  gates,
  note: live
    ? 'Live .env.production validated'
    : 'No live secrets — contract from .env.production.example + hosting only',
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[guard-prod-env-contract] ${ok ? 'ALL PASS' : 'FAILED'} → ${outPath}`);
process.exit(ok ? 0 : 1);
