#!/usr/bin/env node
/**
 * بوابة المقر (HQ) — تنظيم تشغيل دون بناء ميزات جديدة.
 *
 *   npm run gate:hq              # عقود ثابتة + ملفات حرجة
 *   npm run gate:hq:tests        # + test:security:hq-assault
 *   npm run gate:hq:live         # + tests + assault:hq-live (loopback فقط)
 *   node scripts/headquarters-production-gate.mjs --prod
 *   node scripts/headquarters-production-gate.mjs --build   # بطيء: build:hq
 *
 * مؤجّل عمداً: شاشة إعادة رفع الهوية، E2E OTP حقيقي، Capacitor للمقر.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const RUN_TESTS = args.has('--tests');
const RUN_LIVE = args.has('--live');
const RUN_BUILD = args.has('--build');
const IS_PROD = args.has('--prod') || process.env.NODE_ENV === 'production';

/** @type {{ id: string; ok: boolean; detail: string; blocker: boolean }[]} */
const results = [];

function record(id, ok, detail, blocker = true) {
  results.push({ id, ok, detail, blocker });
  console.log(`${ok ? '✓' : blocker ? '✗ BLOCKER' : '⚠ WARN'}  ${id}: ${detail}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

console.log('=== Headquarters (HQ) production gate ===\n');

// ── deploy / product boundary ──────────────────────────────────────
record(
  'ops:vercel-hq-json',
  exists('vercel-hq.json'),
  'vercel-hq.json present',
);

if (exists('vercel-hq.json')) {
  const hqVercel = read('vercel-hq.json');
  record(
    'ops:vercel-hq-build',
    /build:hq:vercel/.test(hqVercel) && /"outputDirectory"\s*:\s*"dist-hq"/.test(hqVercel),
    'HQ Vercel uses build:hq:vercel → dist-hq',
  );
}

if (exists('vercel.json')) {
  const lawyerVercel = read('vercel.json');
  record(
    'ops:lawyer-vercel-not-hq-build',
    !/build:hq:vercel/.test(lawyerVercel),
    'lawyer vercel.json does not run HQ build',
  );
}

const pkg = read('package.json');
record(
  'ops:pkg-hq-scripts',
  /"build:hq:vercel"/.test(pkg) && /"test:security:hq-assault"/.test(pkg) && /"assault:hq-live"/.test(pkg),
  'package.json exposes build:hq:vercel, hq-assault, assault:hq-live',
);

const criticalPaths = [
  'src/hq/index.tsx',
  'src/hq/mountHqApplication.ts',
  'src/app/api/security/headquartersOriginGate.ts',
  'src/app/api/security/adminMailerEnv.ts',
  'scripts/guard-dist-hq-runtime.mjs',
  'scripts/guard-dist-no-hq-runtime.mjs',
  'scripts/headquarters-live-assault.mjs',
  '.audit/HQ_OPS_RUNBOOK_CHECKLIST.md',
];

for (const rel of criticalPaths) {
  record(`path:${rel}`, exists(rel), exists(rel) ? 'present' : 'missing');
}

const originGate = exists('src/app/api/security/headquartersOriginGate.ts')
  ? read('src/app/api/security/headquartersOriginGate.ts')
  : '';
record(
  'code:hq-origin-hosts',
  /HAMI_HQ_HOSTS/.test(originGate) && /HAMI_HQ_ALLOW_THIS_DEPLOYMENT/.test(originGate),
  'origin gate fail-closed on HQ hosts / allow-this-deployment',
);

const mailerEnv = exists('src/app/api/security/adminMailerEnv.ts')
  ? read('src/app/api/security/adminMailerEnv.ts')
  : '';
record(
  'code:hq-mailer-pepper-keys',
  /ADMIN_OTP_PEPPER/.test(mailerEnv) && /AUTH_OTP_PEPPER/.test(mailerEnv),
  'mailer env reads ADMIN_OTP_PEPPER + AUTH_OTP_PEPPER',
);

// ── migrations present (apply is ops — this gate only checks files) ─
const migrationFiles = [
  'supabase/migrations/20260812000003_admin_otp_trusted_devices.sql',
  'supabase/migrations/20260812000002_admin_headquarters_rpcs.sql',
  'supabase/migrations/20260828170000_hq_account_sessions.sql',
  'supabase/migrations/20260828140000_ensure_hq_audit_logs.sql',
  'supabase/migrations/20260829050000_auth_otp_challenges.sql',
  'supabase/migrations/20260812000001_freeze_profile_ban_flags_and_verification_meta.sql',
];

for (const rel of migrationFiles) {
  record(`migration:${path.basename(rel)}`, exists(rel), exists(rel) ? 'on disk' : 'missing');
}

// ── env example contracts ──────────────────────────────────────────
if (exists('.env.production.example')) {
  const ex = read('.env.production.example');
  record(
    'env:example-hq-allow',
    /HAMI_HQ_ALLOW_THIS_DEPLOYMENT/.test(ex) && /HAMI_HQ_HOSTS/.test(ex),
    'production example documents HQ allow + hosts',
  );
  record(
    'env:example-pepper',
    /ADMIN_OTP_PEPPER/.test(ex),
    'production example documents ADMIN_OTP_PEPPER',
  );
  record(
    'env:example-shell-closed',
    /VITE_SHELL_AUTH_OPEN\s*=\s*false/.test(ex),
    'production example keeps shell auth closed',
  );
}

const shellOpen = env('VITE_SHELL_AUTH_OPEN');
record(
  'env:VITE_SHELL_AUTH_OPEN',
  shellOpen !== 'true',
  shellOpen === 'true' ? 'TRUE — client auth bypass shipped' : shellOpen ? `=${shellOpen}` : 'unset/false (ok)',
  IS_PROD || shellOpen === 'true',
);

if (IS_PROD) {
  for (const key of [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'WIFE_REDIS_REST_URL',
    'WIFE_REDIS_REST_TOKEN',
    'ADMIN_OTP_PEPPER',
  ]) {
    record(`env:${key}`, Boolean(env(key)), env(key) ? 'set' : 'missing', true);
  }

  const pepper = env('ADMIN_OTP_PEPPER');
  record(
    'env:ADMIN_OTP_PEPPER-length',
    pepper.length >= 16,
    pepper ? `len=${pepper.length}` : 'missing',
    true,
  );

  const allowHq = env('HAMI_HQ_ALLOW_THIS_DEPLOYMENT').toLowerCase() === 'true';
  const hosts = env('HAMI_HQ_HOSTS');
  if (allowHq) {
    record(
      'env:HAMI_HQ_HOSTS',
      Boolean(hosts),
      hosts ? 'set with HQ allow' : 'required when HAMI_HQ_ALLOW_THIS_DEPLOYMENT=true',
      true,
    );
  } else {
    record(
      'env:HAMI_HQ_ALLOW_THIS_DEPLOYMENT',
      true,
      'unset/false — lawyer deploy or local (ok); set true only on HQ Vercel project',
      false,
    );
  }
}

// ── optional build ─────────────────────────────────────────────────
if (RUN_BUILD) {
  const b = spawnSync('npm', ['run', 'build:hq'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  record('build:hq', b.status === 0, b.status === 0 ? 'passed (+ dist-hq guard)' : `exit ${b.status}`);
}

// ── optional unit assault ──────────────────────────────────────────
if (RUN_TESTS) {
  const t = spawnSync('npm', ['run', 'test:security:hq-assault'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  record('tests:hq-assault', t.status === 0, t.status === 0 ? 'passed' : `exit ${t.status}`);
}

// ── optional live loopback ─────────────────────────────────────────
if (RUN_LIVE) {
  const live = spawnSync('npm', ['run', 'assault:hq-live'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  record(
    'live:hq-assault',
    live.status === 0,
    live.status === 0
      ? 'passed'
      : `exit ${live.status} (HQ_ASSAULT_BASE_URL loopback only; default http://127.0.0.1:8080)`,
    true,
  );
}

const blockers = results.filter((r) => !r.ok && r.blocker);
const warns = results.filter((r) => !r.ok && !r.blocker);
console.log('\n── HQ gate ──');
console.log(`pass=${results.filter((r) => r.ok).length} blockers=${blockers.length} warns=${warns.length}`);
if (blockers.length) {
  console.error('GATE FAILED');
  process.exit(1);
}
console.log('GATE PASSED');
console.log('Ops next (manual): .audit/HQ_OPS_RUNBOOK_CHECKLIST.md');
console.log('Flags: --tests | --live | --prod | --build');
