/**
 * WIFE Red Team — طلبات Node بلا حارس المتصفح.
 * page.evaluate(fetch) يمر من wifeFetchGuard فيُوقَّع أو يُحجب بـ api_unavailable
 * عندما VITE_SHELL_AUTH_OPEN=true. الرفض الحقيقي يُقاس من خارج الصفحة.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const UNSIGNED_TARGETS = [
  { method: 'POST' as const, path: '/api/laws/list', body: { law_name: 'probe' } },
  { method: 'POST' as const, path: '/api/kv-proxy', body: { action: 'get', key: 'user:other:cases:1' } },
  { method: 'POST' as const, path: '/api/forum/delete', body: { postId: 'pwn' } },
  { method: 'POST' as const, path: '/api/upload/remove', body: { paths: ['other/vault/x.pdf'] } },
  { method: 'POST' as const, path: '/api/admin/ban', body: { requesterId: 'x', targetUserId: 'y' } },
  { method: 'GET' as const, path: '/api/admin/users', body: null },
  { method: 'POST' as const, path: '/api/admin/role', body: { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', role: 'admin' } },
  { method: 'GET' as const, path: '/api/admin/stats', body: null },
  { method: 'GET' as const, path: '/api/admin/status', body: null },
  { method: 'GET' as const, path: '/api/admin/audit', body: null },
  { method: 'GET' as const, path: '/api/admin/devices', body: null },
  { method: 'GET' as const, path: '/api/admin/consultations', body: null },
  { method: 'POST' as const, path: '/api/admin/consultations', body: { postId: 'p1' } },
  { method: 'POST' as const, path: '/api/timeline-events', body: { executionFileId: 'x', event: { id: '1', title: 't' } } },
  { method: 'GET' as const, path: '/api/forum/posts', body: null },
  { method: 'GET' as const, path: '/api/timeline-events?executionFileId=exec-1', body: null },
  { method: 'POST' as const, path: '/api/audit/log', body: { action: 'FORGED' } },
];

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

test.describe('WIFE red team — unsigned API flood from outside the page', () => {
  test.describe.configure({ timeout: 30_000 });

  test.beforeEach(async ({ request }) => {
    test.skip(
      !(await devApiAvailable(request)),
      'Vite /api/* غير متاح (غالباً preview). شغّل E2E_USE_PREVIEW=0 مع npm run dev',
    );
  });

  for (const target of UNSIGNED_TARGETS) {
    test(`unsigned ${target.method} ${target.path} is rejected`, async ({ request }) => {
      const res =
        target.method === 'GET'
          ? await request.get(target.path)
          : await request.post(target.path, { data: target.body ?? {} });

      expect(res.status(), `${target.method} ${target.path} must not succeed unsigned`).toBeGreaterThanOrEqual(401);
      expect(res.status()).toBeLessThanOrEqual(403);
      const type = res.headers()['content-type'] ?? '';
      expect(type).toContain('json');
    });
  }

  test('forged WIFE headers are rejected by the live server', async ({ request }) => {
    const res = await request.post('/api/forum/report', {
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer e2e-wife-smoke-access-token-with-length-ok',
        'x-wife-signature': 'fake-signature-aaaaaaaaaaaaaaaa',
        'x-wife-timestamp': String(Date.now()),
        'x-wife-nonce': 'fake-nonce-12345678',
        'x-csrf-token': 'fake-csrf-token-value',
        'x-wife-device-id': '0123456789abcdef0123456789abcdef',
      },
      data: { postId: 'x', reason: '<script>alert(1)</script>' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });
});
