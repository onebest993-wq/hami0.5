/**
 * E2E — مركز الإعدادات على viewport موبايل (Pixel 7 / iPhone 14 عبر Playwright projects).
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { openSettingsFromHeader, switchSettingsTab } from './helpers/settingsFixtures';

async function bootSettingsMobile(page: import('@playwright/test').Page) {
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await dismissProductivityBlockers(page);
    await page.getByTestId('header-settings-trigger').waitFor({ state: 'visible', timeout: 30_000 });
}

test.describe('مركز الإعدادات — موبايل', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
    });

    test('viewport-fit=cover جاهز لـ safe-area', async ({ page }) => {
        await page.goto('/');
        const content = await page.locator('meta[name="viewport"]').getAttribute('content');
        expect(content).toContain('viewport-fit=cover');
    });

    test('يفتح من الهيدر دون overflow أفقي', async ({ page }) => {
        await bootSettingsMobile(page);

        const shell = await openSettingsFromHeader(page);
        await expect(shell).toBeVisible();

        const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        expect(overflowX).toBe(false);
    });

    test('تبويبات الإعدادات قابلة للمس (44px+) وتتبدّل', async ({ page }) => {
        await bootSettingsMobile(page);

        const shell = await openSettingsFromHeader(page);
        const securityNav = shell.getByTestId('settings-nav-security');
        const box = await securityNav.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);

        await switchSettingsTab(shell, 'security');
        await expect(shell.getByTestId('settings-section-security')).toBeVisible();
    });

    test('تبويب الأمان — تمويه الخروج قابل للتبديل باللمس', async ({ page }) => {
        await bootSettingsMobile(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'security');

        const toggle = shell.getByTestId('settings-toggle-security-privacyBlur');
        const before = await toggle.getAttribute('aria-checked');
        await toggle.tap();
        expect(await toggle.getAttribute('aria-checked')).not.toBe(before);
    });

    test('تبويب الأمان — toggles الأمنية تعمل باللمس', async ({ page }) => {
        await bootSettingsMobile(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'security');

        const screenshotToggle = shell.getByTestId('settings-toggle-security-screenshotDeterrent');
        const before = await screenshotToggle.getAttribute('aria-checked');
        await screenshotToggle.tap();
        expect(await screenshotToggle.getAttribute('aria-checked')).not.toBe(before);
    });

    test('Escape يغلق الإعدادات على الموبايل', async ({ page }) => {
        await bootSettingsMobile(page);

        await openSettingsFromHeader(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('hami-settings-shell')).toBeHidden({ timeout: 5_000 });
    });
});
