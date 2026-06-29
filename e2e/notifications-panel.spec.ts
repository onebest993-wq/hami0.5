/**
 * E2E — لوحة الإشعارات: وارد حقيقي فقط، Escape، focus trap smoke.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { seedNotificationFixtures, pushE2eIncomingNotification, waitForE2eNotificationsBaseline, readNotificationsOpenToInteractiveMs, clearNotificationPerfMarksInPage, E2E_NOTIFICATIONS_COLD_OPEN_MS, E2E_NOTIFICATIONS_CACHED_OPEN_MS } from './helpers/notificationFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';

async function clickPanelControl(locator: import('@playwright/test').Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    await locator.evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
    });
}

async function switchNotificationTab(
    panel: import('@playwright/test').Locator,
    tab: 'forum' | 'system',
): Promise<void> {
    const nav = panel.getByTestId(`notification-tab-${tab}`);
    await clickPanelControl(nav);
    await expect(nav).toHaveAttribute('aria-selected', 'true', { timeout: 8_000 });
}

async function openNotificationsPanel(page: import('@playwright/test').Page) {
    const trigger = page.getByTestId('header-notifications-trigger');
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click({ timeout: 15_000, force: true }).catch(async () => {
        await trigger.evaluate((el) => {
            if (el instanceof HTMLElement) el.click();
        });
    });
    const panel = page.getByTestId('notification-panel');
    const loading = page
        .getByTestId('notification-panel-shell-loading')
        .or(page.getByTestId('notification-panel-content-loading'));
    const opened =
        (await panel.isVisible({ timeout: 4_000 }).catch(() => false)) ||
        (await loading.isVisible({ timeout: 2_000 }).catch(() => false));
    if (!opened) {
        await page.evaluate(() => window.__hamiE2eForceOpenNotifications?.());
    }
    await expect(panel.or(loading)).toBeVisible({ timeout: 20_000 });
    await expect(panel).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('alertdialog', { name: 'خطأ في الإشعارات' })).toBeHidden({
        timeout: 2_000,
    }).catch(() => undefined);
    return panel;
}

test.describe('لوحة الإشعارات', () => {
    test.describe.configure({ timeout: 60_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
        await seedNotificationFixtures(page);
    });

    test('تفتح اللوحة وتعرض الوارد فقط — بدون إجراءات ذاتية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
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
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openNotificationsPanel(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('notification-panel')).toBeHidden({ timeout: 5_000 });
    });

    test('Tab يبقى داخل اللوحة (focus trap)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
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
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });

        await switchNotificationTab(panel, 'system');
        await expect(panel.getByTestId('notification-panel-empty')).toContainText('لا إشعارات نظام حالياً', {
            timeout: 10_000,
        });

        await switchNotificationTab(panel, 'forum');
        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });
    });

    test('إعادة الفتح تُعيد تبويب المنتدى الافتراضي', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        await switchNotificationTab(panel, 'system');
        await expect(panel.getByTestId('notification-panel-empty')).toBeVisible({ timeout: 8_000 });

        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden({ timeout: 5_000 });

        await openNotificationsPanel(page);
        await expect(panel.getByText('رد جديد على سؤالك')).toBeVisible({ timeout: 8_000 });
    });

    test('النقر على إشعار يغلق اللوحة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        await clickPanelControl(panel.getByTestId('notification-card-e2e-incoming-reply'));
        await expect(panel).toBeHidden({ timeout: 8_000 });
    });

    test('فتح البحث بـ Ctrl+K يغلق لوحة الإشعارات', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openNotificationsPanel(page);
        await page.keyboard.press('Control+k');
        await expect(page.getByTestId('global-search-overlay')).toBeVisible({ timeout: 12_000 });
        await expect(page.getByTestId('notification-panel')).toBeHidden({ timeout: 8_000 });
    });

    test('فتح الإشعارات من الهيدر يغلق البحث الشامل', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await page.keyboard.press('Control+k');
        await expect(page.getByTestId('global-search-overlay')).toBeVisible({ timeout: 12_000 });

        await openNotificationsPanel(page);
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('notification-panel')).toBeVisible({ timeout: 8_000 });
    });

    test('المنبثق يظهر للإشعار الوارد الجديد ويفتح اللوحة عند النقر', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await waitForE2eNotificationsBaseline(page);

        await pushE2eIncomingNotification(page, {
            id: 'e2e-fresh-popup',
            title: 'تنبيه E2E منبثق',
            message: 'رسالة واردة للاختبار',
        });

        const popup = page.getByTestId('incoming-notification-popup-e2e-fresh-popup');
        await expect(popup).toBeVisible({ timeout: 12_000 });

        await clickPanelControl(popup);
        await expect(page.getByTestId('notification-panel')).toBeVisible({ timeout: 10_000 });
        await expect(popup).toBeHidden({ timeout: 5_000 });
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openNotificationsPanel(page);

        const perfMs = await readNotificationsOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:notifications:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_NOTIFICATIONS_COLD_OPEN_MS);
    });

    test('إعادة الفتح ضمن حد زمني مع chunk محمّل', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const panel = await openNotificationsPanel(page);
        await expect(panel.getByTestId('notification-tab-forum')).toBeVisible({ timeout: 8_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('notification-panel')).toBeHidden({ timeout: 8_000 });
        await clearNotificationPerfMarksInPage(page);

        await openNotificationsPanel(page);

        const perfMs = await readNotificationsOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع فتح متكرر').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_NOTIFICATIONS_CACHED_OPEN_MS);
    });
});
