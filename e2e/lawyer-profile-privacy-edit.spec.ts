/**
 * E2E — الملف المهني: الخصوصية، الحفظ، وضع التعديل.
 */
import { test, expect } from '@playwright/test';
import { prepareProfileStudioE2E, openLawyerProfile, openProfileStudio, reopenProfileStudio } from './helpers/profileFixtures';

async function luxuryToggleOn(locator: import('@playwright/test').Locator) {
    return locator.locator('.profile-settings-luxury-toggle');
}

/** أصغر JPEG صالح لاختبار رفع الصورة */
const TINY_JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==',
    'base64',
);

test.describe('الملف المهني — الخصوصية والتعديل', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('تبويب الخصوصية: كل مفتاح قابل للتبديل', async ({ page }) => {
        const sheet = await openProfileStudio(page);
        await expect(sheet.getByTestId('profile-settings-privacy-tab')).toBeVisible({ timeout: 10_000 });

        const toggles = [
            'profile-privacy-toggle-contact-channels',
            'profile-privacy-toggle-gallery',
            'profile-privacy-toggle-custom-blocks',
            'profile-privacy-toggle-phone-meta',
            'profile-privacy-toggle-city-meta',
            'profile-privacy-toggle-syndicate',
        ] as const;

        for (const id of toggles) {
            const btn = sheet.getByTestId(id);
            const toggle = await luxuryToggleOn(btn);
            const before = await toggle.getAttribute('data-on');
            await btn.scrollIntoViewIfNeeded();
            await btn.click({ force: true });
            await expect(toggle).toHaveAttribute('data-on', before === 'true' ? 'false' : 'true');
        }
    });

    test('حفظ إعدادات الخصوصية يثبت التغيير بعد إعادة الفتح', async ({ page }) => {
        const sheet = await openProfileStudio(page);
        const galleryBtn = sheet.getByTestId('profile-privacy-toggle-gallery');
        const galleryToggle = await luxuryToggleOn(galleryBtn);
        const initialOn = await galleryToggle.getAttribute('data-on');

        if (initialOn === 'true') {
            await galleryBtn.click();
            await expect(galleryToggle).toHaveAttribute('data-on', 'false');
        }

        await sheet.getByTestId('profile-settings-save').click();
        await expect(sheet).toBeHidden({ timeout: 10_000 });

        const reopened = await reopenProfileStudio(page);
        await expect(await luxuryToggleOn(reopened.getByTestId('profile-privacy-toggle-gallery'))).toHaveAttribute(
            'data-on',
            'false',
        );
    });

    test('وضع التعديل: تغيير الاسم والحفظ', async ({ page }) => {
        const profile = await openLawyerProfile(page);
        const uniqueName = `محامٍ E2E ${Date.now()}`;

        await profile.getByTestId('lawyer-profile-edit').click({ timeout: 8_000 });
        await expect(profile.getByTestId('lawyer-profile-name-input')).toBeVisible({ timeout: 8_000 });

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

    test('إخفاء قناة تواصل من تبويب الخصوصية', async ({ page }) => {
        const profile = await openLawyerProfile(page);

        await profile.getByTestId('lawyer-profile-edit').click({ timeout: 8_000 });
        const addContact = profile.getByTestId('lawyer-profile-add-contact');
        await addContact.scrollIntoViewIfNeeded();
        await addContact.click({ timeout: 8_000 });
        await page.getByTestId('lawyer-profile-edit-save').click({ timeout: 8_000 });
        await expect(profile.getByTestId('lawyer-profile-name-input')).toHaveCount(0, { timeout: 12_000 });

        const sheet = await reopenProfileStudio(page);
        const visibilityBtn = sheet.locator('[data-testid^="profile-privacy-contact-visibility-"]').first();
        await expect(visibilityBtn).toBeVisible({ timeout: 8_000 });
        await visibilityBtn.click();
        await sheet.getByTestId('profile-settings-save').click();
        await expect(sheet).toBeHidden({ timeout: 10_000 });
    });
});
