#!/usr/bin/env node
/**
 * Auth onboarding production gate — إغلاق تشغيلي قبل ادّعاء جاهزية التسجيل/الدخول.
 *
 *   node scripts/auth-onboarding-production-gate.mjs
 *   node scripts/auth-onboarding-production-gate.mjs --tests
 *   node scripts/auth-onboarding-production-gate.mjs --live   # يحتاج AUTH_ASSAULT_BASE_URL
 *   node scripts/auth-onboarding-production-gate.mjs --prod   # يفرض env إنتاج
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

// ── static code contracts ──────────────────────────────────────────
const forumAuth = read('src/app/api/forum/_auth.ts');
record(
  'code:forum-fail-closed',
  /FORUM_VERIFICATION_REQUIRED/.test(forumAuth) &&
    /بلا سجل KV/.test(forumAuth) &&
    /FORUM_VERIFICATION_UNAVAILABLE/.test(forumAuth),
  'forum denies missing/non-active KV and KV errors',
);

const signup = read('src/app/api/auth/signup/route.ts');
record(
  'code:signup-pending-forced',
  /verificationStatus:\s*'pending'/.test(signup) && /accountType/.test(signup),
  'signup forces pending + lawyer|client only',
);
record(
  'code:signup-generic-errors',
  /Signup failed/.test(signup) && !/error: duplicate\s*\?[\s\S]*: message/.test(signup) && /resolveGoTrueUserId/.test(signup),
  'signup maps GoTrue errors generically and refuses cookies without a subject',
);
record(
  'code:signup-kv-seed',
  /lawyer-verification:\$\{/.test(signup) || /lawyer-verification:`/.test(signup) || /`lawyer-verification:\$\{newUserId\}`/.test(signup),
  'signup seeds pending KV row',
);

const ban = read('src/app/api/admin/ban/route.ts');
record(
  'code:ban-whitelist',
  /ALLOWED_BAN_UPDATE_KEYS/.test(ban) && /ban_duration/.test(ban),
  'ban whitelist + GoTrue ban_duration revoke',
);
record(
  'code:hq-ban-trusted-device',
  /requireTrustedHeadquartersAdmin/.test(ban) && /isHeadquartersProtectedAdminId/.test(ban),
  'HQ ban requires trusted device and refuses platform-admin UUID',
);
record(
  'code:hq-role-no-admin-promote',
  /isHeadquartersAssignableRole/.test(read('src/app/api/admin/role/route.ts')) &&
    /requireTrustedHeadquartersAdmin/.test(read('src/app/api/admin/role/route.ts')),
  'HQ role BFF refuses admin promotion and requires trusted device',
);
record(
  'code:hq-stats-consultations-gate',
  /requireTrustedHeadquartersAdmin/.test(read('src/app/api/admin/stats/route.ts')) &&
    /requireTrustedHeadquartersAdmin/.test(read('src/app/api/admin/consultations/route.ts')) &&
    /deletePostAuthorized/.test(read('src/app/api/admin/consultations/route.ts')) &&
    /requireTrustedHeadquartersAdmin/.test(read('src/app/api/admin/status/route.ts')),
  'HQ stats, consultations, and status require trusted device; delete is server-authorized',
);

const forgotAllow = read('src/app/api/auth/passwordResetRedirectAllowlist.ts');
record(
  'code:reset-allowlist',
  /resolvePasswordResetRedirectTo/.test(forgotAllow) && /hami\.legal/.test(forgotAllow),
  'password-reset redirect allowlist present',
);

const verification = read('src/app/api/auth/lawyer-verification/route.ts');
record(
  'code:verification-imports',
  /from '\.\.\/\.\.\/security\/kvStoreAdmin\.ts'/.test(verification),
  'lawyer-verification imports ../../security (not broken ../security)',
);
record(
  'code:verification-id-front',
  /ID_FRONT_REQUIRED/.test(verification) && /ocrNameMatch:\s*null/.test(verification),
  'ID front required; client OCR ignored',
);

const accountStatus = read('src/app/services/auth/lawyerAccountStatus.ts');
record(
  'code:client-fail-closed',
  /fail-closed/.test(accountStatus) && /return 'pending'/.test(accountStatus),
  'client defaults missing verification to pending',
);

const login = read('src/app/api/auth/login/route.ts');
record(
  'code:login-generic-errors',
  /Invalid credentials/.test(login) && /Account unavailable/.test(login) && /isUserActiveLive/.test(login),
  'login maps GoTrue errors, rejects inactive accounts, no raw leak',
);
record(
  'code:login-fail-closed-identity',
  /resolveGoTrueUserId/.test(login) && /Auth service unavailable/.test(login),
  'login refuses cookies when subject cannot be resolved',
);

const refresh = read('src/app/api/auth/refresh/route.ts');
record(
  'code:refresh-live-ban',
  /isUserActiveLive/.test(refresh) && /Account unavailable/.test(refresh) && /revokeGoTrueSession/.test(refresh),
  'refresh re-checks live account status, revokes GoTrue, and clears cookies',
);

const bffClient = read('src/app/utils/bffAuthClient.ts');
record(
  'code:bff-keeper-after-login',
  /startBffSessionKeeper\(\)/.test(bffClient) && /HAMI_BFF_SESSION_LOST_EVENT/.test(bffClient),
  'BFF login starts session keeper and emits session-lost on 401 refresh',
);

const wifeStatus = read('src/app/api/security/wifeUserStatus.ts');
record(
  'code:profile-authority-not-lawyers-poison',
  /جدول lawyers اختياري/.test(wifeStatus) && /ensureLawyerProfileRow/.test(wifeStatus),
  'profiles is ban authority; missing lawyers table does not block new logins',
);

const forgot = read('src/app/api/auth/forgot-password/route.ts');
record(
  'code:forgot-email-budget',
  /emailAllowed/.test(forgot) && /auth-forgot-email/.test(forgot),
  'forgot-password honors per-email recover budget without enumerating',
);

const resend = read('src/app/api/auth/resend-confirmation/route.ts');
record(
  'code:resend-confirmation',
  /auth\/v1\/resend/.test(resend) && /genericOk/.test(resend) && /auth-resend-email/.test(resend),
  'resend-confirmation is generic, rate-limited, and does not enumerate mailboxes',
);

record(
  'code:terms-server-enforced',
  /termsVersionRejectedResponse/.test(signup) &&
    /termsVersionRejectedResponse/.test(login) &&
    /stampLegalTermsAcceptance/.test(signup) &&
    /stampLegalTermsAcceptance/.test(login),
  'login and signup require the current terms version and stamp app_metadata',
);

const logout = read('src/app/api/auth/logout/route.ts');
record(
  'code:logout-global-revoke',
  /scope:\s*'global'/.test(logout),
  'logout revokes GoTrue sessions globally',
);

const forumCore = read('src/app/services/forum/forumApi/forumApiClientCore.ts');
record(
  'code:forum-bff-session',
  /isBffAuthEnabled/.test(forumCore) && /getLiveAuthUserId/.test(forumCore),
  'forum remote session honors BFF live user id',
);

const bypass = read('src/app/context/authProviderRuntime.ts');
record(
  'code:admin-bypass-dev-only',
  /admin bypass requires development/.test(bypass) || /bypass disabled outside development/.test(bypass),
  'authAdminBypassLogin gated outside DEV',
);

record(
  'ops:migration-file',
  exists('supabase/migrations/20260812000001_freeze_profile_ban_flags_and_verification_meta.sql'),
  'freeze ban flags migration file present',
);

record(
  'ops:assault-suite',
  exists('src/app/api/auth/adversarialAssault.test.ts'),
  'adversarial assault suite present',
);

// ── env / example contracts ────────────────────────────────────────
if (exists('.env.production.example')) {
  const ex = read('.env.production.example');
  record(
    'env:shell-auth-closed-example',
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
  for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    record(`env:${key}`, Boolean(env(key)), env(key) ? 'set' : 'missing', true);
  }
}

// ── optional tests ─────────────────────────────────────────────────
if (RUN_TESTS) {
  const t = spawnSync('npm', ['run', 'test:security:auth-assault'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  record('tests:auth-assault', t.status === 0, t.status === 0 ? 'passed' : `exit ${t.status}`);
}

if (RUN_LIVE) {
  const live = spawnSync('node', ['scripts/auth-staging-assault.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  record(
    'live:staging-assault',
    live.status === 0,
    live.status === 0 ? 'passed' : `exit ${live.status} (set AUTH_ASSAULT_BASE_URL)`,
    Boolean(env('AUTH_ASSAULT_BASE_URL')),
  );
}

const blockers = results.filter((r) => !r.ok && r.blocker);
const warns = results.filter((r) => !r.ok && !r.blocker);
console.log('\n── Auth onboarding gate ──');
console.log(`pass=${results.filter((r) => r.ok).length} blockers=${blockers.length} warns=${warns.length}`);
if (blockers.length) {
  console.error('GATE FAILED');
  process.exit(1);
}
console.log('GATE PASSED');
console.log('Next ops (manual): npm run db:auth-ban-freeze && npm run db:lawyer-verification-active -- --apply');
