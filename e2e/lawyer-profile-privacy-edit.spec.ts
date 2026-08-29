/**
 * E2E — الملف المهني: الحفظ ووضع التعديل.
 */
import { test, expect } from '@playwright/test';
import {
    prepareProfileStudioE2E,
    openLawyerProfile,
    openProfileStudio,
    clickProfileStudioTab,
    profileDisplayName,
    uploadProfileGalleryImage,
    reopenLawyerProfileFromHome,
    waitForProfileEditSaved,
    visibleProfileRoot,
} from './helpers/profileFixtures';
import { clickNativeElement } from './helpers/executionE2EBoot';

test.describe('الملف المهني — التعديل والحفظ', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('وضع التعديل: تغيير الاسم والحفظ', async ({ page }) => {
        const profile = await openLawyerProfile(page);
        const uniqueName = `محامٍ E2E ${Date.now()}`;

        await clickNativeElement(profile.getByTestId('lawyer-profile-edit'));
        await expect(profile.getByTestId('lawyer-profile-name-input')).toBeVisible({ timeout: 8_000 });
        await expect(profile.getByTestId('lawyer-profile-title-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-phone-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-city-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-syndicate-input')).toHaveCount(0);

        await profile.getByTestId('lawyer-profile-name-input').fill(uniqueName);
        await page.getByTestId('lawyer-profile-edit-save').evaluate((el) =>
            (el as HTMLButtonElement).click(),
        );

        await expect(profile.getByTestId('lawyer-profile-name-input')).toHaveCount(0, { timeout: 12_000 });
        await expect(profileDisplayName(profile)).toContainText(uniqueName, { timeout: 12_000 });
    });

    test('إلغاء التعديل يستعيد الاسم دون حفظ', async ({ page }) => {
        const profile = await openLawyerProfile(page);
        const originalName = (await profileDisplayName(profile).textContent())?.trim() ?? '';

        await clickNativeElement(profile.getByTestId('lawyer-profile-edit'));
        await profile.getByTestId('lawyer-profile-name-input').fill('اسم مؤقت لن يُحفظ');
        await clickNativeElement(page.getByTestId('lawyer-profile-edit-cancel'));

        await expect(profile.getByTestId('lawyer-profile-name-input')).toHaveCount(0, { timeout: 8_000 });
        await expect(profileDisplayName(profile)).toContainText(originalName, { timeout: 8_000 });
    });

    test('رفع صورة المعرض يبقى بعد الحفظ وإعادة الفتح', async ({ page }) => {
        const profile = await openLawyerProfile(page);

        await clickNativeElement(profile.getByTestId('lawyer-profile-edit'));
        await uploadProfileGalleryImage(page);
        await expect(profile.getByTestId('profile-gallery-tile-0')).toBeVisible({ timeout: 12_000 });
        await expect(profile.getByTestId('lawyer-profile-gallery')).toHaveAttribute(
            'data-empty',
            'false',
        );

        await page.getByTestId('lawyer-profile-edit-save').evaluate((el) =>
            (el as HTMLButtonElement).click(),
        );
        await waitForProfileEditSaved(page, profile);
        await expect(profile.getByTestId('profile-gallery-tile-0')).toBeVisible({ timeout: 12_000 });

        const reopened = await reopenLawyerProfileFromHome(page);
        await expect(reopened.getByTestId('lawyer-profile-gallery')).toHaveAttribute(
            'data-empty',
            'false',
            { timeout: 15_000 },
        );
        await expect(reopened.getByTestId('profile-gallery-tile-0')).toBeVisible({ timeout: 10_000 });
        await expect(reopened.getByText('لا صور بعد')).toHaveCount(0);
    });

    test('قناة الهاتف تبقى بعد الحفظ وإعادة الفتح', async ({ page }) => {
        const phone = `0780${String(Date.now()).slice(-7)}`;
        const profile = await openLawyerProfile(page);

        await clickNativeElement(profile.getByTestId('lawyer-profile-edit'));
        const addCall = page.getByTestId('profile-contact-add-call');
        await expect(addCall).toBeVisible({ timeout: 8_000 });
        await addCall.evaluate((el) => (el as HTMLButtonElement).click());
        const valueInput = page.getByTestId('profile-contact-edit-value').last();
        await expect(valueInput).toBeVisible({ timeout: 8_000 });
        await valueInput.fill(phone);

        await page.getByTestId('lawyer-profile-edit-save').evaluate((el) =>
            (el as HTMLButtonElement).click(),
        );
        await waitForProfileEditSaved(page, profile);
        await expect(visibleProfileRoot(page).getByText(phone)).toBeVisible({ timeout: 12_000 });

        const reopened = await reopenLawyerProfileFromHome(page);
        await expect(reopened.getByText(phone)).toBeVisible({ timeout: 15_000 });
        await expect(
            reopened.locator('[data-testid="profile-contact-channel-row"][data-contact-type="call"]'),
        ).toBeVisible();
    });

    test('الاستوديو لا يعرض قسم خصوصية الزوار', async ({ page }) => {
        const sheet = await openProfileStudio(page);
        await clickProfileStudioTab(page, 'profile-settings-tab-appearance');
        await expect(sheet.getByTestId('profile-settings-appearance-tab')).toBeVisible({ timeout: 10_000 });
        await expect(sheet.getByTestId('profile-settings-privacy-section')).toHaveCount(0);
    });
});
