/**
 * ULTIMATE WIFE Red Team — أقصى محاكاة دفاعية حيّة.
 * 89+ مسار محمي من الكتالوج + بروتوكول + تصعيد + عواصف + IDOR.
 * الرفض = نجاح. لا wipe/delete صحيح، لا SMS حقيقي، لا DDoS خارجي.
 */
import { test, expect } from '@playwright/test';
import {
  ASSAULT_ORIGIN,
  apiHealthy,
  issueLiveCsrf,
  signedJsonGet,
  signedJsonPost,
  VICTIM_UUID,
  WIFE_LIVE_GUEST_TOKEN,
  WIFE_LIVE_UUID_TOKEN,
} from './helpers/wifeAssaultKit';
import { wifeLiveAuthHeaders, WIFE_LIVE_DEVICE_ID } from './helpers/wifeLiveSign';
import {
  CATALOG_GENERATED,
  ESCALATION_POSTS,
  hitRoute,
  KV_ESCALATION_PAYLOADS,
  PROTECTED_CATALOG,
  signedPostRaw,
  TRAVERSAL_PATHS,
  wallOk,
} from './helpers/wifeUltimateAssault';

test.describe.configure({ timeout: 180_000 });

test.describe('ULTIMATE T0 — كتالوج كامل (89+ hit)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test(`catalog ${PROTECTED_CATALOG.length} protected hits — generated ${CATALOG_GENERATED}`, async ({
    request,
  }) => {
    expect(PROTECTED_CATALOG.length).toBeGreaterThanOrEqual(85);
    const failures: string[] = [];
    for (const hit of PROTECTED_CATALOG) {
      const res = await hitRoute(request, hit);
      const status = res.status();
      if (status >= 200 && status < 400) {
        failures.push(`LEAK ${hit.method} ${hit.path} → ${status}`);
      } else if (status >= 500) {
        failures.push(`CRASH ${hit.method} ${hit.path} → ${status}`);
      } else if (!wallOk(status)) {
        failures.push(`WEIRD ${hit.method} ${hit.path} → ${status}`);
      }
    }
    expect(failures, failures.slice(0, 20).join('\n')).toEqual([]);
  });
});

