/**
 * E2E — مركز الإعدادات: فتح، تبويبات، اختيارات، Escape، إعادة فتح.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { openSettingsFromHeader, switchSettingsTab, readSettingsOpenToInteractiveMs, clearSettingsPerfMarksInPage, E2E_SETTINGS_COLD_OPEN_MS, E2E_SETTINGS_CACHED_OPEN_MS, prepareSettingsE2E, teardownSettingsE2E, enableLocalOnlyModeFromSecurity } from './helpers/settingsFixtures';

async function openSettings(page: import('@playwright/test').Page) {
    return openSettingsFromHeader(page);
}

test.describe('مركز الإعدادات', () => {
    test.describe.configure({ mode: 'serial', timeout: 150_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await prepareSettingsE2E(page);
        await seedLawyerFiles(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownSettingsE2E(page);
    });

    test('يفتح من الهيدر ويعرض تبويب المنظر', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await expect(shell).toHaveAttribute('aria-modal', 'true');
        await expect(shell.getByRole('heading', { name: 'مركز الإعدادات' })).toBeVisible();
        await expect(shell.getByTestId('settings-section-appearance')).toBeVisible({ timeout: 10_000 });
        await expect(shell.getByTestId('settings-nav-appearance')).toHaveAttribute('aria-selected', 'true');
    });

    test('التبويبات تتبدّل بين الأقسام الأربعة', async ({ page }) => {
        test.setTimeout(240_000);
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);

        await switchSettingsTab(shell, 'security');
        await expect(shell.getByTestId('settings-section-security')).toBeVisible({ timeout: 12_000 });

        await switchSettingsTab(shell, 'data');
        await expect(shell.getByTestId('settings-section-data')).toBeVisible({ timeout: 12_000 });

        await switchSettingsTab(shell, 'account');
        await expect(shell.getByTestId('settings-section-account')).toBeVisible({ timeout: 12_000 });

        await switchSettingsTab(shell, 'appearance');
        await expect(shell.getByTestId('settings-section-appearance')).toBeVisible({ timeout: 10_000 });
    });

    test('Escape يغلق الإعدادات', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        await openSettings(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('hami-settings-shell')).toBeHidden({ timeout: 5_000 });
    });

    test('إعادة الفتح تحافظ على آخر تبويب في الجلسة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await switchSettingsTab(shell, 'data');
        await expect(shell.getByTestId('settings-section-data')).toBeVisible({ timeout: 12_000 });

        await page.keyboard.press('Escape');
        await expect(shell).toBeHidden({ timeout: 5_000 });

        const shell2 = await openSettings(page);
        await expect(shell2.getByTestId('settings-section-data')).toBeVisible({ timeout: 12_000 });
        await expect(shell2.getByTestId('settings-nav-data')).toHaveAttribute('aria-selected', 'true');
    });

    test('مفتاح تقليل الحركة يُحفظ بعد الإغلاق وإعادة الفتح', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        const toggle = shell.getByTestId('settings-toggle-appearance-reduceMotion');
        const initial = await toggle.getAttribute('aria-checked');

        await toggle.click();
        const after = await toggle.getAttribute('aria-checked');
        expect(after).not.toBe(initial);

        await page.keyboard.press('Escape');
        await expect(shell).toBeHidden({ timeout: 5_000 });

        const shell2 = await openSettings(page);
        await expect(shell2.getByTestId('settings-toggle-appearance-reduceMotion')).toHaveAttribute(
            'aria-checked',
            after!,
        );
    });

    test('اختيار حجم الخط يُطبَّق', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await shell.getByTestId('settings-font-large').click();
        await expect(shell.getByTestId('settings-font-large')).toHaveClass(/ring-\[#E6C673\]/);
    });

    test('Tab يبقى داخل الإعدادات (focus trap)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        await openSettings(page);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        const focusInside = await page.evaluate(() => {
            const root = document.querySelector('[data-testid="hami-settings-shell"]');
            return root instanceof HTMLElement && root.contains(document.activeElement);
        });
        expect(focusInside).toBe(true);
    });

    test('يعرض حالة المزامنة الصادقة في تبويب البيانات', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await switchSettingsTab(shell, 'data');
        await expect(shell.getByTestId('settings-sync-status')).toBeVisible({ timeout: 12_000 });
        const statusText = await shell.getByTestId('settings-sync-status').innerText();
        expect(statusText.length).toBeGreaterThan(4);
        expect(
            /متوقفة|غير متاحة|آخر مزامنة|جاري المزامنة|لم تُنفَّذ|فشلت/.test(statusText),
        ).toBe(true);
    });

    test('تبويب الأمان — تبديل حماية لقطة الشاشة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await switchSettingsTab(shell, 'security');

        const toggle = shell.getByTestId('settings-toggle-security-screenshotDeterrent');
        const before = await toggle.getAttribute('aria-checked');
        await toggle.click();
        expect(await toggle.getAttribute('aria-checked')).not.toBe(before);
    });

    test('تبويب الأمان — تبديل تمويه الخروج يُحدّث aria-checked', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await switchSettingsTab(shell, 'security');

        const toggle = shell.getByTestId('settings-toggle-security-privacyBlur');
        const before = await toggle.getAttribute('aria-checked');
        await toggle.click();
        const after = await toggle.getAttribute('aria-checked');
        expect(after).not.toBe(before);
    });

    test('تبويب الأمان — قطع الاتصال يُظهر البanner', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await switchSettingsTab(shell, 'security');
        await enableLocalOnlyModeFromSecurity(page);
    });

    test('تبويب البيانات — تبديل الحفظ التلقائي', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await switchSettingsTab(shell, 'data');

        const autoSaveRow = shell.getByRole('switch', { name: 'حفظ تلقائي' });
        const before = await autoSaveRow.getAttribute('aria-checked');
        await autoSaveRow.click();
        await expect(autoSaveRow).not.toHaveAttribute('aria-checked', before!);
    });

    test('تبويب الحساب يعرض الدعم الفني', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await switchSettingsTab(shell, 'account');
        await expect(shell.getByTestId('settings-section-account')).toBeVisible({ timeout: 12_000 });
        await expect(shell.getByRole('button', { name: 'الدعم الفني' })).toBeVisible({ timeout: 8_000 });
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        await openSettings(page);

        const perfMs = await readSettingsOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:settings:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_SETTINGS_COLD_OPEN_MS);
    });

    test('إعادة الفتح ضمن حد زمني مع chunk محمّل', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page, false, undefined, { requireHub: false });
        await dismissProductivityBlockers(page);

        const shell = await openSettings(page);
        await expect(shell.getByTestId('settings-section-appearance')).toBeVisible({ timeout: 20_000 });

        await shell.getByTestId('settings-shell-close').click();
        await expect(page.getByTestId('hami-settings-shell')).toBeHidden({ timeout: 8_000 });
        await clearSettingsPerfMarksInPage(page);

        await openSettings(page);

        const perfMs = await readSettingsOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع فتح متكرر').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_SETTINGS_CACHED_OPEN_MS);
    });
});
