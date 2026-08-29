/**

 * E2E — لوحة الإشعارات: وارد حقيقي فقط، Escape، focus trap smoke.

 */

import { test, expect } from '@playwright/test';

import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';

import {

    seedNotificationFixtures,

    pushE2eIncomingNotification,

    waitForE2eNotificationsBaseline,

    primeNotificationPopupHost,

    waitForNotificationE2eHooks,

    waitForNotificationInteractiveMarks,

    readNotificationsOpenToInteractiveMs,

    clearNotificationPerfMarksInPage,

    openNotificationsPanel,

    clickPanelControl,

    closeNotificationsPanelForE2E,

    expectNotificationsPanelClosed,

    ensureNotificationsDashboardE2E,

    E2E_NOTIFICATIONS_COLD_OPEN_MS,

    E2E_NOTIFICATIONS_CACHED_OPEN_MS,

    waitForNotificationDismissUnlocked,

} from './helpers/notificationFixtures';

import {
    openGlobalSearchForE2E,
    expectGlobalSearchClosed,
} from './helpers/globalSearchFixtures';

import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';



async function switchNotificationTab(

    page: import('@playwright/test').Page,

    tab: 'forum' | 'system',

): Promise<void> {

    const testId = `notification-tab-${tab}`;

    await expect(page.getByTestId(testId)).toBeVisible({ timeout: 8_000 });

    await page.evaluate((id) => {

        const el = document.querySelector(`[data-testid="${id}"]`);

        if (el instanceof HTMLElement) el.click();

    }, testId);

    await expect(page.getByTestId(testId)).toHaveAttribute('aria-selected', 'true', {

        timeout: 8_000,

    });

}



