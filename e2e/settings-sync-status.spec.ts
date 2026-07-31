/**
 * E2E — شفافية حالة المزامنة في الإعدادات.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';
import { openSettingsDataTab, openSettingsFromHeader, prepareSettingsE2E, switchSettingsTab, teardownSettingsE2E, enableLocalOnlyModeFromSecurity, activateSettingsTab, ensureSmartDialogInfrastructure } from './helpers/settingsFixtures';
import { prepareProductivityE2E } from './helpers/productivityE2EFixtures';

test.describe('حالة المزامنة في الإعدادات', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

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
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
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
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
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
        test.setTimeout(180_000);
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissBlockingOverlays(page);

        const shell = await openSettingsFromHeader(page);
        await switchSettingsTab(shell, 'security');
        await enableLocalOnlyModeFromSecurity(page);
        await activateSettingsTab(page, 'data');
        const status = page.getByTestId('settings-sync-status');
        await expect(async () => {
            await expect(page.getByTestId('settings-section-data')).toBeVisible({ timeout: 4_000 });
            await expect(status).toBeVisible({ timeout: 4_000 });
            await expect(status).toContainText('قطع الاتصال');
            await expect(status).toHaveAttribute('data-sync-tone', 'warning');
            await expect(page.getByTestId('settings-sync-now')).toBeHidden();
        }).toPass({ timeout: 25_000 });
        // إعادة ضبط localOnly في teardown عبر resetSettingsE2EPageState
    });

    test('Escape يغلق حوار التأكيد قبل الإعدادات', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissBlockingOverlays(page);

        const shell = await openSettingsDataTab(page);
        await ensureSmartDialogInfrastructure(page);
        await expect(async () => {
            await shell.getByRole('button', { name: 'إعادة ضبط' }).click({ force: true, noWaitAfter: true });
            await expect(page.getByTestId('smart-dialog-overlay')).toBeVisible({ timeout: 4_000 });
        }).toPass({ timeout: 20_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('smart-dialog-overlay')).toBeHidden({ timeout: 5_000 });
        await expect(shell).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(shell).toBeHidden({ timeout: 5_000 });
    });
});
