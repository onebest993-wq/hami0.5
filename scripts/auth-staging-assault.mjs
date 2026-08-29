#!/usr/bin/env node
/**
 * هجمة staging حية على مسارات بدء الاستخدام (HTTP حقيقي).
 *
 *   AUTH_ASSAULT_BASE_URL=https://staging.example.com node scripts/auth-staging-assault.mjs
 *
 * لا يشغّل ضد إنتاج إلا إذا مرّرت AUTH_ASSAULT_ALLOW_PROD=1 صراحةً.
 */
const base = (process.env.AUTH_ASSAULT_BASE_URL || '').trim().replace(/\/$/, '');
const allowProd = process.env.AUTH_ASSAULT_ALLOW_PROD === '1';

if (!base) {
  console.error('Set AUTH_ASSAULT_BASE_URL (staging origin, no trailing slash)');
  process.exit(1);
}

if (/hami\.legal$/i.test(new URL(base).hostname) && !allowProd && !/staging|preview|localhost|127\.0\.0\.1/i.test(base)) {
  console.error('Refusing likely production host without AUTH_ASSAULT_ALLOW_PROD=1');
  process.exit(1);
}

/** @type {{ id: string; ok: boolean; detail: string }[]} */
const results = [];

async function hit(id, path, init, assertFn) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, init);
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const ok = assertFn(res, body);
    results.push({ id, ok, detail: `status=${res.status}` });
    console.log(`${ok ? '✓' : '✗'}  ${id}: status=${res.status}`);
    return { res, body };
  } catch (err) {
    results.push({ id, ok: false, detail: String(err) });
    console.log(`✗  ${id}: ${err}`);
    return null;
  }
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'x-forwarded-for': '203.0.113.200',
};

const TERMS_VERSION = 'v1-2026-08-12';

await hit(
  'signup-disposable-email',
  '/api/auth/signup',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      email: 'assault@mailinator.com',
      password: 'SecureLaw9',
      termsVersion: TERMS_VERSION,
      data: { role: 'admin' },
    }),
  },
  (res, body) => res.status === 400 && body?.code === 'EMAIL_REJECTED',
);

await hit(
  'signup-weak-password',
  '/api/auth/signup',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: 'ok@gmail.com', password: '12345678', termsVersion: TERMS_VERSION }),
  },
  (res, body) => res.status === 400 && body?.code === 'PASSWORD_REJECTED',
);

await hit(
  'forgot-evil-redirect',
  '/api/auth/forgot-password',
  {
    method: 'POST',
    headers: { ...jsonHeaders, origin: base },
    body: JSON.stringify({
      email: 'victim@gmail.com',
      redirectTo: 'https://evil.example/steal',
    }),
  },
  (res) => res.status === 200,
);

await hit(
  'resend-empty-email',
  '/api/auth/resend-confirmation',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: '' }),
  },
  (res, body) => res.status === 400 && body?.ok === false,
);

await hit(
  'resend-generic-ok',
  '/api/auth/resend-confirmation',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: 'assault-no-account@gmail.com' }),
  },
  (res, body) => res.status === 200 && body?.ok === true,
);

await hit(
  'login-malformed-email',
  '/api/auth/login',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: 'not-an-email', password: 'SecureLaw9', termsVersion: TERMS_VERSION }),
  },
  (res, body) => res.status === 400 && body?.ok === false,
);

await hit(
  'login-wrong-password',
  '/api/auth/login',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      email: 'assault-no-account@gmail.com',
      password: 'WrongPass9x',
      termsVersion: TERMS_VERSION,
    }),
  },
  (res, body) => {
    const cookie = String(res.headers.get('set-cookie') ?? '');
    return (
      (res.status === 401 || res.status === 503) &&
      body?.ok === false &&
      !cookie.includes('hami_access_token=')
    );
  },
);

await hit(
  'session-unauthenticated',
  '/api/auth/session',
  { method: 'GET', headers: { accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'refresh-without-cookie',
  '/api/auth/refresh',
  { method: 'POST', headers: { Accept: 'application/json' } },
  (res) => res.status === 401,
);

await hit(
  'logout-clears-or-ok',
  '/api/auth/logout',
  { method: 'POST', headers: { Accept: 'application/json' } },
  (res) => res.status === 200,
);

await hit(
  'forum-unauthenticated',
  '/api/forum/posts',
  { method: 'GET', headers: { accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-ban-unauthenticated',
  '/api/admin/ban',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      requesterId: 'x',
      targetUserId: 'y',
      updates: { role: 'admin' },
    }),
  },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-users-unauthenticated',
  '/api/admin/users',
  { method: 'GET', headers: { Accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-role-unauthenticated',
  '/api/admin/role',
  {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      role: 'admin',
    }),
  },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-stats-unauthenticated',
  '/api/admin/stats',
  { method: 'GET', headers: { Accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-status-unauthenticated',
  '/api/admin/status',
  { method: 'GET', headers: { Accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-audit-unauthenticated',
  '/api/admin/audit',
  { method: 'GET', headers: { Accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-devices-unauthenticated',
  '/api/admin/devices',
  { method: 'GET', headers: { Accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

await hit(
  'admin-consultations-unauthenticated',
  '/api/admin/consultations',
  { method: 'GET', headers: { Accept: 'application/json' } },
  (res) => res.status === 401 || res.status === 403,
);

const failed = results.filter((r) => !r.ok);
console.log('\n── Staging auth assault ──');
console.log(`pass=${results.length - failed.length}/${results.length}`);
if (failed.length) {
  console.error('ASSAULT FAILED');
  process.exit(1);
}
console.log('ASSAULT PASSED');
