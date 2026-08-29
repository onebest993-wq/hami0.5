/**
 * E2E — هوية الملف على بلاطة المنتدى: الاسم، التحديث بعد الحفظ، فتح التبويب.
 */
import { test, expect } from '@playwright/test';
import {
    prepareProfileStudioE2E,
    dismissProfileBlockers,
    openLawyerProfile,
    clickLawyerProfileBack,
    profileDisplayName,
    saveProfileDisplayName,
    expectProfileTabClosed,
} from './helpers/profileFixtures';

test.describe('هوية الملف على بلاطة المنتدى', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('يعرض الاسم والصورة في بلاطة المنتدى', async ({ page }) => {
        const forum = page.getByTestId('home-dock-forum');
        await expect(forum).toBeVisible({ timeout: 15_000 });
        const profileQuarter = page.getByTestId('home-dock-forum-profile');
        await expect(profileQuarter).toBeVisible({ timeout: 12_000 });
        await expect(page.getByTestId('home-dock-forum-profile-avatar')).toBeVisible({ timeout: 12_000 });
        await expect(forum).toContainText('المنتدى');
        await expect(profileQuarter).not.toHaveText(/^\s*$/, { timeout: 12_000 });
    });

    test('يحدّث الاسم في بلاطة المنتدى بعد حفظ الملف', async ({ page }) => {
        await dismissProfileBlockers(page);

        const uniqueName = `محامٍ هيدر ${Date.now()}`;
        const profile = await openLawyerProfile(page);
        await saveProfileDisplayName(page, profile, uniqueName);

        const nameOnProfile = profileDisplayName(profile);
        const savedName =
            (await nameOnProfile.count()) > 0
                ? ((await nameOnProfile.textContent()) ?? uniqueName).trim()
                : uniqueName;

        await dismissProfileBlockers(page);
        await clickLawyerProfileBack(page);
        await expectProfileTabClosed(page);

        const tile = page.getByTestId('home-dock-forum-profile');
        await expect(tile).toHaveAttribute('data-identity-settled', '1', { timeout: 15_000 });
        await expect(tile).toContainText(savedName || uniqueName, {
            timeout: 15_000,
        });
    });
});
