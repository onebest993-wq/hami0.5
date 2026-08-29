/**
 * E2E — الملف المهني: فتح من الهيدر، بدون إحصائيات أو بطاقات فارغة.
 */
import { test, expect } from '@playwright/test';
import {
    prepareProfileE2E,
    resetProfileScreenForE2E,
    bootLawyerDashboardForProfile,
    openLawyerProfile,
    openProfileStudio,
    clickProfileStudioTab,
    profileDisplayName,
    saveProfileDisplayName,
    closeLawyerProfileTab,
    clickLawyerProfileBack,
    expectProfileTabClosed,
    reopenLawyerProfileFromHome,
    waitForProfileOpenToInteractiveMs,
    clearProfilePerfMarksInPage,
    E2E_PROFILE_COLD_OPEN_MS,
    E2E_PROFILE_CACHED_OPEN_MS,
} from './helpers/profileFixtures';

test.describe('الملف المهني', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileE2E(page);
        await resetProfileScreenForE2E(page);
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

    test('استوديو الصفحة يفتح ويعرض تبويبي المظهر والمحتويات', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        const sheet = await openProfileStudio(page);

        await clickProfileStudioTab(page, 'profile-settings-tab-appearance');
        await expect(sheet.getByTestId('profile-settings-appearance-tab')).toBeVisible({ timeout: 10_000 });
        await expect(sheet.getByTestId('profile-settings-privacy-section')).toHaveCount(0);

        await clickProfileStudioTab(page, 'profile-settings-tab-containers');
        await expect(sheet.getByTestId('profile-settings-containers-tab')).toBeVisible({ timeout: 10_000 });
    });

    test('زر الرجوع يعيد للوحة الرئيسية', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await openLawyerProfile(page);

        await clickLawyerProfileBack(page);
        await expectProfileTabClosed(page);
        await expect(page.getByTestId('home-dock-forum-profile')).toBeVisible({ timeout: 10_000 });
    });

    test('Escape يغلق استوديو الصفحة ثم يعيد للوحة', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await openProfileStudio(page);

        const profile = page.getByTestId('lawyer-profile');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('profile-settings-sheet')).toBeHidden({ timeout: 8_000 });
        await expect(profile).toBeVisible();

        await page.keyboard.press('Escape');
        await expectProfileTabClosed(page);
        await expect(page.getByTestId('home-dock-forum-profile')).toBeVisible({ timeout: 10_000 });
    });

    test('إغلاق التبويب وإعادة الفتح يعرض الاسم المحفوظ', { timeout: 240_000 }, async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        const profile = await openLawyerProfile(page);
        const uniqueName = `محامٍ تبويب ${Date.now()}`;

        await saveProfileDisplayName(page, profile, uniqueName);

        const reopened = await reopenLawyerProfileFromHome(page);
        await expect(profileDisplayName(reopened)).toContainText(uniqueName, { timeout: 15_000 });
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

        await openLawyerProfile(page);

        const perfMs = await waitForProfileOpenToInteractiveMs(page, 25_000);
        expect(perfMs, 'marks مع إعادة الدخول وكاش').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_PROFILE_CACHED_OPEN_MS);
    });

    test('صفحة كاملة ثم اعتماد الشجرة الحية — خصوصية على الشجرة الحية', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        const profile = await openLawyerProfile(page);

        await expect(profile.getByTestId('lawyer-profile-edit')).toBeVisible();
        await expect(profile.getByTestId('lawyer-profile-gallery')).toBeVisible();
        await expect(profile.getByTestId('lawyer-profile-page-access')).toBeVisible();
        await expect(page.locator('[data-profile-page-body]').first()).toBeVisible();
        await expect(page.locator('[data-profile-live-tree]')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('[data-profile-open-first-page]')).toHaveCount(0, {
            timeout: 15_000,
        });

        const access = page
            .locator('[data-profile-live-tree]')
            .getByTestId('lawyer-profile-page-access');
        await expect(access).toBeEnabled({ timeout: 8_000 });
        const before = await access.getAttribute('data-page-access', { timeout: 8_000 });
        await access.evaluate((el) => (el as HTMLButtonElement).click());
        await expect(access).not.toHaveAttribute('data-page-access', before ?? '', {
            timeout: 8_000,
        });
        await expect(access).toBeEnabled({ timeout: 8_000 });
    });
});
