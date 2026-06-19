/**
 * WIFE E2E smoke — يثبت أن المتصفح الحي يوقّع /api/* (wifeFetchGuard + SecureAPIClient).
 * Vitest alone cannot prove this; server may return 401/403 with fake token — we assert outbound headers.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
  assertWifeSignedRequest,
  installApiRequestCapture,
  seedWifeE2eSession,
  waitForApiCapture,
} from './helpers/wifeApiCapture';

test.describe('WIFE API smoke — browser signing', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
  });

  test('wifeFetchGuard signs bare fetch() to protected /api route', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await page.waitForFunction(
      () => {
        const sym = Symbol.for('WIFE_FETCH_GUARD_INSTALLED');
        return (globalThis as Record<symbol, unknown>)[sym] === true;
      },
      { timeout: 20_000 },
    );

    await page.evaluate(async () => {
      await fetch('/api/forum/status', { method: 'GET', credentials: 'same-origin' });
    });

    const hit = await waitForApiCapture(captures, (c) => c.url.includes('/api/forum/status'));
    assertWifeSignedRequest(hit);
  });

  test('app boot attempts signed CSRF bootstrap when session exists', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);

    const csrfHit = await waitForApiCapture(
      captures,
      (c) => c.url.includes('/api/security/csrf'),
      25_000,
    ).catch(() => null);

    if (csrfHit) {
      assertWifeSignedRequest(csrfHit);
      return;
    }

    // Fallback: any protected /api call during boot must still be signed
    const anySigned = captures.filter((c) => {
      try {
        assertWifeSignedRequest(c);
        return true;
      } catch {
        return false;
      }
    });
    expect(
      anySigned.length,
      'expected at least one WIFE-signed /api request after boot (csrf or forum)',
    ).toBeGreaterThan(0);
  });

  test('opening legal forum triggers signed GET /api/forum/posts', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);

    await page.getByRole('button', { name: /المنتدى القانوني/i }).click({ timeout: 15_000 });

    const postsHit = await waitForApiCapture(
      captures,
      (c) => c.method === 'GET' && c.url.includes('/api/forum/posts'),
      30_000,
    );
    assertWifeSignedRequest(postsHit);
  });
});
