/**
 * E2E — شفافية حالة المزامنة في الإعدادات.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';
import { openSettingsDataTab, openSettingsFromHeader, prepareSettingsE2E, teardownSettingsE2E } from './helpers/settingsFixtures';
import { prepareProductivityE2E } from './helpers/productivityE2EFixtures';

test.describe('حالة المزامنة في الإعدادات', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await prepareSettingsE2E(page);
        await seedLawyerFiles(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownSettingsE2E(page);
    });

    test('تعرض سطر حالة صادقاً في تبويب البيانات', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const shell = await openSettingsDataTab(page);
        const status = shell.getByTestId('settings-sync-status');
        await expect(status).toBeVisible({ timeout: 8_000 });
        const text = await status.innerText();
        expect(text.length).toBeGreaterThan(4);
        expect(
            /متوقفة|غير متاحة|آخر مزامنة|جاري المزامنة|لم تُنفَّذ|فشلت|قطع الاتصال/.test(text),
        ).toBe(true);
        await expect(status).toHaveAttribute('data-sync-tone', /^(muted|active|success|warning|error)$/);
    });

    test('تنعكس إيقاف المزامنة السحابية في النص', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const shell = await openSettingsDataTab(page);
        const toggle = shell.getByTestId('settings-toggle-data-cloudSync');
        if ((await toggle.getAttribute('aria-checked')) === 'true') {
            await toggle.click();
        }
        await expect(shell.getByTestId('settings-sync-status')).toContainText('معطّلة', { timeout: 5_000 });
        await expect(shell.getByTestId('settings-sync-status')).toHaveAttribute('data-sync-tone', 'muted');

        await toggle.click();
        await expect(shell.getByTestId('settings-sync-status')).not.toContainText('معطّلة', { timeout: 5_000 });
    });

    test('وضع قطع الاتصال يوقف المزامنة بشفافية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const shell = await openSettingsFromHeader(page);
        await shell.getByTestId('settings-nav-security').click();
        const localOnly = shell.getByTestId('settings-toggle-security-localOnlyMode');
        if ((await localOnly.getAttribute('aria-checked')) !== 'true') {
            await localOnly.click();
            await expect(page.getByTestId('smart-dialog-overlay')).toBeVisible({ timeout: 5_000 });
            await page.getByRole('button', { name: 'تأكيد' }).click();
        }
        await expect(shell.getByTestId('settings-local-only-banner')).toBeVisible({ timeout: 8_000 });

        await shell.getByTestId('settings-nav-data').click();
        await expect(shell.getByTestId('settings-sync-status')).toContainText('قطع الاتصال', { timeout: 5_000 });
        await expect(shell.getByTestId('settings-sync-status')).toHaveAttribute('data-sync-tone', 'warning');
        await expect(shell.getByTestId('settings-sync-now')).toBeHidden();

        await shell.getByTestId('settings-nav-security').click();
        await localOnly.click();
        await expect(shell.getByTestId('settings-local-only-banner')).toBeHidden({ timeout: 5_000 });
    });

    test('Escape يغلق حوار التأكيد قبل الإعدادات', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        const shell = await openSettingsDataTab(page);
        await shell.getByRole('button', { name: 'إعادة ضبط' }).click();
        await expect(page.getByTestId('smart-dialog-overlay')).toBeVisible({ timeout: 5_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('smart-dialog-overlay')).toBeHidden({ timeout: 5_000 });
        await expect(shell).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(shell).toBeHidden({ timeout: 5_000 });
    });
});
