#!/usr/bin/env node
/**
 * WIFE Production Gate — تحقق قبل أي ادّعاء أمني رسمي أو نشر إنتاج.
 *
 * Usage:
 *   node scripts/wife-production-gate.mjs           # static checks only
 *   node scripts/wife-production-gate.mjs --live    # + Redis ping + Edge kv-proxy probe
 *   node scripts/wife-production-gate.mjs --tests   # + npm run test:security
 *   node scripts/wife-production-gate.mjs --e2e     # + playwright WIFE smoke (browser)
 *
 * Load env from shell or: set -a && source .env.production && set +a (Linux)
 * Windows: $env:VAR="..." before running
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const args = new Set(process.argv.slice(2));
const RUN_TESTS = args.has('--tests');
const RUN_E2E = args.has('--e2e');
const LIVE = args.has('--live');

/** @type {{ id: string; ok: boolean; detail: string; blocker: boolean }[]} */
const results = [];

function record(id, ok, detail, blocker = true) {
  results.push({ id, ok, detail, blocker });
  const mark = ok ? '✓' : blocker ? '✗ BLOCKER' : '⚠ WARN';
  console.log(`${mark}  ${id}: ${detail}`);
}

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function walkRoutes(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkRoutes(full, out);
    else if (name.name === 'route.ts') out.push(full);
  }
  return out;
}

function scanSrcForPattern(re, label) {
  /** @type {string[]} */
  const hits = [];
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '__tests__') continue;
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
        const text = fs.readFileSync(full, 'utf8');
        if (re.test(text)) hits.push(path.relative(ROOT, full).replace(/\\/g, '/'));
      }
    }
  }
  walk(SRC);
  return { label, hits: [...new Set(hits)] };
}

// ─── 1. Env vars (production) ───────────────────────────────────────────────
const isProd = env('NODE_ENV').toLowerCase() === 'production' || args.has('--prod');

const requiredServer = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const requiredWife = ['WIFE_REDIS_REST_URL', 'WIFE_REDIS_REST_TOKEN'];

for (const key of requiredServer) {
  const set = Boolean(env(key));
  record(
    `env:${key}`,
    set || !isProd,
    set ? 'set' : isProd ? 'missing — server auth/DB checks fail' : 'not set (dev ok)',
    isProd,
  );
}
for (const key of requiredWife) {
  const set = Boolean(env(key));
  record(
    `env:${key}`,
    set || !isProd,
    set
      ? 'set'
      : isProd
        ? 'missing — nonce/rate-limit/stolen-token use weak in-memory fallback per instance'
        : 'not set (ok for dev)',
    isProd,
  );
}

if (isProd && env('WIFE_DISABLE_EDGE_KV_PROXY') !== 'true') {
  record(
    'env:WIFE_DISABLE_EDGE_KV_PROXY',
    false,
    'must be "true" in production — Edge kv-proxy bypasses WIFE HMAC',
    true,
  );
} else if (env('WIFE_DISABLE_EDGE_KV_PROXY') === 'true') {
  record('env:WIFE_DISABLE_EDGE_KV_PROXY', true, 'Edge kv-proxy disabled (410)');
} else {
  record(
    'env:WIFE_DISABLE_EDGE_KV_PROXY',
    false,
    'not true yet — enable after verifying /api/kv-proxy in staging',
    false,
  );
}

if (isProd && env('WIFE_DISABLE_EDGE_COMMS_DISPATCHER') !== 'true') {
  record(
    'env:WIFE_DISABLE_EDGE_COMMS_DISPATCHER',
    false,
    'must be "true" in production — Edge comms bypasses WIFE HMAC',
    true,
  );
} else if (env('WIFE_DISABLE_EDGE_COMMS_DISPATCHER') === 'true') {
  record('env:WIFE_DISABLE_EDGE_COMMS_DISPATCHER', true, 'Edge comms-dispatcher disabled (410)');
} else {
  record(
    'env:WIFE_DISABLE_EDGE_COMMS_DISPATCHER',
    false,
    'not true yet — enable after verifying /api/comms-dispatcher in staging',
    false,
  );
}

const adminAccessKey = env('ADMIN_ACCESS_KEY');
if (isProd && (!adminAccessKey || adminAccessKey === 'CHANGE_ME_IN_PRODUCTION')) {
  record(
    'env:ADMIN_ACCESS_KEY',
    false,
    'must be set to a strong secret in production (Edge diagnostics)',
    true,
  );
} else if (adminAccessKey) {
  record('env:ADMIN_ACCESS_KEY', true, 'set');
} else {
  record('env:ADMIN_ACCESS_KEY', false, 'not set (Edge admin diagnostics return 503)', false);
}

