/**
 * حملة Red Team احترافية — منطق أعمال + سلاسل هجوم + إساءة auth + تكامل multipart.
 * الرفض = نجاح. لا مسح بيانات ولا SMS ولا DDoS شبكي.
 */
import { test, expect } from '@playwright/test';
import {
  apiHealthy,
  assertWall,
  ASSAULT_ORIGIN,
  issueLiveCsrf,
  sha256Hex,
  signedJsonGet,
  signedJsonPost,
  signedMultipartUpload,
  VICTIM_UUID,
  WIFE_LIVE_GUEST_TOKEN,
} from './helpers/wifeAssaultKit';

test.describe.configure({ timeout: 120_000 });

test.describe('Tier 1 — استطلاع وذكاء API', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('admin/verify للضيف لا يمنح isAdmin ولا يكشف service_role', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const res = await signedJsonGet(request, '/api/admin/verify');
    expect(res.status()).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.isAdmin).toBe(false);
    const blob = JSON.stringify(body);
    expect(blob).not.toMatch(/service_role|eyJ[A-Za-z0-9_-]{20,}/);
    void csrf;
  });

  test('wife-session GET لا يصدر أسراً (405)', async ({ request }) => {
    const res = await request.get('/api/security/wife-session');
    expect(res.status()).toBe(405);
    const body = (await res.json()) as { sessionSecret?: string; csrfToken?: string };
    expect(body.sessionSecret).toBeUndefined();
    expect(body.csrfToken).toBeUndefined();
  });

  test('OPTIONS على مسار محمي لا يفتح POST', async ({ request }) => {
    const res = await request.fetch('/api/kv-proxy', { method: 'OPTIONS' });
    expect(res.status()).toBeLessThan(500);
    const post = await request.post('/api/kv-proxy', { data: { action: 'get', key: 'x' } });
    assertWall(post.status(), 'OPTIONS then POST');
  });
});

test.describe('Tier 2 — إساءة auth (rate limit)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('login يُطبّق حد IP بعد عاصفة محاولات', async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 32; i += 1) {
      const res = await request.post('/api/auth/login', {
        headers: { 'x-forwarded-for': '203.0.113.50' },
        data: { email: `probe${i}@example.invalid`, password: 'wrong-password-123' },
      });
      statuses.push(res.status());
    }
    expect(statuses.some((s) => s === 429), statuses.join(',')).toBe(true);
    expect(statuses.every((s) => s < 500)).toBe(true);
  });

  test('signup يُطبّق حد IP', async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 14; i += 1) {
      const res = await request.post('/api/auth/signup', {
        headers: { 'x-forwarded-for': '203.0.113.51' },
        data: { email: `signup${i}@example.invalid`, password: 'Short1!' },
      });
      statuses.push(res.status());
    }
    expect(statuses.some((s) => s === 429)).toBe(true);
  });
});