test.describe('ULTIMATE T1 — بروتوكول WIFE (20+ vector)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('replay: نفس nonce مرتين → الثانية مرفوضة', async ({ request }) => {
    const ts = String(Date.now());
    const nonce = `replay_${Date.now().toString(36)}`;
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ASSAULT_ORIGIN}/api/security/csrf`,
      token: WIFE_LIVE_GUEST_TOKEN,
      timestamp: ts,
      nonce,
    });
    const first = await request.get('/api/security/csrf', { headers });
    expect(first.status()).toBe(200);
    const second = await request.get('/api/security/csrf', { headers });
    expect(second.status()).toBeGreaterThanOrEqual(401);
    expect(second.status()).toBeLessThanOrEqual(403);
  });

  test('timestamp قديم >120s مرفوض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ASSAULT_ORIGIN}/api/security/csrf`,
      timestamp: String(Date.now() - 130_000),
      nonce: `stale_${Date.now().toString(36)}`,
    });
    const res = await request.get('/api/security/csrf', { headers });
    expect(wallOk(res.status())).toBe(true);
  });

  test('timestamp مستقبلي >120s مرفوض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ASSAULT_ORIGIN}/api/security/csrf`,
      timestamp: String(Date.now() + 130_000),
      nonce: `future_${Date.now().toString(36)}`,
    });
    const res = await request.get('/api/security/csrf', { headers });
    expect(wallOk(res.status())).toBe(true);
  });

  test('cross-token: توقيع UUID + Bearer ضيف مرفوض', async ({ request }) => {
    const body = JSON.stringify({ action: 'get', key: 'user:guest-lawyer-1:cases:1' });
    const csrf = await issueLiveCsrf(request, WIFE_LIVE_UUID_TOKEN);
    const headers = await wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ASSAULT_ORIGIN}/api/kv-proxy`,
      body,
      csrf,
      token: WIFE_LIVE_UUID_TOKEN,
    });
    headers.authorization = `Bearer ${WIFE_LIVE_GUEST_TOKEN}`;
    const res = await request.post('/api/kv-proxy', { headers, data: body });
    expect(wallOk(res.status())).toBe(true);
  });

  test('path swap: توقيع kv-proxy تنفيذ على admin/ban', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const kvBody = JSON.stringify({ action: 'get', key: 'user:guest-lawyer-1:probe:1' });
    const headers = await wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ASSAULT_ORIGIN}/api/kv-proxy`,
      body: kvBody,
      csrf,
    });
    const res = await request.post('/api/admin/ban', {
      headers,
      data: { targetUserId: VICTIM_UUID, is_banned: true },
    });
    expect(wallOk(res.status())).toBe(true);
  });

  test('method swap: GET موقّع → POST csrf', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ASSAULT_ORIGIN}/api/security/csrf`,
    });
    const res = await request.post('/api/security/csrf', {
      headers,
      data: { injected: true },
    });
    expect(wallOk(res.status())).toBe(true);
  });

  test('body tamper بعد التوقيع مرفوض', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const safe = JSON.stringify({ action: 'get', key: 'user:guest-lawyer-1:probe:1' });
    const headers = await wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ASSAULT_ORIGIN}/api/kv-proxy`,
      body: safe,
      csrf,
    });
    const malicious = JSON.stringify({
      action: 'set',
      key: `user:${VICTIM_UUID}:cases:1`,
      value: { pwn: true },
    });
    const res = await request.post('/api/kv-proxy', { headers, data: malicious });
    expect(wallOk(res.status())).toBe(true);
  });

  test('توقيع فارغ / base64 خاطئ مرفوض', async ({ request }) => {
    const res = await request.get('/api/security/csrf', {
      headers: {
        authorization: `Bearer ${WIFE_LIVE_GUEST_TOKEN}`,
        'x-wife-signature': 'not-valid-base64url!!',
        'x-wife-timestamp': String(Date.now()),
        'x-wife-nonce': `bad_sig_${Date.now().toString(36)}`,
        'x-wife-device-id': WIFE_LIVE_DEVICE_ID,
      },
    });
    expect(wallOk(res.status())).toBe(true);
  });

  test('device-id قصير/فارغ مرفوض على POST', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({ action: 'get', key: 'user:guest-lawyer-1:probe:1' });
    const headers = await wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ASSAULT_ORIGIN}/api/kv-proxy`,
      body,
      csrf,
    });
    headers['x-wife-device-id'] = 'abc';
    const res = await request.post('/api/kv-proxy', { headers, data: body });
    expect(wallOk(res.status())).toBe(true);
  });

  test('Bearer ≠ cookie hami_access_token مرفوض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ASSAULT_ORIGIN}/api/security/csrf`,
      token: WIFE_LIVE_GUEST_TOKEN,
    });
    headers.cookie = `hami_access_token=${WIFE_LIVE_UUID_TOKEN}`;
    const res = await request.get('/api/security/csrf', { headers });
    expect(wallOk(res.status())).toBe(true);
  });

  test('CSRF ضيف على POST UUID token مرفوض', async ({ request }) => {
    const guestCsrf = await issueLiveCsrf(request, WIFE_LIVE_GUEST_TOKEN);
    const body = JSON.stringify({ app_data: { probe: true } });
    const res = await signedJsonPost(
      request,
      '/api/settings/cloud-sync',
      body,
      guestCsrf,
      WIFE_LIVE_UUID_TOKEN,
    );
    expect(wallOk(res.status())).toBe(true);
  });

  for (const path of [
    '/api/public/healthz/../admin/ban',
    '/api/kv-proxy%2f..%2fadmin/ban',
    '/api/admin%2fban',
    '/api/forum/status/..%2f..%2fadmin/ban',
  ]) {
    test(`path normalization: ${path}`, async ({ request }) => {
      const res = await request.post(path, { data: { targetUserId: VICTIM_UUID } });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    });
  }
});