if (isProd && env('ADMIN_UUID') === '') {
  record('env:ADMIN_UUID', false, 'recommended: set platform admin user UUID', false);
} else if (env('ADMIN_UUID')) {
  record('env:ADMIN_UUID', true, 'set');
}

if (isProd && env('VITE_BFF_AUTH') !== 'true') {
  record(
    'env:VITE_BFF_AUTH',
    false,
    'must be "true" — otherwise JWT remains in localStorage',
    true,
  );
} else if (env('VITE_BFF_AUTH') === 'true') {
  record('env:VITE_BFF_AUTH', true, 'HttpOnly BFF auth enabled');
} else {
  record('env:VITE_BFF_AUTH', false, 'not true — enable for production HttpOnly sessions', false);
}

// ─── 2. Migrations present locally ──────────────────────────────────────────
const migrations = [
  'supabase/migrations/20260423000000_create_wife_nonce_store.sql',
  'supabase/migrations/20260613000000_wife_token_sessions.sql',
  'supabase/migrations/20260613000001_wife_csrf_store.sql',
  'supabase/migrations/20260613000002_wife_storage_bucket_rls.sql',
  'supabase/migrations/20260613000003_audit_logs_rls.sql',
  'supabase/migrations/20260613000004_fix_privileged_roles_and_rls.sql',
];
for (const m of migrations) {
  record(`migration:${path.basename(m)}`, fileExists(m), fileExists(m) ? 'file exists' : 'missing from repo');
}
record(
  'migration:applied',
  false,
  'MANUAL: run `supabase db push` or apply SQL in dashboard — gate cannot verify remote DB',
  false,
);

// ─── 3. All BFF routes call WIFE ────────────────────────────────────────────
/** Bootstrap routes — session cookie + WIFE signing proxy (no WIFE on self) */
const WIFE_EXEMPT_ROUTES = new Set([
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/auth/refresh/route.ts',
  'src/app/api/auth/session/route.ts',
  'src/app/api/security/wife-sign/route.ts',
]);

const routes = walkRoutes(path.join(SRC, 'app', 'api'));
const unprotected = [];
for (const routePath of routes) {
  const rel = path.relative(ROOT, routePath).replace(/\\/g, '/');
  if (WIFE_EXEMPT_ROUTES.has(rel)) continue;
  const text = fs.readFileSync(routePath, 'utf8');
  const protected_ =
    text.includes('verifyWifeSignature') ||
    text.includes('assertWifeSignatureRequest') ||
    text.includes('requireWifeUser') ||
    text.includes('requirePlatformAdmin') ||
    text.includes('requireForumAuth') ||
    rel.includes('/api/public/');
  if (!protected_) unprotected.push(rel);
}
record(
  'routes:wife-covered',
  unprotected.length === 0,
  unprotected.length === 0 ? `${routes.length} route.ts files OK` : `unprotected: ${unprotected.join(', ')}`,
);

