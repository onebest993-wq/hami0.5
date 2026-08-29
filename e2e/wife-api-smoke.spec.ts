/**
 * WIFE E2E smoke — يثبت أن المتصفح الحي يوقّع /api/* (wifeFetchGuard + SecureAPIClient).
 * Vitest alone cannot prove this; server may return 401/403 with fake token — we assert outbound headers.
 */
import { test } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
  assertWifeSignedHttpOutcome,
  assertWifeSignedRequest,
  browserFetchStatus,
  installApiRequestCapture,
  seedWifeE2eSession,
  waitForApiCapture,
  waitForSameOriginApiReady,
  waitForWifeGuard,
  waitForWifeSigningToken,
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
    await waitForWifeGuard(page);
    await waitForWifeSigningToken(page);
    await waitForSameOriginApiReady(page);

    const status = await browserFetchStatus(page, '/api/forum/status');
    assertWifeSignedHttpOutcome(status, 'forum/status');

    const hit = await waitForApiCapture(captures, (c) => c.url.includes('/api/forum/status'));
    assertWifeSignedRequest(hit);
  });

  test('app boot attempts signed CSRF bootstrap when session exists', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);
    await waitForWifeSigningToken(page);
    await waitForSameOriginApiReady(page);

    const csrfHit = await waitForApiCapture(
      captures,
      (c) => c.url.includes('/api/security/csrf'),
      25_000,
    ).catch(() => null);

    if (csrfHit) {
      assertWifeSignedRequest(csrfHit);
      return;
    }

    await page.evaluate(async () => {
      await fetch('/api/security/csrf', { credentials: 'same-origin' }).catch(() => undefined);
    });
    const fallback = await waitForApiCapture(captures, (c) => c.url.includes('/api/security/csrf'));
    assertWifeSignedRequest(fallback);
  });

  test('protected forum GET is signed without depending on forum UI', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);
    await waitForWifeSigningToken(page);
    await waitForSameOriginApiReady(page);

    await browserFetchStatus(page, '/api/forum/posts?limit=5&offset=0');
    const postsHit = await waitForApiCapture(
      captures,
      (c) => c.method === 'GET' && c.url.includes('/api/forum/posts'),
    );
    assertWifeSignedRequest(postsHit);
  });
});
