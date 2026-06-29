/**
 * E2E — ملف مهني زائر من المنتدى: overlay، بدون تحرير، رجوع.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard } from './helpers/civilLawsuitFixtures';
import { prepareForumE2E, dismissForumBlockers, closeForumIfOpen } from './helpers/forumFixtures';
import {
    prepareProfileE2E,
    dismissProfileBlockers,
    seedForumVisitorProfileContext,
    ensureForumVisitorPostSeeded,
    openForumVisitorAuthorProfile,
    E2E_FORUM_VISITOR_AUTHOR_NAME,
} from './helpers/profileFixtures';

test.describe('ملف زائر من المنتدى', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareForumE2E(page);
        await prepareProfileE2E(page);
        await seedForumVisitorProfileContext(page);
    });

    test.afterEach(async ({ page }) => {
        if (page.isClosed()) return;
        await page.keyboard.press('Escape').catch(() => undefined);
        await closeForumIfOpen(page).catch(() => undefined);
    });

    test('يفتح ملف عضو آخر بدون أزرار التحرير أو الاستوديو', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await ensureForumVisitorPostSeeded(page);
        await dismissProfileBlockers(page);

        const profile = await openForumVisitorAuthorProfile(page);
        await expect(profile.getByTestId('lawyer-profile-loading')).toHaveCount(0);
        await expect(profile.locator('.hami-profile-hero-name')).toContainText(E2E_FORUM_VISITOR_AUTHOR_NAME, {
            timeout: 12_000,
        });

        await expect(profile.getByTestId('lawyer-profile-edit')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-settings')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-avatar-input')).toHaveCount(0);
        await expect(profile.getByTestId('lawyer-profile-gallery-input')).toHaveCount(0);
    });

    test('زر الرجوع يغلق overlay المنتدى', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await ensureForumVisitorPostSeeded(page);
        await dismissProfileBlockers(page);
        await openForumVisitorAuthorProfile(page);
        await page.getByTestId('lawyer-profile-back').click({ timeout: 8_000 });
        await expect(page.getByTestId('forum-member-profile')).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('forum-screen')).toBeVisible();
    });
});