test.describe('Tier 3 — منطق أعمال موقّع (سلاسل CSRF)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('case-share: قبول/إنهاء جلسة ضحية مزيفة', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    for (const body of [
      JSON.stringify({ action: 'accept', shareId: VICTIM_UUID }),
      JSON.stringify({ action: 'decline', shareId: VICTIM_UUID }),
      JSON.stringify({ action: 'end', shareId: VICTIM_UUID }),
    ]) {
      const res = await signedJsonPost(request, '/api/case-share', body, csrf);
      expect([404, 403, 400]).toContain(res.status());
    }
  });

  test('case-share detail: shareId ضحية لا يُسرّب', async ({ request }) => {
    const res = await signedJsonGet(request, `/api/case-share/detail?shareId=${VICTIM_UUID}`);
    expect([404, 403]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toMatch(/encrypted_data|sessionSecret/i);
  });

  test('audit/log: لا يمنح صلاحيات — على الأكثر تسجيل أو رفض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      action: 'ADMIN_ESCALATION',
      meta: { role: 'admin', __proto__: { admin: true } },
    });
    const res = await signedJsonPost(request, '/api/audit/log', body, csrf);
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const parsed = (await res.json()) as { isAdmin?: boolean; ok?: boolean };
      expect(parsed.isAdmin).toBeUndefined();
      expect(parsed.ok).toBe(true);
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('KV: كتابة community:posts مرفوضة', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      action: 'set',
      key: 'community:posts:inject',
      value: { pwn: true },
    });
    const res = await signedJsonPost(request, '/api/kv-proxy', body, csrf);
    expect(res.status()).toBe(403);
  });

  test('KV: follow انتحال ضحية', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      action: 'set',
      key: `follow:${VICTIM_UUID}:guest-lawyer-1`,
      value: true,
    });
    const res = await signedJsonPost(request, '/api/kv-proxy', body, csrf);
    expect(res.status()).toBe(403);
  });

  test('timeline POST لضيف غير UUID مرفوض (لا 500)', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      executionFileId: 'victim-exec-001',
      event: { id: 'inj', title: 'poison' },
    });
    const res = await signedJsonPost(request, '/api/timeline-events', body, csrf);
    expect(res.status()).toBe(403);
  });

  test('settings/cloud-sync: POST للضيف غير UUID مرفوض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      user_key: VICTIM_UUID,
      app_data: { lawyer_settings: { hijack: true } },
    });
    const res = await signedJsonPost(request, '/api/settings/cloud-sync', body, csrf);
    expect(res.status()).toBe(403);
  });

  test('settings/cloud-sync: GET للضيف يعيد null بدون تسريب', async ({ request }) => {
    const res = await signedJsonGet(request, '/api/settings/cloud-sync');
    expect(res.status()).toBe(200);
    const parsed = (await res.json()) as { app_data?: unknown; user_key?: string };
    expect(parsed.app_data).toBeNull();
    expect(parsed.user_key).toBeUndefined();
  });

  test('lawyer-verification PATCH للضيف لا يُفعّل', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const headers = await (await import('./helpers/wifeLiveSign')).wifeLiveAuthHeaders({
      method: 'PATCH',
      url: `${ASSAULT_ORIGIN}/api/auth/lawyer-verification`,
      body: JSON.stringify({ status: 'active' }),
      csrf,
    });
    const res = await request.patch('/api/auth/lawyer-verification', {
      headers,
      data: { status: 'active' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('Tier 4 — تكامل multipart (File Tampering)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('hash يوقَّع لملف A ويُرسل B → 403', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const fileA = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11]);
    const fileB = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x22]);
    const hashA = sha256Hex(fileA);
    const headers = await (await import('./helpers/wifeLiveSign')).wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ASSAULT_ORIGIN}/api/upload`,
      body: hashA,
      csrf,
    });
    headers['x-wife-content-hash'] = hashA;
    delete headers['content-type'];
    const res = await request.post('/api/upload', {
      headers,
      multipart: {
        file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: fileB },
        category: 'vault',
      },
    });
    expect(res.status()).toBe(403);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    expect(String(body.error ?? '')).toMatch(/Cryptographic|tamper|hash/i);
  });

  test('SVG polyglot JPEG header مرفوض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const polyglot = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      'utf8',
    );
    const res = await signedMultipartUpload(request, {
      csrf,
      fileBytes: polyglot,
      fileName: 'evil.jpg',
      mimeType: 'image/jpeg',
      category: 'vault',
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('double-encoded traversal على signed-url', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      path: `guest-lawyer-1/%252e%252e/${VICTIM_UUID}/vault/x.pdf`,
    });
    const res = await signedJsonPost(request, '/api/upload/signed-url', body, csrf);
    expect(res.status()).toBe(403);
  });
});

test.describe('Tier 5 — سلاسل بروتوكول متقدمة', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('CSRF صالح + توقيع على مسار مختلف في نفس الجلسة', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const signedForKv = JSON.stringify({ action: 'get', key: 'user:guest-lawyer-1:cases:1' });
    const headers = await (await import('./helpers/wifeLiveSign')).wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ASSAULT_ORIGIN}/api/kv-proxy`,
      body: signedForKv,
      csrf,
    });
    const res = await request.post('/api/admin/ban', {
      headers,
      data: { targetUserId: VICTIM_UUID, is_banned: true },
    });
    assertWall(res.status(), 'path swap with valid csrf');
  });

  test('wife-sign لا يوقّع admin/ban حتى مع كوكي ضيف', async ({ request }) => {
    const res = await request.post('/api/security/wife-sign', {
      headers: {
        origin: ASSAULT_ORIGIN,
        cookie: `hami_access_token=${WIFE_LIVE_GUEST_TOKEN}`,
        'content-type': 'application/json',
      },
      data: { method: 'POST', url: '/api/admin/ban', body: '{}' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('Content-Type JSON على multipart upload بدون hash صحيح', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const headers = await (await import('./helpers/wifeLiveSign')).wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ASSAULT_ORIGIN}/api/upload`,
      body: 'not-a-valid-hash',
      csrf,
    });
    const res = await request.post('/api/upload', {
      headers,
      data: { file: 'fake', category: 'vault' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('Tier 6 — مرونة بعد ضغط', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('healthz بعد سلسلة 15 POST موقّعة+CSRF', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    for (let i = 0; i < 15; i += 1) {
      const body = JSON.stringify({ action: 'get', key: `user:guest-lawyer-1:probe:${i}` });
      await signedJsonPost(request, '/api/kv-proxy', body, csrf);
    }
    expect((await request.get('/api/public/healthz')).status()).toBe(200);
  });
});
