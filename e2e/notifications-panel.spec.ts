/**
 * E2E — لوحة الإشعارات: وارد حقيقي فقط، Escape، focus trap smoke.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
    dismissBlockingOverlays,
    seedNotificationFixtures,
} from './helpers/notificationFixtures';

test.describe('لوحة الإشعارات', () => {
    test.describe.configure({ timeout: 60_000 });

    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await seedNotificationFixtures(page);
    });

    test('تفتح اللوحة وتعرض الوارد فقط — بدون إجراءات ذاتية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await page.getByTestId('header-notifications-trigger').click({ timeout: 15_000 });

        const panel = page.getByTestId('notification-panel');
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(panel).toHaveAttribute('aria-modal', 'true');

        await expect(panel.getByText('حذفت سؤالاً')).toHaveCount(0);
        await expect(panel.getByText('نشرت سؤالاً في المنتدى')).toHaveCount(0);
        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });
    });

    test('Escape يغلق اللوحة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await page.getByTestId('header-notifications-trigger').click({ timeout: 15_000 });
        await expect(page.getByTestId('notification-panel')).toBeVisible({ timeout: 10_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('notification-panel')).toBeHidden({ timeout: 5_000 });
    });

    test('Tab يبقى داخل اللوحة (focus trap)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await page.getByTestId('header-notifications-trigger').click({ timeout: 15_000 });
        const panel = page.getByTestId('notification-panel');
        await expect(panel).toBeVisible({ timeout: 10_000 });

        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        const focusInside = await page.evaluate(() => {
            const root = document.querySelector('[data-testid="notification-panel"]');
            return root instanceof HTMLElement && root.contains(document.activeElement);
        });
        expect(focusInside).toBe(true);
    });
});
