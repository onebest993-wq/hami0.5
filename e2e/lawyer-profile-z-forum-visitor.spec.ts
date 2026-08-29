/**
 * E2E — ملف مهني زائر من المنتدى: overlay، بدون تحرير، رجوع.
 * الاسم z-forum — يُشغَّل أخيراً أبجدياً بعد بقية lawyer-profile-*.
 */
import { test, expect } from '@playwright/test';
import { prepareForumE2E, dismissForumBlockers, closeForumIfOpen } from './helpers/forumFixtures';
import {
    prepareProfileE2E,
    resetProfileScreenForE2E,
    dismissProfileBlockers,
    seedForumVisitorProfileContext,
    ensureForumVisitorPostSeeded,
    openForumVisitorAuthorProfile,
    profileDisplayName,
    clickVisibleProfileBack,
    bootLawyerDashboardForProfile,
    E2E_FORUM_VISITOR_AUTHOR_NAME,
} from './helpers/profileFixtures';

test.describe('ملف زائر من المنتدى', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileE2E(page);
        await seedForumVisitorProfileContext(page);
        await prepareForumE2E(page);
    });

    test.afterEach(async ({ page }) => {
        if (page.isClosed()) return;
        await resetProfileScreenForE2E(page);
        await page.keyboard.press('Escape').catch(() => undefined);
        await closeForumIfOpen(page).catch(() => undefined);
    });

    test('يفتح ملف عضو آخر بدون أزرار التحرير أو الاستوديو', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await ensureForumVisitorPostSeeded(page);
        await dismissProfileBlockers(page);

        const profile = await openForumVisitorAuthorProfile(page);
        await expect(profile.getByTestId('lawyer-profile-loading')).toHaveCount(0, { timeout: 15_000 });
        await expect(profileDisplayName(profile)).toContainText(E2E_FORUM_VISITOR_AUTHOR_NAME, {
            timeout: 15_000,
        });

        await expect(profile.getByTestId('lawyer-profile-edit')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-settings')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-page-access')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-avatar-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-gallery-input')).toHaveCount(0);
    });

    test('زر الرجوع يغلق overlay المنتدى', async ({ page }) => {
        await bootLawyerDashboardForProfile(page);
        await ensureForumVisitorPostSeeded(page);
        await dismissProfileBlockers(page);

        const overlay = page.getByTestId('forum-member-profile');
        await openForumVisitorAuthorProfile(page);
        await clickVisibleProfileBack(page);
        await expect(overlay).toBeHidden({ timeout: 12_000 });
        await expect(page.getByTestId('forum-screen-shell')).toBeVisible({ timeout: 12_000 });
    });
});
