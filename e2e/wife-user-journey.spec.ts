/**
 * WIFE — رحلة مستخدم عادي + مسارات نادرة (Playwright).
 * يختبر التوقيع الحي من المتصفح دون الاعتماد على أزرار المنتدى/الدعاوى.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
  assertWifeSignedHttpOutcome,
  assertWifeSignedRequest,
  browserFetchStatus,
  headerMap,
  installApiRequestCapture,
  isWifeE2eProtectedCapture,
  seedWifeE2eSession,
  waitForApiCapture,
  waitForSameOriginApiReady,
  WIFE_E2E_AUTH_KEY,
  WIFE_E2E_DEV_MOCK_KEY,
  waitForWifeGuard,
  waitForWifeSigningToken,
  type CapturedApiRequest,
} from './helpers/wifeApiCapture';

function protectedCaptures(captures: CapturedApiRequest[]): CapturedApiRequest[] {
  return captures.filter((c) => isWifeE2eProtectedCapture(c));
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

async function readySignedSurface(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await ensureLawyerDashboard(page);
  await waitForWifeGuard(page);
  await waitForWifeSigningToken(page);
  await waitForSameOriginApiReady(page);
}

test.describe('مستخدم عادي — رحلة يومية', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
  });

  test('لوحة المحامي تبقى، والقراءة اليومية تُوقَّع', async ({ page }) => {
    test.setTimeout(60_000);
    const captures = installApiRequestCapture(page);
    const t0 = Date.now();
    await readySignedSurface(page);

    await page.evaluate(async () => {
      await fetch('/api/forum/status', { credentials: 'same-origin' }).catch(() => undefined);
      await fetch('/api/forum/posts?limit=5&offset=0', { credentials: 'same-origin' }).catch(() => undefined);
    });
    await waitForApiCapture(captures, (c) => c.url.includes('/api/forum/posts'));

    await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 15_000 });
    assertAllSigned(captures);
    expect(Date.now() - t0, 'journey should finish within 60s').toBeLessThan(60_000);
  });

  test('إعادة تحميل الصفحة — التوقيع يستمر', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await readySignedSurface(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureLawyerDashboard(page);
    await waitForWifeGuard(page);
    await waitForWifeSigningToken(page);
    await waitForSameOriginApiReady(page);

    const status = await browserFetchStatus(page, '/api/forum/status');
    assertWifeSignedHttpOutcome(status, 'reload forum/status');
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
    await readySignedSurface(page);

    const before = captures.length;
    await page.evaluate(async () => {
      await Promise.all([
        fetch('/api/forum/status', { credentials: 'same-origin' }).catch(() => undefined),
        fetch('/api/forum/bookmark', { credentials: 'same-origin' }).catch(() => undefined),
        fetch('/api/forum/posts?limit=5&offset=0', { credentials: 'same-origin' }).catch(() => undefined),
        fetch('/api/forum/stats', { credentials: 'same-origin' }).catch(() => undefined),
        fetch('/api/security/csrf', { credentials: 'same-origin' }).catch(() => undefined),
      ]);
    });

    await page.waitForTimeout(800);
    const burst = captures.slice(before);
    expect(burst.length).toBeGreaterThanOrEqual(5);
    assertAllSigned(burst);
    assertUniqueNonces(burst);
  });

  test('قراءتان متتاليتان بعد العودة للوحة — كل /api موقّع', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await readySignedSurface(page);

    await page.evaluate(async () => {
      await fetch('/api/forum/posts?limit=5&offset=0', { credentials: 'same-origin' }).catch(() => undefined);
    });
    await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 15_000 });
    await page.evaluate(async () => {
      await fetch('/api/forum/status', { credentials: 'same-origin' }).catch(() => undefined);
    });
    await waitForApiCapture(captures, (c) => c.url.includes('/api/forum/status'));
    assertAllSigned(captures);
  });

  test('تحديث access_token (محاكاة refresh) — الطلب التالي موقّع', async ({ page }) => {
    const captures = installApiRequestCapture(page);
    await readySignedSurface(page);

    await page.evaluate(
      ({ authKey, mockKey }) => {
        const raw = localStorage.getItem(authKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          parsed.access_token = 'e2e-refreshed-access-token-with-length-ok-xyz';
          parsed.expires_at = Math.floor(Date.now() / 1000) + 7200;
          localStorage.setItem(authKey, JSON.stringify(parsed));
        }
        localStorage.setItem(mockKey, 'e2e-refreshed-access-token-with-length-ok-xyz');
      },
      { authKey: WIFE_E2E_AUTH_KEY, mockKey: WIFE_E2E_DEV_MOCK_KEY },
    );

    await page.evaluate(async () => {
      await fetch('/api/forum/status', { credentials: 'same-origin' }).catch(() => undefined);
    });
    const hit = await waitForApiCapture(
      captures,
      (c) => c.url.includes('/api/forum/status') && c.url.includes('status'),
    );
    assertWifeSignedRequest(hit);
  });
});

test.describe('بدون جلسة', () => {
  test('بدون login — الطلب المحمي لا يخرج بلا توقيع', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const captures = installApiRequestCapture(page);
    await page.goto('/');
    await waitForWifeGuard(page);
    await waitForSameOriginApiReady(page);

    const result = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/forum/status', { credentials: 'same-origin' });
        return { ok: true as const, status: res.status };
      } catch (err) {
        return { ok: false as const, message: err instanceof Error ? err.message : 'error' };
      }
    });

    const statusReq = captures.find((c) => c.url.includes('/api/forum/status'));
    if (statusReq) {
      assertWifeSignedRequest(statusReq);
    } else {
      expect(result.ok).toBe(false);
    }
  });
});

test.describe('مسارات نادرة — ضغط وحدود (continued)', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
  });

  test('زمن التوقيع في المتصفح — burst 5 under 10s client-side', async ({ page }) => {
    await readySignedSurface(page);

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
  test('لوحة المحامي تفتح مع وجود WIFE', async ({ page }) => {
    test.setTimeout(60_000);
    await seedWifeE2eSession(page);
    await seedLawyerFiles(page);
    await readySignedSurface(page);
    await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible();
  });
});
