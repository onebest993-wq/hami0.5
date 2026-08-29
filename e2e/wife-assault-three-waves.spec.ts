/**
 * محاكاة دفاعية حيّة ضد Vite — ثلاث موجات.
 * الطلبات من Playwright Node (خارج حارس المتصفح).
 * لا أدوات اختراق ولا فيضان غير محدود: الرفض هو النجاح.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { wifeLiveAuthHeaders, WIFE_LIVE_GUEST_TOKEN } from './helpers/wifeLiveSign';

const ORIGIN = 'http://localhost:8080';
const VICTIM_USER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OTHER_DEV_TOKEN = 'dev-access-token-guest-lawyer-2';

function algNoneJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'guest-lawyer-1', role: 'admin', exp: 9999999999 }),
  ).toString('base64url');
  return `${header}.${payload}.`;
}

async function apiUp(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get('/api/public/healthz');
    const type = res.headers()['content-type'] ?? '';
    if (!type.includes('json')) return false;
    const body = (await res.json()) as { ok?: boolean };
    return res.ok && body.ok === true;
  } catch {
    return false;
  }
}

function assertRejected(status: number, label: string): void {
  expect(status, `${label} must not succeed`).toBeGreaterThanOrEqual(401);
  expect(status, label).toBeLessThanOrEqual(403);
}

function assertNotOk(status: number, label: string): void {
  expect(status, `${label} must not be success`).toBeGreaterThanOrEqual(400);
  expect(status, label).toBeLessThan(500);
}

async function issueLiveCsrf(request: APIRequestContext): Promise<string> {
  const headers = await wifeLiveAuthHeaders({ method: 'GET', url: `${ORIGIN}/api/security/csrf` });
  const res = await request.get('/api/security/csrf', { headers });
  expect(res.status(), 'csrf bootstrap').toBe(200);
  const body = (await res.json()) as { csrfToken?: string };
  expect(body.csrfToken?.length ?? 0).toBeGreaterThanOrEqual(16);
  return body.csrfToken as string;
}

async function signedJsonPost(
  request: APIRequestContext,
  path: string,
  body: string,
  csrf: string,
) {
  const headers = await wifeLiveAuthHeaders({
    method: 'POST',
    url: `${ORIGIN}${path}`,
    body,
    csrf,
  });
  return request.post(path, { headers, data: body });
}

test.describe.configure({ timeout: 45_000 });

test.describe('موجة 1 — استطلاع بسيط ومسارات مفتوحة', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test('الصحة العامة تعمل بلا توقيع', async ({ request }) => {
    const res = await request.get('/api/public/healthz');
    expect(res.status()).toBe(200);
  });

  test('الجاهزية لا تسرّب أسراراً', async ({ request }) => {
    const res = await request.get('/api/public/readyz');
    expect([200, 503]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toMatch(/service_role|SUPABASE_SERVICE/i);
  });

  test('منتدى بلا توقيع يُرفض', async ({ request }) => {
    assertRejected((await request.get('/api/forum/status')).status(), 'forum/status');
  });

  test('kv-proxy بلا توقيع يُرفض', async ({ request }) => {
    const res = await request.post('/api/kv-proxy', {
      data: { action: 'get', key: `user:${VICTIM_USER}:cases:1` },
    });
    assertRejected(res.status(), 'kv-proxy');
  });

  test('حظر إداري بلا توقيع يُرفض', async ({ request }) => {
    const res = await request.post('/api/admin/ban', {
      data: { targetUserId: VICTIM_USER, is_banned: true },
    });
    assertRejected(res.status(), 'admin/ban');
  });

  test('قائمة/دور المقر بلا توقيع تُرفض', async ({ request }) => {
    const users = await request.get('/api/admin/users');
    assertRejected(users.status(), 'admin/users');
    const role = await request.post('/api/admin/role', {
      data: { targetUserId: VICTIM_USER, role: 'admin' },
    });
    assertRejected(role.status(), 'admin/role');
    const stats = await request.get('/api/admin/stats');
    assertRejected(stats.status(), 'admin/stats');
    const status = await request.get('/api/admin/status');
    assertRejected(status.status(), 'admin/status');
    const consultations = await request.get('/api/admin/consultations');
    assertRejected(consultations.status(), 'admin/consultations');
    const del = await request.post('/api/admin/consultations', {
      data: { postId: 'p1' },
    });
    assertRejected(del.status(), 'admin/consultations-delete');
  });

  test('حذف تخزين بلا توقيع يُرفض', async ({ request }) => {
    const res = await request.post('/api/upload/remove', {
      data: { paths: [`${VICTIM_USER}/vault/secret.pdf`] },
    });
    assertRejected(res.status(), 'upload/remove');
  });

  test('رؤوس WIFE مزيفة لا تكفي', async ({ request }) => {
    const res = await request.post('/api/forum/delete', {
      headers: {
        authorization: `Bearer ${WIFE_LIVE_GUEST_TOKEN}`,
        'x-wife-signature': 'ZmFrZXNpZ25hdHVyZWFhYWFhYWFhYQ',
        'x-wife-timestamp': String(Date.now()),
        'x-wife-nonce': 'fakenonce12345678',
        'x-csrf-token': 'fakecsrftokenvalue1',
        'x-wife-device-id': '0123456789abcdef0123456789abcdef',
      },
      data: { postId: 'pwn-all-posts' },
    });
    assertRejected(res.status(), 'forged headers');
  });

  test('تسجيل دخول فارغ لا يصدر جلسة', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: '', password: '' } });
    assertNotOk(res.status(), 'empty login');
    const setCookie = res.headers()['set-cookie'] ?? '';
    expect(setCookie.toLowerCase()).not.toContain('hami_access_token=');
  });
});

test.describe('موجة 2 — تزوير وتلاعب متوسط', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test('إعادة nonce بعد نجاح تُرفض', async ({ request }) => {
    const url = `${ORIGIN}/api/security/csrf`;
    const nonce = `assault_replay_${Date.now().toString(36)}_abcd`;
    const timestamp = String(Date.now());
    const headers = await wifeLiveAuthHeaders({ method: 'GET', url, nonce, timestamp });
    expect((await request.get('/api/security/csrf', { headers })).status()).toBe(200);
    assertRejected((await request.get('/api/security/csrf', { headers })).status(), 'nonce replay');
  });

  test('طابع قديم خارج النافذة يُرفض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ORIGIN}/api/security/csrf`,
      timestamp: String(Date.now() - 121_000),
    });
    assertRejected((await request.get('/api/security/csrf', { headers })).status(), 'stale ts');
  });

  test('طابع مستقبلي يُرفض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ORIGIN}/api/security/csrf`,
      timestamp: String(Date.now() + 121_000),
    });
    assertRejected((await request.get('/api/security/csrf', { headers })).status(), 'future ts');
  });

  test('توقيع مسار يُنفَّذ على مسار آخر يُرفض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ORIGIN}/api/security/csrf`,
    });
    assertRejected((await request.get('/api/forum/status', { headers })).status(), 'path swap');
  });

  test('توقيع GET يُعاد كـ POST يُرفض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ORIGIN}/api/security/csrf`,
    });
    const res = await request.post('/api/security/csrf', { headers, data: { injected: true } });
    expect(res.status(), 'method swap').toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
  });

  test('تبديل الجسم بعد التوقيع يُرفض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({ action: 'get', key: 'user:guest-lawyer-1:cases:1' });
    const headers = await wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ORIGIN}/api/kv-proxy`,
      body,
      csrf,
    });
    const res = await request.post('/api/kv-proxy', {
      headers,
      data: JSON.stringify({ action: 'del', key: `user:${VICTIM_USER}:cases:1` }),
    });
    assertRejected(res.status(), 'body swap');
  });

  test('توقيع بتوكن وإرسال توكن آخر يُرفض', async ({ request }) => {
    const url = `${ORIGIN}/api/security/csrf`;
    const headers = await wifeLiveAuthHeaders({ method: 'GET', url, token: WIFE_LIVE_GUEST_TOKEN });
    headers.authorization = `Bearer ${OTHER_DEV_TOKEN}`;
    assertRejected((await request.get('/api/security/csrf', { headers })).status(), 'cross-token');
  });

  test('wife-sign من أصل معادٍ يُرفض', async ({ request }) => {
    const res = await request.post('/api/security/wife-sign', {
      headers: { origin: 'https://evil.test', 'content-type': 'application/json' },
      data: { method: 'GET', url: '/api/kv-proxy', body: '' },
    });
    assertRejected(res.status(), 'evil origin wife-sign');
  });

  test('wife-sign بلا كوكي جلسة يُرفض', async ({ request }) => {
    const res = await request.post('/api/security/wife-sign', {
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      data: { method: 'POST', url: '/api/admin/ban', body: '{}' },
    });
    assertRejected(res.status(), 'wife-sign no session');
  });

  test('wife-sign لا يوقّع مسار إقلاع login', async ({ request }) => {
    const res = await request.post('/api/security/wife-sign', {
      headers: {
        origin: ORIGIN,
        cookie: `hami_access_token=${WIFE_LIVE_GUEST_TOKEN}`,
        'content-type': 'application/json',
      },
      data: { method: 'POST', url: '/api/auth/login', body: '{}' },
    });
    expect(res.status(), 'bootstrap oracle').toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('موجة 3 — تصعيد عنيف محدود (رفض لا نجاح)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test('عاصفة 24 طلباً غير موقّع لا تخترق ولا تُسقط الصحة', async ({ request }) => {
    const paths = [
      '/api/kv-proxy',
      '/api/admin/ban',
      '/api/forum/delete',
      '/api/upload/remove',
      '/api/audit/log',
    ];
    const jobs = Array.from({ length: 24 }, (_, i) =>
      request.post(paths[i % paths.length], {
        data: { action: 'get', key: `user:${VICTIM_USER}:flood:${i}` },
      }),
    );
    const results = await Promise.all(jobs);
    for (const res of results) {
      expect(res.status(), `storm ${res.url()}`).toBeGreaterThanOrEqual(401);
      expect(res.status()).toBeLessThan(500);
    }
    expect((await request.get('/api/public/healthz')).status()).toBe(200);
  });

  test('IDOR قراءة مفتاح ضحية عبر kv موقّع يُرفض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({ action: 'get', key: `user:${VICTIM_USER}:cases:1` });
    const res = await signedJsonPost(request, '/api/kv-proxy', body, csrf);
    expect(res.status(), 'kv IDOR').toBe(403);
  });

  test('IDOR تعداد بادئة كل المستخدمين يُرفض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({ action: 'getByPrefix', prefix: 'user:' });
    const res = await signedJsonPost(request, '/api/kv-proxy', body, csrf);
    expect(res.status(), 'prefix enum').toBe(403);
  });

  test('IDOR حذف ملف ضحية يُرفض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({ paths: [`${VICTIM_USER}/vault/secret.pdf`] });
    const res = await signedJsonPost(request, '/api/upload/remove', body, csrf);
    expect(res.status(), 'remove IDOR').toBe(403);
  });

  test('IDOR رابط موقّع لمسار ضحية يُرفض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({ path: `${VICTIM_USER}/vault/secret.pdf` });
    const res = await signedJsonPost(request, '/api/upload/signed-url', body, csrf);
    expect(res.status(), 'signed-url IDOR').toBe(403);
  });

  test('عبور مسار مرمّز %2e%2e يُرفض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      path: `guest-lawyer-1/%2e%2e/${VICTIM_USER}/vault/secret.pdf`,
    });
    const res = await signedJsonPost(request, '/api/upload/signed-url', body, csrf);
    expect(res.status(), 'encoded traversal').toBe(403);
  });

  test('ضيف موقّع لا يحظر مستخدمين (تصعيد صلاحية)', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({ targetUserId: VICTIM_USER, is_banned: true });
    const res = await signedJsonPost(request, '/api/admin/ban', body, csrf);
    expect(res.status(), 'guest ban').toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('JWT alg=none لا يمر كمحامٍ', async ({ request }) => {
    const res = await request.get('/api/forum/status', {
      headers: { authorization: `Bearer ${algNoneJwt()}` },
    });
    assertRejected(res.status(), 'alg none');
  });

  test('Bearer يختلف عن كوكي الجلسة — رفض لا انتحال', async ({ request }) => {
    const url = `${ORIGIN}/api/security/csrf`;
    const headers = await wifeLiveAuthHeaders({ method: 'GET', url });
    headers.cookie = `hami_access_token=${OTHER_DEV_TOKEN}`;
    assertRejected((await request.get('/api/security/csrf', { headers })).status(), 'bearer/cookie');
  });

  test('جسم JSON كبير غير موقّع يُرفض دون إسقاط الصحة', async ({ request }) => {
    const pad = 'A'.repeat(180_000);
    const res = await request.post('/api/kv-proxy', {
      data: { action: 'set', key: `user:${VICTIM_USER}:blob`, value: pad },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
    expect((await request.get('/api/public/healthz')).status()).toBe(200);
  });

  test('حقن نموذج أولي في JSON غير موقّع يُرفض', async ({ request }) => {
    const res = await request.post('/api/kv-proxy', {
      data: { action: 'get', key: 'community:posts:all', __proto__: { admin: true } },
    });
    assertRejected(res.status(), 'prototype pollution');
  });
});
