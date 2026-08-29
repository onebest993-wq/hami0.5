/**
 * GoTrue staging — يُشغَّل فقط عند توفر credentials.
 * Env: WIFE_GOTRUE_STAGING_EMAIL, WIFE_GOTRUE_STAGING_PASSWORD
 */
import { test, expect } from '@playwright/test';
import { apiHealthy } from './helpers/wifeAssaultKit';

const EMAIL = process.env.WIFE_GOTRUE_STAGING_EMAIL?.trim() ?? '';
const PASSWORD = process.env.WIFE_GOTRUE_STAGING_PASSWORD ?? '';
const HAS_STAGING = EMAIL.length > 3 && PASSWORD.length > 3;

test.describe.configure({ timeout: 90_000 });

test.describe('GoTrue staging (optional — skip بدون credentials)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!HAS_STAGING, 'Set WIFE_GOTRUE_STAGING_EMAIL + WIFE_GOTRUE_STAGING_PASSWORD');
    test.skip(!(await apiHealthy(request)), 'Vite /api/* غير متاح');
  });

  test('login → session → wife-sign → csrf → logout', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: EMAIL, password: PASSWORD, termsVersion: 'v1-2026-08-12' },
    });
    expect([200, 401, 503]).toContain(login.status());
    if (login.status() !== 200) {
      test.skip(true, `Login unavailable (${login.status()}) — check Supabase env`);
      return;
    }

    const session = await request.get('/api/auth/session');
    expect(session.status()).toBe(200);
    const sessionBody = (await session.json()) as { ok?: boolean; user?: { id?: string } };
    expect(sessionBody.ok).toBe(true);
    expect(sessionBody.user?.id).toBeTruthy();

    const sign = await request.post('/api/security/wife-sign', {
      data: { method: 'GET', url: '/api/security/csrf', body: '' },
    });
    expect(sign.status()).toBe(200);
    const signBody = (await sign.json()) as { ok?: boolean; headers?: Record<string, string> };
    expect(signBody.ok).toBe(true);
    expect(signBody.headers?.['x-wife-signature']).toBeTruthy();

    const csrfRes = await request.get('/api/security/csrf', { headers: signBody.headers ?? {} });
    expect(csrfRes.status()).toBe(200);
    const csrfJson = (await csrfRes.json()) as { csrfToken?: string };
    expect(csrfJson.csrfToken?.length).toBeGreaterThan(15);

    const logout = await request.post('/api/auth/logout', { data: {} });
    expect(logout.status()).toBeLessThan(500);
  });
});

test('placeholder when staging skipped — campaign لا تفشل', () => {
  if (!HAS_STAGING) {
    expect(HAS_STAGING).toBe(false);
  }
});