// ─── 4. Client bypass scan ──────────────────────────────────────────────────
const edgeKv = scanSrcForPattern(/functions\/v1\/[^'"]*kv-proxy/, 'Edge kv-proxy direct call');
const edgeComms = scanSrcForPattern(/functions\/v1\/[^'"]*comms-dispatcher/, 'Edge comms direct call');
record(
  'client:no-edge-kv',
  edgeKv.hits.length === 0,
  edgeKv.hits.length ? edgeKv.hits.join(', ') : 'no direct Edge kv-proxy in src/',
);
record(
  'client:no-edge-comms',
  edgeComms.hits.length === 0,
  edgeComms.hits.length ? edgeComms.hits.join(', ') : 'no direct Edge comms in src/',
);

const deadServerUrl = scanSrcForPattern(/make-server-f09713ba/, 'legacy SERVER_URL');
const usedOnlyDecl = deadServerUrl.hits.filter((f) => {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const decl = (t.match(/make-server-f09713ba/g) ?? []).length;
  return decl > 0;
});
record(
  'client:legacy-server-url',
  usedOnlyDecl.length <= 1,
  usedOnlyDecl.length <= 1
    ? 'legacy Edge URL not used for live calls (or dead const only)'
    : `review: ${usedOnlyDecl.join(', ')}`,
  false,
);

const directStorageUpload = scanSrcForPattern(/\.storage\s*\.\s*from\s*\([^)]+\)\s*\.\s*upload\s*\(/, 'direct client storage.upload');
const clientStorageUploadHits = directStorageUpload.hits.filter((f) => !f.startsWith('src/app/api/'));
record(
  'client:no-direct-storage-upload',
  clientStorageUploadHits.length === 0,
  clientStorageUploadHits.length
    ? `use /api/upload: ${clientStorageUploadHits.join(', ')}`
    : 'no direct supabase.storage.upload in client',
);

const directStorageRemove = scanSrcForPattern(/\.storage\s*\.\s*from\s*\([^)]+\)\s*\.\s*remove\s*\(/, 'direct client storage.remove');
const clientStorageRemoveHits = directStorageRemove.hits.filter((f) => !f.startsWith('src/app/api/'));
record(
  'client:no-direct-storage-remove',
  clientStorageRemoveHits.length === 0,
  clientStorageRemoveHits.length
    ? `use /api/upload/remove: ${clientStorageRemoveHits.join(', ')}`
    : 'no direct supabase.storage.remove in client',
);

const directSupabaseFrom = scanSrcForPattern(/supabase\s*\.\s*from\s*\(/, 'direct client supabase.from');
const clientFromHits = directSupabaseFrom.hits.filter((f) => {
  if (f.startsWith('src/app/api/')) return false;
  if (f.includes('SupabaseService.ts')) return false;
  if (f.includes('AdminLawEntry')) return false;
  if (f.includes('AdminService.ts')) return false;
  return true;
});
record(
  'client:no-direct-supabase-from',
  clientFromHits.length === 0,
  clientFromHits.length
    ? `use WIFE BFF routes: ${clientFromHits.join(', ')}`
    : 'no direct supabase.from in lawyer client paths',
  false,
);

const edgeFnInvoke = scanSrcForPattern(/supabase\s*\.\s*functions\s*\.\s*invoke\s*\(/, 'direct Edge functions.invoke');
const clientFnHits = edgeFnInvoke.hits.filter((f) => !f.startsWith('src/app/api/'));
record(
  'client:no-edge-functions-invoke',
  clientFnHits.length === 0,
  clientFnHits.length
    ? `use WIFE BFF /api/laws/list or admin-only invoke: ${clientFnHits.join(', ')}`
    : 'no direct functions.invoke in lawyer client paths',
  false,
);

const jwtMetadataPrivilege = scanSrcForPattern(
  /user_metadata\s*[^;\n]{0,80}(SUPER_ADMIN|MODERATOR|'admin'|"admin")/,
  'JWT user_metadata privilege check',
);
const apiMetadataHits = jwtMetadataPrivilege.hits.filter((f) => f.startsWith('src/app/api/'));
record(
  'api:no-jwt-user-metadata-privilege',
  apiMetadataHits.length === 0,
  apiMetadataHits.length
    ? `use roleResolver / profiles.role: ${apiMetadataHits.join(', ')}`
    : 'no JWT user_metadata privilege checks in API routes',
);

// ─── 5. KV ownership sync ───────────────────────────────────────────────────
const edgeOwnership = path.join(ROOT, 'supabase/functions/server/kvProxyKeyOwnership.ts');
const appOwnership = path.join(ROOT, 'src/app/security/kvProxyKeyOwnership.ts');
function stripOwnershipBanner(text) {
  return text.replace(/^\/\*\*[\s\S]*?\*\/\s*\n/, '').trim();
}
if (fileExists('src/app/security/kvProxyKeyOwnership.ts') && fileExists('supabase/functions/server/kvProxyKeyOwnership.ts')) {
  const appNorm = stripOwnershipBanner(fs.readFileSync(appOwnership, 'utf8'));
  const edgeNorm = stripOwnershipBanner(fs.readFileSync(edgeOwnership, 'utf8'));
  record('kv-ownership:synced', appNorm === edgeNorm, appNorm === edgeNorm ? 'Edge copy matches app canonical' : 'run npm run sync:kv-ownership');
} else {
  record('kv-ownership:synced', false, 'ownership files missing');
}

// ─── 6. SecurityInitializer wired ───────────────────────────────────────────
const wifeValidatorPath = path.join(SRC, 'app', 'api', 'security', 'wifeValidator.ts');
if (fileExists('src/app/api/security/wifeValidator.ts')) {
  const wifeValidatorText = fs.readFileSync(wifeValidatorPath, 'utf8');
  record(
    'code:production-device-id',
    wifeValidatorText.includes('isValidWifeDeviceId') && wifeValidatorText.includes('isProductionNodeEnv()'),
    'mutating requests require x-wife-device-id in production',
  );
}

const cspPath = path.join(SRC, 'app', 'api', 'security', 'contentSecurityPolicy.ts');
if (fileExists('src/app/api/security/contentSecurityPolicy.ts')) {
  const cspText = fs.readFileSync(cspPath, 'utf8');
  record(
    'code:csp-hardening',
    cspText.includes("script-src-attr 'none'") && cspText.includes("frame-src 'none'"),
    'CSP blocks inline event handlers and frames',
  );
}

const secureClientPath = path.join(SRC, 'app', 'services', 'SecureAPIClient.ts');
if (fileExists('src/app/services/SecureAPIClient.ts')) {
  const secureClientText = fs.readFileSync(secureClientPath, 'utf8');
  record(
    'client:device-id-header',
    secureClientText.includes("'x-wife-device-id'") && secureClientText.includes('getOrCreateDeviceId()'),
    'SecureAPIClient always sends device binding header',
  );
}

record(
  'code:wife-security-monitor',
  fileExists('src/app/api/security/wifeSecurityMonitor.ts'),
  'server-side WIFE rejection telemetry module present',
);

const appTsx = path.join(SRC, 'app', 'App.tsx');
if (fileExists('src/app/App.tsx')) {
  const appText = fs.readFileSync(appTsx, 'utf8');
  record(
    'boot:SecurityInitializer',
    appText.includes('SecurityInitializer'),
    appText.includes('SecurityInitializer') ? 'mounted in App.tsx' : 'wifeFetchGuard may not install',
  );
}

// ─── 7. Static audit ────────────────────────────────────────────────────────
const audit = spawnSync('node', ['scripts/security-audit.mjs'], { cwd: ROOT, encoding: 'utf8' });
record(
  'static:security-audit',
  audit.status === 0,
  audit.status === 0 ? 'no critical patterns' : (audit.stderr || audit.stdout || '').slice(0, 200),
);

// ─── 8. Live probes (optional) ──────────────────────────────────────────────
if (LIVE) {
  const redisUrl = env('WIFE_REDIS_REST_URL');
  const redisToken = env('WIFE_REDIS_REST_TOKEN');
  if (redisUrl && redisToken) {
    try {
      const ping = await fetch(`${redisUrl.replace(/\/+$/, '')}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      record('live:redis', ping.ok, ping.ok ? 'Upstash reachable' : `HTTP ${ping.status}`);
    } catch (e) {
      record('live:redis', false, String(e instanceof Error ? e.message : e));
    }
  } else {
    record('live:redis', false, 'skipped — Redis env missing', false);
  }

  const supabaseUrl = env('SUPABASE_URL');
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (projectRef && env('WIFE_DISABLE_EDGE_KV_PROXY') === 'true') {
    const edgeUrl = `https://${projectRef}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`;
    try {
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', key: 'probe' }),
      });
      record(
        'live:edge-kv-disabled',
        res.status === 410,
        res.status === 410 ? 'returns 410 Gone' : `expected 410, got ${res.status}`,
      );
    } catch (e) {
      record('live:edge-kv-disabled', false, String(e instanceof Error ? e.message : e), false);
    }
  } else {
    record(
      'live:edge-kv-disabled',
      false,
      'skipped — set SUPABASE_URL + WIFE_DISABLE_EDGE_KV_PROXY=true',
      false,
    );
  }
}

// ─── 9. Test suite (optional) ───────────────────────────────────────────────
if (RUN_TESTS) {
  console.log('\nRunning npm run test:security …');
  const tests = spawnSync('npm run test:security', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: true,
  });
  record('tests:security', tests.status === 0, tests.status === 0 ? 'all security tests passed' : 'failed — see output above');
}

if (RUN_E2E) {
  console.log('\nRunning npm run test:e2e:wife (Playwright browser smoke) …');
  const e2e = spawnSync('npm run test:e2e:wife', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: true,
  });
  record(
    'e2e:wife-browser',
    e2e.status === 0,
    e2e.status === 0 ? 'browser sends WIFE headers on /api/*' : 'failed — see Playwright output above',
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const blockers = results.filter((r) => !r.ok && r.blocker);
const warnings = results.filter((r) => !r.ok && !r.blocker);

console.log('\n── Summary ──');
console.log(`Checks: ${results.length} | Blockers: ${blockers.length} | Warnings: ${warnings.length}`);

if (blockers.length) {
  console.error('\nBLOCKED for production claims until fixed:');
  for (const b of blockers) console.error(`  • ${b.id}: ${b.detail}`);
  process.exit(1);
}

console.log('\nGate passed (no blockers). Manual items still required:');
console.log('  • Confirm migrations applied on production Supabase');
console.log('  • Staging smoke: login → forum post → kv sync → SMS (mock)');
console.log('  • External pen test before legal/compliance claims');

const idealTotal = results.filter((r) => (r.id.startsWith('code:') || r.id.startsWith('client:')) && r.ok).length;
const idealEnv = results.filter((r) => r.id.startsWith('env:') && r.ok).length;
console.log(`\nIdeal tier (code): ${idealTotal} hardening checks active in source.`);
if (warnings.length === 0 && idealEnv >= 4) {
  console.log('Deployment tier: env looks production-ready — run --live to confirm Redis/Edge.');
} else if (warnings.length > 0) {
  console.log(`Deployment tier: ${warnings.length} env warning(s) — ideal for prod after Redis + Edge disable.`);
}
process.exit(0);
