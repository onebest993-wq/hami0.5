/**
 * E2E — سيناريوهات طبقات الإعدادات (إغلاق، أوراق متداخلة، إلغاء خطر).
 * لا يُنفَّذ مسح بيانات ولا حذف حساب ولا تصدير/استيراد نسخة.
 */
import { test, expect } from '@playwright/test';
import { gotoLawyerHomeE2E } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    dispatchDomClick,
    dispatchPrimaryPointerDown,
    ensureSmartDialogInfrastructure,
    openSettingsFromHeader,
    prepareSettingsE2E,
    switchSettingsTab,
    teardownSettingsE2E,
} from './helpers/settingsFixtures';

test.describe('مركز الإعدادات — سيناريوهات الطبقات', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await prepareSettingsE2E(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownSettingsE2E(page);
    });

    test('زر الإغلاق يغلق المركز دون Escape', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await openSettingsFromHeader(page);
        await expect(async () => {
            const closeBtn = page.getByTestId('settings-shell-close');
            await dispatchPrimaryPointerDown(closeBtn);
            await dispatchDomClick(closeBtn);
            await expect(page.getByTestId('hami-settings-shell')).toBeHidden({ timeout: 3_000 });
        }).toPass({ timeout: 12_000 });
    });

    test('ورقة الشروط تُفتح من الحساب وتُغلق بـ Escape قبل المركز', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'account');
        await dispatchDomClick(page.getByTestId('settings-account-open-terms'));

        const sheet = page.getByTestId('account-legal-document-sheet');
        await expect(sheet).toBeVisible({ timeout: 8_000 });
        await expect(page.getByTestId('account-legal-document-body')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(sheet).toBeHidden({ timeout: 5_000 });
        await expect(shell).toBeVisible();
    });

    test('ورقة تخصيص المنظر تُفتح وتُغلق بزر الرجوع قبل المركز', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'appearance');
        await dispatchPrimaryPointerDown(page.getByTestId('appearance-block-customize-toggle'));

        const sheet = page.getByTestId('appearance-block-customize-sheet');
        await expect(sheet).toBeVisible({ timeout: 8_000 });

        await dispatchPrimaryPointerDown(page.getByTestId('appearance-block-customize-back'));
        await expect(sheet).toBeHidden({ timeout: 5_000 });
        await expect(shell).toBeVisible();
    });

    test('المنظر: حجم النص وأداء خفيف وفصل الخلفية دون رفع ملف', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'appearance');

        const large = page.getByTestId('settings-font-preset-large');
        await large.evaluate((el) => (el as HTMLElement).scrollIntoView({ block: 'center' }));
        await dispatchDomClick(large);
        await expect(large).toHaveAttribute('aria-checked', 'true', { timeout: 8_000 });

        await dispatchDomClick(page.getByTestId('settings-lite-on'));
        await expect(page.getByTestId('settings-lite-on')).toHaveAttribute('aria-checked', 'true', { timeout: 8_000 });

        await dispatchDomClick(page.getByTestId('appearance-chapter-wallpaper'));
        await expect(page.getByTestId('settings-wallpaper-upload')).toBeVisible({ timeout: 8_000 });
        await expect(shell).toBeVisible();
    });

    test('مسح البيانات يفتح حواراً وإلغاؤه يُبقي المركز مفتوحاً', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'data');
        await ensureSmartDialogInfrastructure(page);

        await expect(async () => {
            await dispatchDomClick(page.getByTestId('settings-wipe-start'));
            await expect(page.getByTestId('smart-dialog-overlay')).toBeVisible({ timeout: 4_000 });
        }).toPass({ timeout: 20_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('smart-dialog-overlay')).toBeHidden({ timeout: 5_000 });
        await expect(shell).toBeVisible();
        await expect(page.getByTestId('settings-wipe-start')).toBeVisible();
    });

    test('لوحة النسخ تُفتح وتُغلق بـ Escape دون تصدير أو استيراد', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'data');
        await expect(page.getByTestId('settings-backup-import')).toBeVisible();
        await dispatchDomClick(page.getByTestId('settings-backup-setup'));

        const panel = page.getByTestId('business-backup-export-panel');
        await expect(panel).toBeVisible({ timeout: 8_000 });

        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden({ timeout: 5_000 });
        await expect(shell).toBeVisible();
    });

    test('تبويب الأمان يعرض البيومتري والضبابية والقفل التلقائي وحماية اللقطة', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'security');

        await expect(page.getByTestId('settings-toggle-security-biometricLock')).toBeVisible();
        const privacyBlur = page.getByTestId('settings-toggle-security-privacyBlur');
        await expect(privacyBlur).toBeVisible();
        await expect(privacyBlur).toHaveAttribute('aria-checked', 'true');
        await expect(page.getByTestId('settings-toggle-security-screenshotDeterrent')).toBeVisible();
        await expect(page.getByTestId('settings-auto-lock-5')).toBeVisible();

        const lock15 = page.getByTestId('settings-auto-lock-15');
        await dispatchDomClick(lock15);
        await expect(lock15).toHaveAttribute('aria-checked', 'true', { timeout: 8_000 });

        await ensureSmartDialogInfrastructure(page);
        await privacyBlur.evaluate((el) => (el as HTMLElement).click());
        const dialog = page.getByTestId('smart-dialog-overlay');
        await expect(dialog).toBeVisible({ timeout: 8_000 });
        await expect(dialog).toContainText('إيقاف ضبابية الخصوصية');
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden({ timeout: 5_000 });
        await expect(privacyBlur).toHaveAttribute('aria-checked', 'true');
        await expect(shell).toBeVisible();
    });

    test('تبويب الحساب يعرض خيارات الجلسة دون تنفيذ خروج أو مسح', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'account');

        await expect(page.getByTestId('settings-account-open-terms')).toBeVisible();
        const logout = page.getByTestId('settings-account-logout');
        const login = page.getByTestId('settings-account-login');
        const hasLogout = await logout.isVisible().catch(() => false);
        const hasLogin = await login.isVisible().catch(() => false);
        expect(hasLogout || hasLogin).toBe(true);
        if (hasLogout) {
            await expect(page.getByTestId('settings-account-delete')).toBeVisible();
        }
    });
});
