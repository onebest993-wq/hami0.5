/**
 * E2E — الملف المهني: فتح من الهيدر، بدون إحصائيات أو بطاقات فارغة.
 */
import { test, expect } from '@playwright/test';
import {
    prepareProfileE2E,
    bootLawyerDashboardForProfile,
    openLawyerProfile,
    openProfileStudio,
    dismissProfileBlockers,
    clickLawyerProfileBack,
    closeLawyerProfileTab,
    waitForProfileOpenToInteractiveMs,
    clearProfilePerfMarksInPage,
    E2E_PROFILE_COLD_OPEN_MS,
    E2E_PROFILE_CACHED_OPEN_MS,
} from './helpers/profileFixtures';

test.describe('الملف المهني', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileE2E(page);
    });

    test('يفتح من الهيدر بدون إحصائيات أو placeholders فارغة', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        const profile = await openLawyerProfile(page);

        await expect(profile.getByText('سنوات الخبرة')).toHaveCount(0);
        await expect(profile.getByText('ملفات الدعاوى')).toHaveCount(0);
        await expect(profile.getByText('ملفات التنفيذ')).toHaveCount(0);
        await expect(profile.getByText('الملاحظات')).toHaveCount(0);
        await expect(profile.getByText('مكان العمل والتخصص')).toHaveCount(0);
        await expect(profile.getByText('نبذة مهنية')).toHaveCount(0);
        await expect(profile.getByText('بيانات التواصل')).toHaveCount(0);

        await expect(profile.getByTestId('lawyer-profile-edit')).toBeVisible();
    });

    test('استوديو الصفحة يفتح ويعرض التبويبات الثلاثة', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        const sheet = await openProfileStudio(page);

        await expect(sheet.getByTestId('profile-settings-privacy-tab')).toBeVisible({ timeout: 12_000 });

        await sheet.getByTestId('profile-settings-tab-appearance').click({ force: true });
        await expect(sheet.getByTestId('profile-settings-appearance-tab')).toBeVisible({ timeout: 10_000 });

        await sheet.getByTestId('profile-settings-tab-containers').click({ force: true });
        await expect(sheet.getByTestId('profile-settings-containers-tab')).toBeVisible({ timeout: 10_000 });
    });

    test('زر الرجوع يعيد للوحة الرئيسية', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await openLawyerProfile(page);

        await page.getByRole('button', { name: 'العودة للرئيسية' }).click({ force: true, timeout: 10_000 });
        await expect(page.getByTestId('lawyer-profile')).toBeHidden({ timeout: 10_000 });
    });

    test('Escape يغلق استوديو الصفحة ثم يعيد للوحة', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await openProfileStudio(page);

        const profile = page.getByTestId('lawyer-profile');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('profile-settings-sheet')).toBeHidden({ timeout: 8_000 });
        await expect(profile).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(profile).toBeHidden({ timeout: 10_000 });
    });

    test('إغلاق التبويب وإعادة الفتح يعرض الاسم المحفوظ', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        const profile = await openLawyerProfile(page);
        const uniqueName = `محامٍ تبويب ${Date.now()}`;

        await profile.getByTestId('lawyer-profile-edit').click({ force: true, timeout: 10_000 });
        await profile.getByTestId('lawyer-profile-name-input').fill(uniqueName);
        await page.getByTestId('lawyer-profile-edit-save').click({ force: true, timeout: 10_000 });
        await expect(profile.getByTestId('lawyer-profile-name-input')).toBeHidden({ timeout: 20_000 });
        await expect(profile.locator('.hami-profile-hero-name')).toContainText(uniqueName, { timeout: 15_000 });

        await dismissProfileBlockers(page);
        await closeLawyerProfileTab(page);

        const reopened = await openLawyerProfile(page);
        await expect(reopened.locator('.hami-profile-hero-name')).toContainText(uniqueName, { timeout: 15_000 });
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await clearProfilePerfMarksInPage(page);
        await openLawyerProfile(page);

        const perfMs = await waitForProfileOpenToInteractiveMs(page, 25_000);
        expect(perfMs, 'يجب تسجيل hami:profile:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_PROFILE_COLD_OPEN_MS);
    });

    test('الفتح المتكرر ضمن حد زمني مع cache', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await openLawyerProfile(page);

        await closeLawyerProfileTab(page);

        await clearProfilePerfMarksInPage(page);

        const headerTrigger = page.getByTestId('header-profile-trigger');
        await headerTrigger.hover().catch(() => undefined);
        await openLawyerProfile(page);

        const perfMs = await waitForProfileOpenToInteractiveMs(page, 25_000);
        expect(perfMs, 'marks مع إعادة الدخول وكاش').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_PROFILE_CACHED_OPEN_MS);
    });
});
