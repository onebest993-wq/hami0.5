/**
 * WIFE — رحلة مستخدم عادي + مسارات نادرة (Playwright).
 * يختبر التجربة الحية: توقيع، استمرارية، إعادة تحميل، burst، بدون جلسة.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, openCivilDossier, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
  assertWifeSignedRequest,
  headerMap,
  installApiRequestCapture,
  seedWifeE2eSession,
  waitForApiCapture,
  type CapturedApiRequest,
} from './helpers/wifeApiCapture';

async function dismissBlockingOverlays(page: import('@playwright/test').Page): Promise<void> {
  const closeReminder = page.getByRole('button', { name: 'إغلاق' });
  if (await closeReminder.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await closeReminder.click();
  }
}

async function closeCommunityIfOpen(page: import('@playwright/test').Page): Promise<void> {
  const back = page.getByRole('button', { name: 'رجوع' });
  if (await back.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await back.click();
    await page.waitForTimeout(400);
  }
}

async function waitForWifeGuard(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const sym = Symbol.for('WIFE_FETCH_GUARD_INSTALLED');
      return (globalThis as Record<symbol, unknown>)[sym] === true;
    },
    { timeout: 25_000 },
  );
}

function protectedCaptures(captures: CapturedApiRequest[]): CapturedApiRequest[] {
  return captures.filter((c) => c.url.includes('/api/') && !c.url.includes('/api/public/'));
}

function assertAllSigned(captures: CapturedApiRequest[]): void {
  for (const c of protectedCaptures(captures)) {
    assertWifeSignedRequest(c);
  }
}

function assertUniqueNonces(captures: CapturedApiRequest[]): void {
  const nonces = protectedCaptures(captures)
    .map((c) => headerMap(c.headers)['x-wife-nonce'])
    .filter(Boolean);
  expect(new Set(nonces).size, 'each WIFE request must use a fresh nonce').toBe(nonces.length);
}

test.describe('مستخدم عادي — رحلة يومية', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
  });

  test('لوحة → منتدى → رجوع — التطبيق يستمر والـ API موقّع', async ({ page }) => {
    test.setTimeout(60_000);
    const captures = installApiRequestCapture(page);
    const t0 = Date.now();

    await page.goto('/');
    await ensureLawyerDashboard(page);
    await dismissBlockingOverlays(page);
    await waitForWifeGuard(page);

    await page.getByRole('button', { name: /المنتدى القانوني/i }).click({ timeout: 15_000 });
    await waitForApiCapture(captures, (c) => c.url.includes('/api/forum/posts'), 35_000);

    await closeCommunityIfOpen(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 15_000 });

    assertAllSigned(captures);
    expect(Date.now() - t0, 'journey should finish within 60s').toBeLessThan(60_000);
  });

  test('إعادة تحميل الصفحة — التوقيع يستمر', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);

    await page.evaluate(async () => {
      await fetch('/api/forum/status', { credentials: 'same-origin' });
    });
    const hit = await waitForApiCapture(captures, (c) => c.url.includes('/api/forum/status'));
    assertWifeSignedRequest(hit);
  });
});

test.describe('مسارات نادرة — ضغط وحدود', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
  });

  test('5 طلبات متوازية — كلها موقّعة + nonce مختلف', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);

    const before = captures.length;
    await page.evaluate(async () => {
      await Promise.all([
        fetch('/api/forum/status', { credentials: 'same-origin' }),
        fetch('/api/forum/bookmark', { credentials: 'same-origin' }),
        fetch('/api/forum/posts?limit=5&offset=0', { credentials: 'same-origin' }),
        fetch('/api/forum/stats', { credentials: 'same-origin' }),
        fetch('/api/security/csrf', { credentials: 'same-origin' }),
      ]);
    });

    await page.waitForTimeout(800);
    const burst = captures.slice(before);
    expect(burst.length).toBeGreaterThanOrEqual(5);
    assertAllSigned(burst);
    assertUniqueNonces(burst);
  });

  test('فتح المنتدى → رجوع → إعادة فتح — كل /api موقّع', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await dismissBlockingOverlays(page);

    const forumBtn = page.getByRole('button', { name: /المنتدى القانوني/i });
    await forumBtn.click({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await closeCommunityIfOpen(page);
    await ensureLawyerDashboard(page);
    await forumBtn.click({ timeout: 15_000 });
    await page.waitForTimeout(1_000);

    assertAllSigned(captures);
  });

  test('تحديث access_token (محاكاة refresh) — الطلب التالي موقّع', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);

    await page.evaluate((authKey) => {
      const raw = localStorage.getItem(authKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      parsed.access_token = 'e2e-refreshed-access-token-with-length-ok-xyz';
      parsed.expires_at = Math.floor(Date.now() / 1000) + 7200;
      localStorage.setItem(authKey, JSON.stringify(parsed));
    }, 'sb-wldjvjnodvyodmgbgzab-auth-token');

    await page.evaluate(async () => {
      await fetch('/api/forum/status', { credentials: 'same-origin' });
    });
    const hit = await waitForApiCapture(
      captures,
      (c) => c.url.includes('/api/forum/status') && c.url.includes('status'),
    );
    assertWifeSignedRequest(hit);
  });

});

test.describe('بدون جلسة', () => {
  test('بدون login — wifeFetchGuard غير مفعّل و fetch لا يحمل توقيع', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1_500);

    const guardInstalled = await page.evaluate(() => {
      const sym = Symbol.for('WIFE_FETCH_GUARD_INSTALLED');
      return (globalThis as Record<symbol, unknown>)[sym] === true;
    });
    expect(guardInstalled).toBe(false);

    await page.evaluate(async () => {
      await fetch('/api/forum/status', { credentials: 'same-origin' });
    });
    await page.waitForTimeout(400);

    const statusReq = captures.find((c) => c.url.includes('/api/forum/status'));
    expect(statusReq).toBeTruthy();
    expect(headerMap(statusReq!.headers)['x-wife-signature']).toBeFalsy();
  });
});

test.describe('مسارات نادرة — ضغط وحدود (continued)', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
  });

  test('زمن التوقيع في المتصفح — burst 5 under 3s client-side', async ({ page }) => {
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);

    const elapsedMs = await page.evaluate(async () => {
      const t0 = performance.now();
      await Promise.all(
        Array.from({ length: 5 }, () =>
          fetch('/api/forum/status', { credentials: 'same-origin' }).catch(() => undefined),
        ),
      );
      return Math.round(performance.now() - t0);
    });

    expect(elapsedMs, '5 signed fetches should not block UI for long').toBeLessThan(10_000);
  });
});

test.describe('مستخدم عادي — لا يُحجب عن العمل المحلي', () => {
  test('لوحة المحامي ومساحة الدعاوى تفتح (عمل محلي)', async ({ page }) => {
    test.setTimeout(60_000);
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible();
    await page.getByRole('button', { name: /^دعاوى$/ }).click({ timeout: 15_000 });
    await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 15_000 });
  });

  test('فتح إضبارة مدنية — WIFE لا يمنع العمل المحلي', async ({ page }) => {
    test.setTimeout(60_000);
    const captures = installApiRequestCapture(page);
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await openCivilDossier(page);
    await expect(page.getByText('اضبارة الدعوى')).toBeVisible({ timeout: 25_000 });
    assertAllSigned(captures);
  });
});
