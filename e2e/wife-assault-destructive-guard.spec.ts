/**
 * WIFE-008 — حراسة مسارات التدمير (بدون تنفيذ wipe/delete فعلي على بيانات حقيقية).
 * التأكيد الصحيح + توقيع = self-scoped أو رفض backend؛ لا IDOR عبر body.
 */
import { test, expect } from '@playwright/test';
import {
  apiHealthy,
  issueLiveCsrf,
  signedJsonPost,
  VICTIM_UUID,
  WIFE_LIVE_GUEST_TOKEN,
} from './helpers/wifeAssaultKit';

const SETTINGS_WIPE_CONFIRMATION = 'WIPE_ALL_APPLICATION_DATA_V1';
const ACCOUNT_DELETE_CONFIRMATION = 'DELETE_LAWYER_ACCOUNT_V1';

test.describe.configure({ timeout: 60_000 });

test.describe('WIFE-008 destructive guard (live, no real wipe)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('unsigned + تأكيد wipe صحيح → مرفوض', async ({ request }) => {
    const res = await request.post('/api/settings/wipe', {
      data: { confirmation: SETTINGS_WIPE_CONFIRMATION, version: 1, targetUserId: VICTIM_UUID },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
  });

  test('unsigned + تأكيد delete صحيح → مرفوض', async ({ request }) => {
    const res = await request.post('/api/account/delete', {
      data: { confirmation: ACCOUNT_DELETE_CONFIRMATION, version: 1, userId: VICTIM_UUID },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
  });

  test('موقّع ضيف + تأكيد wipe صحيح — self-scoped أو backend unavailable؛ لا IDOR', async ({
    request,
  }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      confirmation: SETTINGS_WIPE_CONFIRMATION,
      version: 1,
      targetUserId: VICTIM_UUID,
    });
    const res = await signedJsonPost(request, '/api/settings/wipe', body, csrf, WIFE_LIVE_GUEST_TOKEN);
    const status = res.status();
    const text = await res.text();
    expect(status).not.toBe(401);
    expect([200, 403, 500, 503]).toContain(status);
    expect(text).not.toContain(VICTIM_UUID);
    if (status === 200) {
      const parsed = JSON.parse(text) as { ok?: boolean };
      expect(parsed.ok).toBe(true);
    }
  });

  test('موقّع ضيف + تأكيد delete صحيح — لا admin self-delete bypass', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const body = JSON.stringify({
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
      version: 1,
      impersonateUserId: VICTIM_UUID,
    });
    const res = await signedJsonPost(request, '/api/account/delete', body, csrf, WIFE_LIVE_GUEST_TOKEN);
    expect([400, 403, 503, 500]).toContain(res.status());
  });
});
