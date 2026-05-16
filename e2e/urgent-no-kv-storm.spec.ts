/**
 * Regression: فتح الطلبات المستعجلة لا يطلق عاصفة kv-proxy
 */
import { test, expect } from '@playwright/test';

const URGENT_STORAGE_KEY = 'hami:urgentActions:v1:dev-user-uuid-1';

test.describe('Urgent module — no kv-proxy storm', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          schemaVersion: 1,
          userId: 'dev-user-uuid-1',
          updatedAt: new Date().toISOString(),
          cases: [
            {
              id: 'kv-guard-case',
              type: 'urgent_action',
              actionType: 'طلب',
              applicantName: 'فحص الشبكة',
              createdAt: new Date().toISOString(),
              phase: 'pending',
              status: 'safe',
              archived: false,
              deleted: false,
            },
          ],
        }),
      );
    }, URGENT_STORAGE_KEY);

    await page.goto('/');
    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await devBypass.click();
    }
    await page.waitForLoadState('networkidle').catch(() => undefined);
  });

  test('opening urgent tab and dossier triggers at most 3 kv-proxy calls', async ({ page }) => {
    let kvProxyCount = 0;
    await page.route('**/kv-proxy**', async (route) => {
      kvProxyCount += 1;
      await route.continue();
    });

    await page.getByRole('button', { name: /^دعاوى$/ }).click({ timeout: 20_000 });
    await page.getByRole('button', { name: /الطلبات المستعجلة/i }).click({ timeout: 15_000 });
    await expect(page.getByText('فحص الشبكة')).toBeVisible({ timeout: 20_000 });

    const beforeOpen = kvProxyCount;
    await page.getByRole('heading', { name: /فحص الشبكة/i }).click();
    await expect(page.getByText('تعذر فتح الإضبارة')).toBeHidden({ timeout: 45_000 });
    await expect(page.getByText('تعذّر فتح الإضبارة')).toBeHidden({ timeout: 45_000 });
    await expect(page.getByText('سير الإجراءات القضائية')).toBeVisible({ timeout: 45_000 });

    const delta = kvProxyCount - beforeOpen;
    expect(delta).toBeLessThanOrEqual(3);
    expect(kvProxyCount).toBeLessThanOrEqual(8);
  });
});
