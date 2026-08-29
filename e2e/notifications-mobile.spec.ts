/**
 * E2E — لوحة الإشعارات على viewport موبايل (Pixel 7) ولوح.
 */
import { test, expect } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { revealHeaderToolbarTools } from './helpers/headerToolbarFixtures';
import {
    ensureNotificationsDashboardE2E,
    openNotificationsPanel,
    seedNotificationFixtures,
    waitForNotificationDismissUnlocked,
    clickPanelControl,
    expectNotificationsPanelClosed,
} from './helpers/notificationFixtures';

const MOBILE_E2E_PROJECTS = new Set(['mobile-chrome', 'mobile-safari', 'tablet-chrome']);

async function bootNotificationsMobile(page: import('@playwright/test').Page) {
    await page.goto('/');
    await ensureNotificationsDashboardE2E(page);
    await dismissProductivityBlockers(page);
    await revealHeaderToolbarTools(page);
}

test.describe('لوحة الإشعارات — موبايل', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(!MOBILE_E2E_PROJECTS.has(testInfo.project.name), 'اختبارات viewport الموبايل/اللوح فقط');
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
        await seedNotificationFixtures(page);
    });

    test('زر الجرس والتبويب والإغلاق 44px+', async ({ page }) => {
        await bootNotificationsMobile(page);

        const trigger = page.getByTestId('header-notifications-trigger').first();
        await expect(trigger).toBeVisible({ timeout: 15_000 });
        const triggerBox = await trigger.boundingBox();
        expect(triggerBox).not.toBeNull();
        expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
        expect(triggerBox!.width).toBeGreaterThanOrEqual(44);

        const panel = await openNotificationsPanel(page);
        const forumTab = panel.getByTestId('notification-tab-forum');
        const tabBox = await forumTab.boundingBox();
        expect(tabBox).not.toBeNull();
        expect(tabBox!.height).toBeGreaterThanOrEqual(44);

        const closeBtn = panel.getByTestId('notification-panel-close');
        const closeBox = await closeBtn.boundingBox();
        expect(closeBox).not.toBeNull();
        expect(closeBox!.height).toBeGreaterThanOrEqual(44);
        expect(closeBox!.width).toBeGreaterThanOrEqual(44);
    });

    test('المقبض ظاهر والتبويبات تعمل باللمس', async ({ page }) => {
        await bootNotificationsMobile(page);

        const panel = await openNotificationsPanel(page);
        await expect(panel.getByTestId('notification-sheet-handle')).toBeVisible();

        await panel.getByTestId('notification-tab-system').tap();
        await expect(panel.getByTestId('notification-tab-system')).toHaveAttribute('aria-selected', 'true', {
            timeout: 8_000,
        });
        await expect(panel.getByTestId('notification-card-e2e-system-alert')).toBeVisible();

        await panel.getByTestId('notification-tab-forum').tap();
        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });
    });

    test('تحكم التنبيهات باللمس ثم الإغلاق', async ({ page }) => {
        await bootNotificationsMobile(page);

        const panel = await openNotificationsPanel(page);
        await panel.getByTestId('notification-alert-controls-toggle').tap();
        await expect(page.getByTestId('notification-alert-controls')).toBeVisible({ timeout: 8_000 });

        const back = page.getByTestId('notification-alert-controls-back');
        const backBox = await back.boundingBox();
        expect(backBox).not.toBeNull();
        expect(backBox!.height).toBeGreaterThanOrEqual(44);

        await back.tap();
        await expect(page.getByTestId('notification-alert-controls')).toBeHidden({ timeout: 5_000 });

        await waitForNotificationDismissUnlocked(page);
        await clickPanelControl(panel.getByTestId('notification-panel-close'));
        await expectNotificationsPanelClosed(page);
    });
});