test.describe('ULTIMATE T2 — تصعيد موقّع (ضيف + UUID)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('مصفوفة تصعيد ضيف — لا 200 على مسارات حساسة', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const failures: string[] = [];
    for (const shot of ESCALATION_POSTS) {
      const res = await signedPostRaw(request, shot.path, JSON.stringify(shot.body), csrf, WIFE_LIVE_GUEST_TOKEN);
      const status = res.status();
      if ((status === 200 || status === 201) && !shot.allow.includes(status)) {
        failures.push(`${shot.path} succeeded ${status}`);
      } else if (!shot.allow.includes(status)) {
        failures.push(`${shot.path} got ${status} want ${shot.allow.join('|')}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('مصفوفة KV محظورة — كلها 403', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    for (const payload of KV_ESCALATION_PAYLOADS) {
      const res = await signedPostRaw(
        request,
        '/api/kv-proxy',
        JSON.stringify(payload),
        csrf,
        WIFE_LIVE_GUEST_TOKEN,
      );
      expect(res.status(), JSON.stringify(payload)).toBe(403);
    }
  });

  test('مصفوفة traversal على signed-url/remove', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    for (const path of TRAVERSAL_PATHS) {
      const urlRes = await signedPostRaw(
        request,
        '/api/upload/signed-url',
        JSON.stringify({ path }),
        csrf,
        WIFE_LIVE_GUEST_TOKEN,
      );
      expect(urlRes.status(), path).toBe(403);
      const rmRes = await signedPostRaw(
        request,
        '/api/upload/remove',
        JSON.stringify({ paths: [path] }),
        csrf,
        WIFE_LIVE_GUEST_TOKEN,
      );
      expect(rmRes.status(), path).toBe(403);
    }
  });

  test('prototype pollution POST على audit/log', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      action: 'PROBE',
      details: { __proto__: { admin: true }, constructor: { prototype: { admin: true } } },
    });
    const res = await signedPostRaw(request, '/api/audit/log', body, csrf, WIFE_LIVE_GUEST_TOKEN);
    expect(res.status()).toBeLessThan(500);
    const parsed = (await res.json().catch(() => ({}))) as { isAdmin?: boolean };
    expect(parsed.isAdmin).toBeUndefined();
  });
});

test.describe('ULTIMATE T3 — auth storms', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('login 45 محاولة من IP واحد → 429', async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 45; i += 1) {
      const res = await request.post('/api/auth/login', {
        headers: { 'x-forwarded-for': '198.51.100.99' },
        data: { email: `brute${i}@example.invalid`, password: 'WrongPass-123!' },
      });
      statuses.push(res.status());
    }
    expect(statuses.some((s) => s === 429)).toBe(true);
    expect(statuses.every((s) => s < 500)).toBe(true);
  });

  test('signup + forgot عاصفة من IP واحد لا 5xx', async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 16; i += 1) {
      statuses.push(
        (
          await request.post('/api/auth/signup', {
            headers: { 'x-forwarded-for': '198.51.100.100' },
            data: { email: `storm${i}@example.invalid`, password: 'Short1!' },
          })
        ).status(),
      );
    }
    for (let i = 0; i < 12; i += 1) {
      statuses.push(
        (
          await request.post('/api/auth/forgot-password', {
            headers: { 'x-forwarded-for': '198.51.100.100' },
            data: {
              email: `forgot${i}@example.invalid`,
              redirectTo: 'https://evil.example/phish',
            },
          })
        ).status(),
      );
    }
    expect(statuses.every((s) => s < 500)).toBe(true);
    expect(statuses.some((s) => s === 429)).toBe(true);
  });
});

test.describe('ULTIMATE T4 — عواصف متوازية', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('100 POST غير موقّع متوازي — لا breach', async ({ request }) => {
    const targets = PROTECTED_CATALOG.filter((h) => h.method === 'POST').slice(0, 12);
    const jobs = Array.from({ length: 100 }, (_, i) => hitRoute(request, targets[i % targets.length]));
    const results = await Promise.all(jobs);
    for (const res of results) {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
    expect((await request.get('/api/public/healthz')).status()).toBe(200);
  });

  test('30 توقيع csrf متوازي ثم healthz', async ({ request }) => {
    const jobs = await Promise.all(
      Array.from({ length: 30 }, async () => {
        const headers = await wifeLiveAuthHeaders({
          method: 'GET',
          url: `${ASSAULT_ORIGIN}/api/security/csrf`,
        });
        return request.get('/api/security/csrf', { headers });
      }),
    );
    for (const res of jobs) {
      expect(res.status()).toBe(200);
    }
    expect((await request.get('/api/public/healthz')).status()).toBe(200);
  });
});
