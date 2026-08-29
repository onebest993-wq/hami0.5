/**
 * WIFE على خادم Vite الحي — طلبات Node (بلا حارس) + سلوك المتصفح للمستخدم.
 * Preview المجمّع لا يحمّل /api/*؛ يُتخطى الملف إن لم يكن healthz JSON.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  assertWifeSignedHttpOutcome,
  assertWifeSignedRequest,
  browserFetchStatus,
  headerMap,
  installApiRequestCapture,
  seedWifeE2eSession,
  waitForApiCapture,
  waitForSameOriginApiReady,
  waitForWifeGuard,
  waitForWifeSigningToken,
} from './helpers/wifeApiCapture';
import { wifeLiveAuthHeaders } from './helpers/wifeLiveSign';

async function devApiAvailable(request: APIRequestContext): Promise<boolean> {
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

test.describe('WIFE — خادم التطوير الحي (طلب Node بلا حارس)', () => {
  test.describe.configure({ timeout: 45_000 });

  test.beforeEach(async ({ request }) => {
    test.skip(!(await devApiAvailable(request)), 'Vite /api/* غير متاح (غالباً preview). شغّل E2E_USE_PREVIEW=0 مع npm run dev');
  });

  test('المسار العام healthz يعمل بلا توقيع وبلا جلسة', async ({ request }) => {
    const res = await request.get('/api/public/healthz');
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  test('منتدى بلا توقيع يُرفض — مستخدم عادي لا يمر من خارج التطبيق', async ({ request }) => {
    const res = await request.get('/api/forum/status');
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
    const type = res.headers()['content-type'] ?? '';
    expect(type).toContain('json');
  });

  test('كتابة kv-proxy بلا توقيع تُرفض', async ({ request }) => {
    const res = await request.post('/api/kv-proxy', {
      data: { action: 'get', key: 'user:other:cases:1' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('CSRF bootstrap بلا توقيع يُرفض', async ({ request }) => {
    const res = await request.get('/api/security/csrf');
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('GET wife-session يعيد 405 ولا يسرّب سراً', async ({ request }) => {
    const res = await request.get('/api/security/wife-session');
    expect(res.status()).toBe(405);
    expect(res.headers()['allow'] ?? res.headers()['Allow']).toMatch(/DELETE/i);
    const body = (await res.json()) as { sessionSecret?: string; csrfToken?: string; ok?: boolean };
    expect(body.sessionSecret).toBeUndefined();
    expect(body.csrfToken).toBeUndefined();
    expect(body.ok).toBe(false);
  });

  test('توقيع مزيف لا يكفي لعبور المنتدى', async ({ request }) => {
    const res = await request.post('/api/forum/report', {
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer e2e-wife-smoke-access-token-with-length-ok',
        'x-wife-signature': 'fake-signature-aaaaaaaaaaaaaaaa',
        'x-wife-timestamp': String(Date.now()),
        'x-wife-nonce': 'fakenonce12345678',
        'x-csrf-token': 'fakecsrftokenvalue1',
        'x-wife-device-id': '0123456789abcdef0123456789abcdef',
      },
      data: { postId: 'x', reason: 'probe' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });
});

/**
 * قبول التوقيع الصحيح على Vite الحي (ضيف التطوير).
 * الحملة السابقة أثبتت الإرسال والرفض؛ هذه تثبت أن HMAC العميل = تحقق الخادم.
 */
test.describe('WIFE — قبول التوقيع الصحيح على الخادم الحي', () => {
  test.describe.configure({ timeout: 45_000 });

  test.beforeEach(async ({ request }) => {
    test.skip(!(await devApiAvailable(request)), 'Vite /api/* غير متاح');
  });

  test('GET csrf موقّع بتوكن الضيف يمر (round-trip حي)', async ({ request }) => {
    const url = 'http://localhost:8080/api/security/csrf';
    const headers = await wifeLiveAuthHeaders({ method: 'GET', url });
    const res = await request.get('/api/security/csrf', { headers });
    const text = await res.text();
    expect(res.status(), text).toBe(200);
    const body = JSON.parse(text) as { ok?: boolean; csrfToken?: string };
    expect(body.ok).toBe(true);
    expect(body.csrfToken?.length ?? 0).toBeGreaterThanOrEqual(16);
  });

  test('إعادة نفس nonce بعد نجاح تُرفض', async ({ request }) => {
    const url = 'http://localhost:8080/api/security/csrf';
    const nonce = `replay_${Date.now().toString(36)}_abcdef12`;
    const timestamp = String(Date.now());
    const headers = await wifeLiveAuthHeaders({ method: 'GET', url, nonce, timestamp });
    const first = await request.get('/api/security/csrf', { headers });
    expect(first.status()).toBe(200);
    const replay = await request.get('/api/security/csrf', { headers });
    expect(replay.status()).toBeGreaterThanOrEqual(401);
    expect(replay.status()).toBeLessThanOrEqual(403);
  });

  test('طابع أقدم من نافذة الدقيقتين يُرفض', async ({ request }) => {
    const url = 'http://localhost:8080/api/security/csrf';
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url,
      timestamp: String(Date.now() - 121_000),
    });
    const res = await request.get('/api/security/csrf', { headers });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('توقيع مسار يُنفَّذ على مسار آخر يُرفض', async ({ request }) => {
    const signedFor = 'http://localhost:8080/api/security/csrf';
    const headers = await wifeLiveAuthHeaders({ method: 'GET', url: signedFor });
    const res = await request.get('/api/forum/status', { headers });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('wife-sign من خارج الصفحة بلا أصل مسموح يُرفض', async ({ request }) => {
    const res = await request.post('/api/security/wife-sign', {
      headers: { 'content-type': 'application/json', origin: 'https://evil.test' },
      data: { method: 'GET', url: '/api/forum/status', body: '' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });
});

test.describe('WIFE — متصفح المستخدم مع الحارس', () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
  });

  test('مسار الإقلاع login لا يُوقَّع من الحارس', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await waitForWifeGuard(page);

    await page.evaluate(async () => {
      await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'probe@local', password: 'x' }),
      }).catch(() => undefined);
    });
    const hit = await waitForApiCapture(captures, (c) => c.url.includes('/api/auth/login'));
    const h = headerMap(hit.headers);
    expect(h['x-wife-signature']).toBeFalsy();
  });

  test('fetch المحمي يُوقَّع من المتصفح حتى مع الواجهة مفتوحة', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await waitForWifeGuard(page);
    await waitForWifeSigningToken(page);
    await waitForSameOriginApiReady(page);

    const status = await browserFetchStatus(page, '/api/forum/status');
    assertWifeSignedHttpOutcome(status, 'live-server protected fetch');

    const hit = await waitForApiCapture(captures, (c) => c.url.includes('/api/forum/status'));
    assertWifeSignedRequest(hit);
  });
});
