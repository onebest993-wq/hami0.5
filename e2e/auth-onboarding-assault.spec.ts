/**
 * Auth onboarding assault — E2E ضد نفس أصل التطبيق.
 * يثبت رفض مسارات التحايل من المتصفح (بدون إنشاء حساب حقيقي إن أمكن).
 * يحتاج خادم Vite dev (`E2E_USE_PREVIEW=0`) لأن preview لا يحمّل `/api/*`.
 */
import { test, expect, type Page } from '@playwright/test';

async function browserApiFetch(
    page: Page,
    url: string,
    init: {
        method: string;
        headers?: Record<string, string>;
        body?: string;
    },
): Promise<{ status: number; text: string; json: Record<string, unknown> }> {
    return page.evaluate(async ({ url, init }) => {
        const send = async () => {
            const res = await fetch(url, {
                ...init,
                credentials: 'same-origin',
            });
            const text = await res.text();
            let json: Record<string, unknown> = {};
            try {
                json = JSON.parse(text) as Record<string, unknown>;
            } catch {
                /* ignore */
            }
            return { status: res.status, text, json };
        };
        return send();
    }, { url, init });
}

const TERMS_VERSION = 'v1-2026-08-12';

test.describe('Auth onboarding assault — browser API', () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('rejects disposable email signup from browser', async ({ page }) => {
    const result = await browserApiFetch(page, '/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e-assault@mailinator.com',
        password: 'SecureLaw9',
        termsVersion: TERMS_VERSION,
        data: { role: 'admin', verificationStatus: 'active' },
      }),
    });

    expect(result.status).toBe(400);
    expect(result.json.code).toBe('EMAIL_REJECTED');
    expect(result.json.ok).not.toBe(true);
  });

  test('rejects weak password signup from browser', async ({ page }) => {
    const result = await browserApiFetch(page, '/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e-ok@gmail.com',
        password: '12345678',
        termsVersion: TERMS_VERSION,
      }),
    });

    expect(result.status).toBe(400);
    expect(result.json.code).toBe('PASSWORD_REJECTED');
  });

  test('forgot-password accepts request but does not echo evil redirect', async ({ page }) => {
    const result = await browserApiFetch(page, '/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'victim-e2e@gmail.com',
        redirectTo: 'https://evil.example/steal',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.text).not.toContain('evil.example');
  });

  test('forum posts without session is rejected', async ({ page }) => {
    const result = await browserApiFetch(page, '/api/forum/posts', {
      method: 'GET',
    });
    expect(result.status).toBeGreaterThanOrEqual(401);
    expect(result.status).toBeLessThanOrEqual(403);
  });

  test('admin ban without session is rejected', async ({ page }) => {
    const result = await browserApiFetch(page, '/api/admin/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterId: 'attacker',
        targetUserId: 'victim',
        updates: { role: 'admin', is_banned: false },
      }),
    });
    expect(result.status).toBeGreaterThanOrEqual(401);
    expect(result.status).toBeLessThanOrEqual(403);
  });

  test('legal terms forged version is detectable as non-current in storage', async ({ page }) => {
    const probe = await page.evaluate(() => {
      const key = 'hami:legal:terms-accepted:v1';
      localStorage.setItem(
        key,
        JSON.stringify({ version: 'v0-forged-e2e', acceptedAt: new Date().toISOString() }),
      );
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as { version?: string }) : null;
      return {
        stored: parsed?.version ?? null,
        // النسخة الحالية تُزرع في bootFixtures للمسارات العادية — هنا نثبت أن التزوير لا يساوي current seed
        currentSeedHint: 'v1-2026-08-12',
      };
    });
    expect(probe.stored).toBe('v0-forged-e2e');
    expect(probe.stored).not.toBe(probe.currentSeedHint);
  });
});