test.describe('لوحة الإشعارات', () => {

    test.describe.configure({ timeout: 90_000 });



    test.beforeEach(async ({ page }) => {

        await prepareProductivityE2E(page);

        await seedLawyerFiles(page);

        await seedNotificationFixtures(page);

    });



    test('تفتح اللوحة وتعرض الوارد فقط — بدون إجراءات ذاتية', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        const panel = await openNotificationsPanel(page);

        await expect(panel.locator('.animate-spin')).toHaveCount(0);

        await expect(panel).toHaveAttribute('aria-modal', 'true');



        await expect(panel.getByText('حذفت سؤالاً')).toHaveCount(0);

        await expect(panel.getByText('نشرت سؤالاً في المنتدى')).toHaveCount(0);

        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });

    });



    test('Escape يغلق اللوحة', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        await openNotificationsPanel(page);

        await page.keyboard.press('Escape');

        await expectNotificationsPanelClosed(page, 5_000);

    });



    test('Tab يبقى داخل اللوحة (focus trap)', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        await openNotificationsPanel(page);

        await page.keyboard.press('Tab');

        await page.keyboard.press('Tab');

        await page.keyboard.press('Tab');



        const focusInside = await page.evaluate(() => {

            const root = document.querySelector('[data-testid="notification-panel"]');

            return root instanceof HTMLElement && root.contains(document.activeElement);

        });

        expect(focusInside).toBe(true);

    });



    test('التبويبات تتبدّل بين المنتدى والنظام', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        const panel = await openNotificationsPanel(page);

        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });



        await switchNotificationTab(page, 'system');

        await expect(panel.getByTestId('notification-card-e2e-system-alert')).toBeVisible({

            timeout: 10_000,

        });

        await expect(panel.getByText('رد جديد على سؤالك')).toHaveCount(0);



        await switchNotificationTab(page, 'forum');

        await expect(panel.getByTestId('notification-panel-empty')).toBeHidden({ timeout: 8_000 });

        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 10_000 });

    });



    test('إعادة الفتح تُعيد تبويب المنتدى الافتراضي', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        const panel = await openNotificationsPanel(page);

        await switchNotificationTab(page, 'system');

        await expect(panel.getByTestId('notification-card-e2e-system-alert')).toBeVisible({ timeout: 8_000 });



        await closeNotificationsPanelForE2E(page, 5_000);



        const panelAfterReopen = await openNotificationsPanel(page);

        await expect(panelAfterReopen.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });

        await expect(panelAfterReopen.getByTestId('notification-tab-forum')).toHaveAttribute(

            'aria-selected',

            'true',

        );

    });



    test('النقر على إشعار يغلق اللوحة', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        await openNotificationsPanel(page);

        const card = page.getByTestId('notification-card-e2e-incoming-reply');

        await expect(card).toBeVisible({ timeout: 8_000 });

        await clickPanelControl(card);

        await expectNotificationsPanelClosed(page);

        await expect(page.locator('html')).toHaveAttribute('data-hami-forum-open', '1', {
            timeout: 12_000,
        });
        await expect(page.getByTestId('forum-overlay-host')).toBeVisible({ timeout: 12_000 });

    });



    test('فتح البحث بـ Ctrl+K يغلق لوحة الإشعارات', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        await openNotificationsPanel(page);

        await openGlobalSearchForE2E(page);

        await expectNotificationsPanelClosed(page);

    });



    test('فتح الإشعارات من الهيدر يغلق البحث الشامل', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);

        await openGlobalSearchForE2E(page);

        await waitForNotificationE2eHooks(page);

        await openNotificationsPanel(page);

        await expectGlobalSearchClosed(page);

        await expect(page.locator('[data-notification-root][data-open="true"]')).toBeVisible({
            timeout: 15_000,
        });

    });



    test('المنبثق يظهر للإشعار الوارد الجديد ويفتح اللوحة عند النقر', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        await waitForE2eNotificationsBaseline(page);

        await primeNotificationPopupHost(page);

        await pushE2eIncomingNotification(page, {

            id: 'e2e-fresh-popup',

            title: 'تنبيه E2E منبثق',

            message: 'رسالة واردة للاختبار',

        });

        const popup = page.getByTestId('incoming-notification-popup-e2e-fresh-popup');

        await expect(async () => {
            await expect(popup).toBeVisible({ timeout: 3_000 });
        }).toPass({ timeout: 20_000 });



        await clickPanelControl(popup);

        await expect(page.getByTestId('notification-panel')).toBeVisible({ timeout: 10_000 });

        await expect(popup).toBeHidden({ timeout: 5_000 });

    });



    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        await openNotificationsPanel(page);

        await waitForNotificationInteractiveMarks(page);

        const perfMs = await readNotificationsOpenToInteractiveMs(page);

        expect(perfMs, 'يجب تسجيل hami:notifications:open-request و interactive').not.toBeNull();

        expect(perfMs!).toBeGreaterThanOrEqual(0);

        expect(perfMs!).toBeLessThan(E2E_NOTIFICATIONS_COLD_OPEN_MS);

    });



    test('إعادة الفتح ضمن حد زمني مع chunk محمّل', async ({ page }) => {

        await page.goto('/');

        await ensureNotificationsDashboardE2E(page);

        await dismissProductivityBlockers(page);



        const panel = await openNotificationsPanel(page);

        await expect(panel.getByTestId('notification-tab-forum')).toBeVisible({ timeout: 8_000 });



        await page.keyboard.press('Escape');

        await expectNotificationsPanelClosed(page);

        await clearNotificationPerfMarksInPage(page);



        await openNotificationsPanel(page);

        await waitForNotificationInteractiveMarks(page);

        const perfMs = await readNotificationsOpenToInteractiveMs(page);

        expect(perfMs, 'marks مع فتح متكرر').not.toBeNull();

        expect(perfMs!).toBeLessThan(E2E_NOTIFICATIONS_CACHED_OPEN_MS);

    });

    test('زر الإغلاق يغلق اللوحة', async ({ page }) => {
        await page.goto('/');
        await ensureNotificationsDashboardE2E(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        await waitForNotificationDismissUnlocked(page);
        await clickPanelControl(panel.getByTestId('notification-panel-close'));
        await expectNotificationsPanelClosed(page);
    });

    test('الخلفية تغلق اللوحة بعد تسليح الإغلاق', async ({ page }) => {
        await page.goto('/');
        await ensureNotificationsDashboardE2E(page);
        await dismissProductivityBlockers(page);

        await openNotificationsPanel(page);
        await waitForNotificationDismissUnlocked(page);
        await clickPanelControl(page.getByTestId('notification-panel-overlay'));
        await expectNotificationsPanelClosed(page);
    });

    test('تحديد الكل كمقروء يُزيل شارة غير المقروء', async ({ page }) => {
        await page.goto('/');
        await ensureNotificationsDashboardE2E(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        const incoming = panel.getByTestId('notification-card-e2e-incoming-reply');
        await expect(incoming).toHaveAttribute('data-unread', 'true');
        await clickPanelControl(panel.getByTestId('notification-mark-all-read'));
        await expect(incoming).toHaveAttribute('data-unread', 'false', { timeout: 8_000 });
    });

    test('تحكم التنبيهات يُفتح ويُغلق بالرجوع وEscape لا يغلق اللوحة', async ({ page }) => {
        await page.goto('/');
        await ensureNotificationsDashboardE2E(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        await clickPanelControl(panel.getByTestId('notification-alert-controls-toggle'));
        await expect(page.getByTestId('notification-alert-controls')).toBeVisible({ timeout: 8_000 });
        await expect(page.getByTestId('notification-sound-master')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('notification-alert-controls')).toBeHidden({ timeout: 5_000 });
        await expect(page.locator('[data-notification-root][data-open="true"]')).toBeVisible({
            timeout: 5_000,
        });
        await expect(panel).toHaveAttribute('data-notification-route', 'inbox');
        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });

        await clickPanelControl(panel.getByTestId('notification-alert-controls-toggle'));
        await expect(page.getByTestId('notification-alert-controls')).toBeVisible({ timeout: 8_000 });
        await clickPanelControl(page.getByTestId('notification-alert-controls-back'));
        await expect(page.getByTestId('notification-alert-controls')).toBeHidden({ timeout: 5_000 });
        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });
    });

    test('أسهم لوحة المفاتيح تبدّل التبويب', async ({ page }) => {
        await page.goto('/');
        await ensureNotificationsDashboardE2E(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        const forumTab = panel.getByTestId('notification-tab-forum');
        await forumTab.focus();
        await page.keyboard.press('ArrowLeft');
        await expect(panel.getByTestId('notification-tab-system')).toHaveAttribute('aria-selected', 'true', {
            timeout: 5_000,
        });
        await expect(panel.getByTestId('notification-card-e2e-system-alert')).toBeVisible();
    });

    test('إغلاق المنبثق لا يفتح اللوحة', async ({ page }) => {
        await page.goto('/');
        await ensureNotificationsDashboardE2E(page);
        await dismissProductivityBlockers(page);

        await waitForE2eNotificationsBaseline(page);
        await primeNotificationPopupHost(page);
        await pushE2eIncomingNotification(page, {
            id: 'e2e-dismiss-popup',
            title: 'تنبيه يُغلق',
            message: 'لا يفتح الصندوق',
        });
        const popup = page.getByTestId('incoming-notification-popup-e2e-dismiss-popup');
        await expect(async () => {
            await expect(popup).toBeVisible({ timeout: 3_000 });
        }).toPass({ timeout: 20_000 });

        await clickPanelControl(popup.getByTestId('incoming-notification-popup-dismiss'));
        await expect(popup).toBeHidden({ timeout: 5_000 });
        await expectNotificationsPanelClosed(page, 4_000);
    });

});


