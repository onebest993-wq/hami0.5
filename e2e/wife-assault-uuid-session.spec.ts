/**
 * WIFE-007 — surrogate UUID lawyer session (dev-access-token-{uuid}) on live BFF.
 * يختبر مسارات Postgres-scoped بعد NON_UUID guard — لا يتطلب GoTrue حقيقي.
 */
import { test, expect } from '@playwright/test';
import {
  apiHealthy,
  issueLiveCsrf,
  signedJsonGet,
  signedJsonPost,
  WIFE_LIVE_GUEST_TOKEN,
  WIFE_LIVE_LAWYER_UUID,
  WIFE_LIVE_UUID_TOKEN,
} from './helpers/wifeAssaultKit';

test.describe.configure({ timeout: 90_000 });

test.describe('UUID surrogate session — Postgres-scoped BFF', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('CSRF bootstrap يعمل بتوكن UUID dev', async ({ request }) => {
    const csrf = await issueLiveCsrf(request, WIFE_LIVE_UUID_TOKEN);
    expect(csrf.length).toBeGreaterThanOrEqual(16);
  });

  test('cloud-sync POST لا يُرفض بـ NON_UUID (503/200/500 مقبول — ليس 403 UUID gate)', async ({
    request,
  }) => {
    const csrf = await issueLiveCsrf(request, WIFE_LIVE_UUID_TOKEN);
    const body = JSON.stringify({
      user_key: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      app_data: { lawyer_settings: { uuidProbe: true }, syncedAt: Date.now() },
    });
    const res = await signedJsonPost(
      request,
      '/api/settings/cloud-sync',
      body,
      csrf,
      WIFE_LIVE_UUID_TOKEN,
    );
    expect(res.status()).not.toBe(403);
    const parsed = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
    expect(parsed.code).not.toBe('NON_UUID_SUBJECT');
    expect(res.status()).toBeLessThan(600);
  });

  test('cloud-sync GET يمر UUID gate (Postgres أو 503 — ليس empty guest)', async ({ request }) => {
    const res = await signedJsonGet(request, '/api/settings/cloud-sync', WIFE_LIVE_UUID_TOKEN);
    expect(res.status()).not.toBe(403);
    const parsed = (await res.json().catch(() => ({}))) as {
      code?: string;
      ok?: boolean;
      app_data?: unknown;
    };
    expect(parsed.code).not.toBe('NON_UUID_SUBJECT');
    if (res.status() === 200) {
      expect(parsed.ok).toBe(true);
    } else {
      expect([500, 503]).toContain(res.status());
    }
  });

  test('timeline-events POST لا يُرفض بـ NON_UUID', async ({ request }) => {
    const csrf = await issueLiveCsrf(request, WIFE_LIVE_UUID_TOKEN);
    const body = JSON.stringify({
      executionFileId: 'uuid-probe-exec-1',
      event: { id: 'ev-probe-1', title: 'uuid session probe' },
    });
    const res = await signedJsonPost(
      request,
      '/api/timeline-events',
      body,
      csrf,
      WIFE_LIVE_UUID_TOKEN,
    );
    expect(res.status()).not.toBe(403);
    const parsed = (await res.json().catch(() => ({}))) as { code?: string };
    expect(parsed.code).not.toBe('NON_UUID_SUBJECT');
  });

  test('global-notes list يمر UUID gate (200 أو 500/503 — ليس NON_UUID)', async ({ request }) => {
    const res = await signedJsonGet(request, '/api/global-notes/list', WIFE_LIVE_UUID_TOKEN);
    expect(res.status()).not.toBe(403);
    const parsed = (await res.json().catch(() => ({}))) as {
      code?: string;
      ok?: boolean;
      rows?: unknown[];
    };
    expect(parsed.code).not.toBe('NON_UUID_SUBJECT');
    if (res.status() === 200) {
      expect(parsed.ok).toBe(true);
      expect(Array.isArray(parsed.rows)).toBe(true);
    } else {
      expect([500, 503]).toContain(res.status());
    }
  });

  test('تباين: الضيف guest-lawyer-1 ما زال مرفوضاً على cloud-sync POST', async ({ request }) => {
    const csrf = await issueLiveCsrf(request, WIFE_LIVE_GUEST_TOKEN);
    const body = JSON.stringify({ app_data: { lawyer_settings: { guest: true } } });
    const res = await signedJsonPost(
      request,
      '/api/settings/cloud-sync',
      body,
      csrf,
      WIFE_LIVE_GUEST_TOKEN,
    );
    expect(res.status()).toBe(403);
    const parsed = (await res.json()) as { code?: string };
    expect(parsed.code).toBe('NON_UUID_SUBJECT');
  });

  test('subject UUID في التوقيع ≠ user_key مزوّر في body', async ({ request }) => {
    void WIFE_LIVE_LAWYER_UUID;
    const csrf = await issueLiveCsrf(request, WIFE_LIVE_UUID_TOKEN);
    const body = JSON.stringify({
      user_key: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      app_data: { lawyer_settings: { forged: true } },
    });
    const res = await signedJsonPost(
      request,
      '/api/settings/cloud-sync',
      body,
      csrf,
      WIFE_LIVE_UUID_TOKEN,
    );
    if (res.status() === 200) {
      const parsed = (await res.json()) as { user_key?: string };
      expect(parsed.user_key).toBe(WIFE_LIVE_LAWYER_UUID);
    } else {
      expect(res.status()).not.toBe(403);
    }
  });
});
