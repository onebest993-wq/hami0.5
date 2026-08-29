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

/** @param {string} url */
function normalizeSupabaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase();
}

/** @param {string} url */
function extractSupabaseProjectId(url) {
  // Align with src/utils/supabase/clientEnv.ts (real refs are [a-z0-9]+).
  const m = String(url || '')
    .trim()
    .match(/^https:\/\/([a-z0-9]+)(?:\.[a-z0-9-]+)?\.supabase\.co\/?$/i);
  return m?.[1]?.toLowerCase() ?? null;
}

/**
 * Example may use YOUR_PROJECT placeholders (not extractable).
 * Live must share a real projectId.
 * @param {string} clientUrl
 * @param {string} serverUrl
 * @param {'example' | 'live'} mode
 */
function supabaseUrlParity(clientUrl, serverUrl, mode) {
  const a = normalizeSupabaseUrl(clientUrl);
  const b = normalizeSupabaseUrl(serverUrl);
  if (!a || !b) return { ok: false, detail: 'missing client or server SUPABASE URL' };
  if (a === b) {
    const pid = extractSupabaseProjectId(a);
    return {
      ok: true,
      detail: pid ? `same URL projectId=${pid}` : `same URL (template) ${a}`,
    };
  }
  const clientPid = extractSupabaseProjectId(a);
  const serverPid = extractSupabaseProjectId(b);
  if (clientPid && serverPid && clientPid === serverPid) {
    return { ok: true, detail: `projectId=${clientPid}` };
  }
  return {
    ok: false,
    detail:
      mode === 'live'
        ? `live mismatch: VITE=${clientPid ?? a} SUPABASE=${serverPid ?? b}`
        : `mismatch: VITE=${clientPid ?? a} SUPABASE=${serverPid ?? b}`,
  };
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
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'WIFE_REDIS_REST_URL',
    'WIFE_REDIS_REST_TOKEN',
    'WIFE_DISABLE_EDGE_KV_PROXY',
    'ADMIN_ACCESS_KEY',
    'HAMI_DOSSIER_PAYLOAD_MAC_SECRET',
    'HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE',
  ];
  const missing = required.filter((k) => !(k in example) || example[k] === '');
  record(
    'example-required-keys',
    missing.length === 0,
    missing.length === 0 ? `${required.length} keys present` : `missing: ${missing.join(', ')}`,
  );

  // المثال قد يحمل YOUR_PROJECT كقالب — لكن عقد العميل في وقت التشغيل يرفضه.
  // هنا نؤكد أن المفاتيح موجودة؛ رفض الـplaceholder الحيّ يكون على .env.production إن وُجد.
  const clientUrl = example.VITE_SUPABASE_URL ?? '';
  const clientAnon = example.VITE_SUPABASE_ANON_KEY ?? '';
  record(
    'example-client-supabase-keys',
    Boolean(clientUrl) && Boolean(clientAnon),
    clientUrl && clientAnon
      ? 'VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY documented'
      : 'client VITE_SUPABASE_* missing from example',
  );

  const serverUrl = example.SUPABASE_URL ?? '';
  const exampleParity = supabaseUrlParity(clientUrl, serverUrl, 'example');
  record('example-supabase-project-parity', exampleParity.ok, exampleParity.detail);

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
    'example-no-retired-comms-env',
    !('WIFE_DISABLE_EDGE_COMMS_DISPATCHER' in example),
    'retired Edge comms env must not remain in the production contract',
  );
  record(
    'example-admin-not-placeholder',
    Boolean(example.ADMIN_ACCESS_KEY) &&
      example.ADMIN_ACCESS_KEY !== 'CHANGE_ME_IN_PRODUCTION',
    example.ADMIN_ACCESS_KEY === 'CHANGE_ME_IN_PRODUCTION'
      ? 'CHANGE_ME_IN_PRODUCTION forbidden'
      : 'ADMIN_ACCESS_KEY set (placeholder template ok)',
  );
  record(
    'example-lawyer-is-not-hq-deployment',
    example.HAMI_HQ_ALLOW_THIS_DEPLOYMENT !== 'true',
    example.HAMI_HQ_ALLOW_THIS_DEPLOYMENT === 'true'
      ? 'HAMI_HQ_ALLOW_THIS_DEPLOYMENT=true belongs on the HQ host only'
      : 'lawyer production example does not enable HQ deployment',
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
  const ph = (v) => !v || /YOUR_PROJECT|eyJ\.\.\.|CHANGE_ME|placeholder/i.test(v);
  const liveUrl = live.VITE_SUPABASE_URL ?? '';
  const liveAnon = live.VITE_SUPABASE_ANON_KEY ?? '';
  record(
    'live-client-supabase-real',
    !ph(liveUrl) && !ph(liveAnon) && liveAnon.length > 20,
    ph(liveUrl) || ph(liveAnon)
      ? 'VITE_SUPABASE_* must be real values in .env.production — placeholders refuse boot'
      : 'client Supabase env is non-placeholder',
  );

  const liveServerUrl = live.SUPABASE_URL ?? '';
  const liveParity = supabaseUrlParity(liveUrl, liveServerUrl, 'live');
  const livePid = extractSupabaseProjectId(liveUrl);
  const liveParityOk = liveParity.ok && Boolean(livePid);
  record(
    'live-supabase-project-parity',
    liveParityOk,
    liveParityOk
      ? liveParity.detail
      : livePid
        ? liveParity.detail
        : 'live VITE_SUPABASE_URL must be a real *.supabase.co project ref',
  );
} else {
  record(
    'live-env-production',
    true,
    'SKIP — no .env.production locally (fail-closed via example + hosting)',
  );
}

