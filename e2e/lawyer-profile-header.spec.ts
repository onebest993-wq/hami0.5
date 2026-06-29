/**
 * E2E — زر الملف في الهيدر: الاسم، التحديث بعد الحفظ، فتح التبويب.
 */
import { test, expect } from '@playwright/test';
import {
    prepareProfileStudioE2E,
    dismissProfileBlockers,
    openLawyerProfile,
    clickLawyerProfileBack,
} from './helpers/profileFixtures';

test.describe('هيدر الملف المهني', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('يعرض الاسم والشارة في الهيدر', async ({ page }) => {
        const trigger = page.getByTestId('header-profile-trigger');
        await expect(trigger).toBeVisible({ timeout: 12_000 });
        await expect(page.getByTestId('header-profile-name')).toBeVisible();
        await expect(page.getByTestId('header-profile-avatar')).toBeVisible();
        await expect(page.getByTestId('header-profile-name')).not.toHaveText('');
    });

    test('يحدّث اسم الهيدر بعد حفظ الملف', async ({ page }) => {
        await dismissProfileBlockers(page);

        const uniqueName = `محامٍ هيدر ${Date.now()}`;
        const profile = await openLawyerProfile(page);

        await profile.getByTestId('lawyer-profile-edit').click({ timeout: 8_000 });
        await profile.getByTestId('lawyer-profile-name-input').fill(uniqueName);
        await page.getByTestId('lawyer-profile-edit-save').click({ timeout: 8_000 });
        await expect(profile.getByTestId('lawyer-profile-name-input')).toBeHidden({ timeout: 15_000 });
        await expect(profile.locator('.hami-profile-hero-name')).toContainText(uniqueName, {
            timeout: 12_000,
        });

        await dismissProfileBlockers(page);
        await clickLawyerProfileBack(page);
        await expect(page.getByTestId('lawyer-profile')).toBeHidden({ timeout: 8_000 });

        await expect(page.getByTestId('header-profile-name')).toContainText(uniqueName, {
            timeout: 12_000,
        });
    });
});
