/**
 * E2E — الملف المهني: الحفظ ووضع التعديل.
 */
import { test, expect } from '@playwright/test';
import { prepareProfileStudioE2E, openLawyerProfile, openProfileStudio } from './helpers/profileFixtures';

/** أصغر JPEG صالح لاختبار رفع الصورة */
const TINY_JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==',
    'base64',
);

test.describe('الملف المهني — التعديل والحفظ', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('وضع التعديل: تغيير الاسم والحفظ', async ({ page }) => {
        const profile = await openLawyerProfile(page);
        const uniqueName = `محامٍ E2E ${Date.now()}`;

        await profile.getByTestId('lawyer-profile-edit').click({ timeout: 8_000 });
        await expect(profile.getByTestId('lawyer-profile-name-input')).toBeVisible({ timeout: 8_000 });
        await expect(profile.getByTestId('lawyer-profile-title-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-phone-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-city-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-syndicate-input')).toHaveCount(0);

        await profile.getByTestId('lawyer-profile-name-input').fill(uniqueName);
        await page.getByTestId('lawyer-profile-edit-save').click({ timeout: 8_000 });

        await expect(profile.getByTestId('lawyer-profile-name-input')).toHaveCount(0, { timeout: 12_000 });
        await expect(profile.locator('.hami-profile-hero-name')).toContainText(uniqueName, { timeout: 12_000 });
    });

    test('إلغاء التعديل يستعيد الاسم دون حفظ', async ({ page }) => {
        const profile = await openLawyerProfile(page);
        const originalName = (await profile.locator('.hami-profile-hero-name').textContent())?.trim() ?? '';

        await profile.getByTestId('lawyer-profile-edit').click({ timeout: 8_000 });
        await profile.getByTestId('lawyer-profile-name-input').fill('اسم مؤقت لن يُحفظ');
        await page.getByTestId('lawyer-profile-edit-cancel').click({ timeout: 8_000 });

        await expect(profile.getByTestId('lawyer-profile-name-input')).toHaveCount(0, { timeout: 8_000 });
        await expect(profile.locator('.hami-profile-hero-name')).toContainText(originalName, { timeout: 8_000 });
    });

    test('رفع صورة المعرض في وضع التعديل', async ({ page }) => {
        const profile = await openLawyerProfile(page);

        await profile.getByTestId('lawyer-profile-edit').click({ timeout: 8_000 });
        await profile.getByTestId('lawyer-profile-gallery-input').setInputFiles({
            name: 'e2e-gallery.jpg',
            mimeType: 'image/jpeg',
            buffer: TINY_JPEG,
        });

        await expect(page.getByText(/تم رفع الصورة|تم حفظ الصورة محلياً/)).toBeVisible({ timeout: 12_000 });
    });

    test('الاستوديو لا يعرض قسم خصوصية الزوار', async ({ page }) => {
        const sheet = await openProfileStudio(page);
        await sheet.getByTestId('profile-settings-tab-appearance').click({ force: true });
        await expect(sheet.getByTestId('profile-settings-appearance-tab')).toBeVisible({ timeout: 10_000 });
        await expect(sheet.getByTestId('profile-settings-privacy-section')).toHaveCount(0);
    });
});