// Netlify: مسار الإنتاج مغلق؛ BFF=false مقبول لواجهة ثابتة بلا Functions.
// [build.environment] يسري على كل السياقات، و[context.production.environment]
// يخصّ الإنتاج وحده — فالفتح ممنوع في الأول، والإغلاق يكفي في أيّهما.
const netlifyPath = path.join(ROOT, 'netlify.toml');
if (fs.existsSync(netlifyPath)) {
  const toml = fs.readFileSync(netlifyPath, 'utf8');
  const blockOf = (header) =>
    toml.match(new RegExp(`\\[${header.replace(/[.[\]]/g, '\\$&')}\\]([\\s\\S]*?)(?=\\n\\[|\\n*$)`))?.[1] ?? '';
  const buildEnv = blockOf('build.environment');
  const prodEnv = blockOf('context.production.environment');
  const openAnywhereOnProdPath =
    /VITE_SHELL_AUTH_OPEN\s*=\s*"true"/i.test(buildEnv) || /VITE_SHELL_AUTH_OPEN\s*=\s*"true"/i.test(prodEnv);
  const closedSomewhere =
    /VITE_SHELL_AUTH_OPEN\s*=\s*"false"/i.test(prodEnv) || /VITE_SHELL_AUTH_OPEN\s*=\s*"false"/i.test(buildEnv);
  record(
    'netlify-prod-shell-closed',
    closedSomewhere && !openAnywhereOnProdPath,
    openAnywhereOnProdPath
      ? 'production path opens the shell — move the demo flag to deploy-preview/branch-deploy'
      : closedSomewhere
        ? 'production context closed'
        : 'production path must set VITE_SHELL_AUTH_OPEN="false"',
  );

  // Static Netlify has no BFF Functions — BFF must stay off on that host.
  const bffOff =
    /VITE_BFF_AUTH\s*=\s*"false"/i.test(buildEnv) || /VITE_BFF_AUTH\s*=\s*"false"/i.test(prodEnv);
  record(
    'netlify-static-bff-off',
    bffOff,
    bffOff
      ? 'Netlify static: VITE_BFF_AUTH=false (sessions client-side; shell still closed)'
      : 'Netlify must set VITE_BFF_AUTH="false" for static hosting without API Functions',
  );
} else {
  record('netlify-prod-shell-closed', true, 'no netlify.toml');
  record('netlify-static-bff-off', true, 'no netlify.toml');
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
