/**
 * E2E — مركز الإعدادات على viewport موبايل (Pixel 7) ولوح (iPad Mini).
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { openSettingsFromHeader, prepareSettingsE2E, revealHeaderToolbarTools, switchSettingsTab, ensureSmartDialogInfrastructure } from './helpers/settingsFixtures';

const MOBILE_E2E_PROJECTS = new Set(['mobile-chrome', 'mobile-safari', 'tablet-chrome']);

async function bootSettingsMobile(page: import('@playwright/test').Page) {
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await dismissProductivityBlockers(page);
    await page.getByTestId('header-tools-reveal').waitFor({ state: 'visible', timeout: 30_000 });
    await revealHeaderToolbarTools(page);
    await page.getByTestId('header-settings-trigger').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('مركز الإعدادات — موبايل', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(!MOBILE_E2E_PROJECTS.has(testInfo.project.name), 'اختبارات viewport الموبايل/اللوح فقط');
        await prepareProductivityE2E(page);
        await prepareSettingsE2E(page);
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

    test('تبويب الأمان — toggles الأمنية تعمل باللمس', async ({ page }) => {
        await bootSettingsMobile(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'security');

        const screenshotToggle = shell.getByTestId('settings-toggle-security-screenshotDeterrent');
        const privacyBlur = shell.getByTestId('settings-toggle-security-privacyBlur');
        await expect(privacyBlur).toBeVisible();
        await expect(privacyBlur).toHaveAttribute('aria-checked', 'true');
        const blurBox = await privacyBlur.boundingBox();
        expect(blurBox).not.toBeNull();
        expect(blurBox!.height).toBeGreaterThanOrEqual(44);
        expect(blurBox!.width).toBeGreaterThanOrEqual(44);

        await ensureSmartDialogInfrastructure(page);
        await privacyBlur.tap();
        const dialog = page.getByTestId('smart-dialog-overlay');
        await expect(dialog).toBeVisible({ timeout: 8_000 });
        await dialog.getByRole('button', { name: 'إلغاء' }).tap();
        await expect(dialog).toBeHidden({ timeout: 5_000 });
        await expect(privacyBlur).toHaveAttribute('aria-checked', 'true');

        const before = await screenshotToggle.getAttribute('aria-checked');
        await screenshotToggle.tap();
        await expect(screenshotToggle).not.toHaveAttribute('aria-busy', 'true', { timeout: 10_000 });
        await expect(screenshotToggle).not.toHaveAttribute('aria-checked', before!, { timeout: 8_000 });
    });

    test('Escape يغلق الإعدادات على الموبايل', async ({ page }) => {
        await bootSettingsMobile(page);

        await openSettingsFromHeader(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('hami-settings-shell')).toBeHidden({ timeout: 5_000 });
    });

    test('زر الإغلاق 44px ولا يفيض أفقياً في الوضع الأفقي', async ({ page }) => {
        await page.setViewportSize({ width: 844, height: 390 });
        await bootSettingsMobile(page);

        const shell = await openSettingsFromHeader(page);
        const closeBtn = shell.getByTestId('settings-shell-close');
        const box = await closeBtn.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);

        const overflowX = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 2,
        );
        expect(overflowX).toBe(false);
    });

    test('أبعاد لوح 768px: لا overflow أفقي والمحتوى يبقى داخل الإطار', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await bootSettingsMobile(page);

        const shell = await openSettingsFromHeader(page);
        await expect(shell).toBeVisible();

        const overflowX = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 2,
        );
        expect(overflowX).toBe(false);

        const frame = shell.locator('.hami-settings-section-frame').first();
        await expect(frame).toBeVisible();
        const frameBox = await frame.boundingBox();
        expect(frameBox).not.toBeNull();
        expect(frameBox!.width).toBeLessThanOrEqual(768);
    });

    test('ورقة تخصيص القسم تُفتح باللمس وتُغلق بزر الرجوع 44px', async ({ page }) => {
        await bootSettingsMobile(page);
        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'appearance');

        await page.getByTestId('appearance-block-customize-toggle').tap();
        const sheet = page.getByTestId('appearance-block-customize-sheet');
        await expect(sheet).toBeVisible({ timeout: 8_000 });

        const back = page.getByTestId('appearance-block-customize-back');
        const box = await back.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);

        const overflowX = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 2,
        );
        expect(overflowX).toBe(false);

        await back.tap();
        await expect(sheet).toBeHidden({ timeout: 5_000 });
    });

    test('ورقة الوثيقة القانونية تُفتح على تبويب الحساب بلا overflow', async ({ page }) => {
        await bootSettingsMobile(page);
        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'account');

        await page.getByTestId('settings-account-open-terms').tap();
        const sheet = page.getByTestId('account-legal-document-sheet');
        await expect(sheet).toBeVisible({ timeout: 8_000 });
        await expect(page.getByTestId('account-legal-document-body')).toBeVisible();

        const back = page.getByTestId('account-legal-document-back');
        const box = await back.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);

        const overflowX = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 2,
        );
        expect(overflowX).toBe(false);

        await back.tap();
        await expect(sheet).toBeHidden({ timeout: 5_000 });
    });

    test('على اللوح ورقة التخصيص أضيق من عرض الشاشة', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'tablet-chrome', 'عقد اللوح فقط');
        await bootSettingsMobile(page);
        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'appearance');
        await page.getByTestId('appearance-block-customize-toggle').tap();

        const panel = page.getByTestId('hami-settings-sheet-panel');
        await expect(panel).toBeVisible({ timeout: 8_000 });
        const box = await panel.boundingBox();
        expect(box).not.toBeNull();
        const viewportWidth = page.viewportSize()?.width ?? 768;
        expect(box!.width).toBeLessThanOrEqual(672 + 2);
        expect(box!.width).toBeLessThan(viewportWidth);
    });
});
