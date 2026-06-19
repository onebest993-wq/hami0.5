/**
 * E2E — الملف المهني: فتح من الهيدر، بدون إحصائيات أو بطاقات فارغة.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';

test.describe('الملف المهني', () => {
    test.describe.configure({ timeout: 60_000 });

    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
    });

    test('يفتح من الهيدر بدون إحصائيات أو placeholders فارغة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await page.getByTestId('header-profile-trigger').click({ timeout: 15_000 });

        const profile = page.getByTestId('lawyer-profile');
        await expect(profile).toBeVisible({ timeout: 12_000 });

        await expect(profile.getByText('سنوات الخبرة')).toHaveCount(0);
        await expect(profile.getByText('ملفات الدعاوى')).toHaveCount(0);
        await expect(profile.getByText('ملفات التنفيذ')).toHaveCount(0);
        await expect(profile.getByText('الملاحظات')).toHaveCount(0);
        await expect(profile.getByText('مكان العمل والتخصص')).toHaveCount(0);
        await expect(profile.getByText('نبذة مهنية')).toHaveCount(0);
        await expect(profile.getByText('بيانات التواصل')).toHaveCount(0);

        await expect(profile.getByTestId('lawyer-profile-edit')).toBeVisible();
    });

    test('زر الرجوع يعيد للوحة الرئيسية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await page.getByTestId('header-profile-trigger').click({ timeout: 15_000 });
        await expect(page.getByTestId('lawyer-profile')).toBeVisible({ timeout: 12_000 });

        await page.getByRole('button', { name: 'العودة للرئيسية' }).click({ timeout: 8_000 });
        await expect(page.getByTestId('lawyer-profile')).toBeHidden({ timeout: 8_000 });
    });
});
