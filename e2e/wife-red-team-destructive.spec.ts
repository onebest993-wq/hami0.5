/**
 * WIFE Red Team E2E — محاكاة هجمات من المتصفح (unsigned fetch flood).
 * يثبت أن الخادم يرفض الطلبات غير الموقّعة حتى لو أُرسلت من سياق الجلسة.
 */
import { test, expect } from '@playwright/test';
import { seedWifeE2eSession } from './helpers/wifeApiCapture';

const UNSIGNED_TARGETS = [
  { method: 'POST' as const, path: '/api/laws/list', body: { law_name: 'probe' } },
  { method: 'POST' as const, path: '/api/kv-proxy', body: { action: 'get', key: 'user:other:cases:1' } },
  { method: 'POST' as const, path: '/api/forum/delete', body: { postId: 'pwn' } },
  { method: 'POST' as const, path: '/api/upload/remove', body: { paths: ['other/vault/x.pdf'] } },
  { method: 'POST' as const, path: '/api/admin/ban', body: { requesterId: 'x', targetUserId: 'y' } },
  { method: 'POST' as const, path: '/api/timeline-events', body: { executionFileId: 'x', event: { id: '1', title: 't' } } },
  { method: 'GET' as const, path: '/api/forum/posts', body: null },
  { method: 'GET' as const, path: '/api/timeline-events?executionFileId=exec-1', body: null },
  { method: 'POST' as const, path: '/api/audit/log', body: { action: 'FORGED' } },
  { method: 'POST' as const, path: '/api/comms-dispatcher', body: { to: '07900000000', message: 'spam', channel: 'sms' } },
];

test.describe('WIFE red team — browser unsigned API flood', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
    await page.goto('/');
  });

  for (const target of UNSIGNED_TARGETS) {
    test(`unsigned ${target.method} ${target.path} is rejected`, async ({ page }) => {
      const result = await page.evaluate(
        async ({ method, path, body }) => {
          const res = await fetch(path, {
            method,
            credentials: 'same-origin',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          });
          let json: Record<string, unknown> = {};
          try {
            json = (await res.json()) as Record<string, unknown>;
          } catch {
            /* non-json */
          }
          return { status: res.status, json };
        },
        { method: target.method, path: target.path, body: target.body },
      );

      expect(
        result.status,
        `${target.method} ${target.path} must not succeed unsigned`,
      ).toBeGreaterThanOrEqual(401);
      expect(result.status).toBeLessThanOrEqual(403);
    });
  }

  test('tampered fetch body after wifeFetchGuard bypass attempt (manual unsigned)', async ({ page }) => {
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/forum/report', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-wife-signature': 'fake-signature-aaaaaaaaaaaaaaaa',
          'x-wife-timestamp': String(Date.now()),
          'x-wife-nonce': 'fake-nonce-12345678',
          'x-csrf-token': 'fake-csrf-token',
        },
        body: JSON.stringify({ postId: 'x', reason: '<script>alert(1)</script>' }),
      });
      return res.status;
    });
    expect(status).toBeGreaterThanOrEqual(401);
    expect(status).toBeLessThanOrEqual(403);
  });
});
