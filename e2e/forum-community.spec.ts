/**
 * E2E — المنتدى القانوني: فتح من الرئيسية، أقسام، بحث، FAB، Escape، رجوع.
 */
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    dismissForumBlockers,
    prepareForumE2E,
    readForumOpenToInteractiveMs,
    E2E_FORUM_COLD_OPEN_MS,
    E2E_FORUM_CACHED_OPEN_MS,
    closeForumIfOpen,
    clearForumPerfMarksInPage,
    openForumFromHome,
} from './helpers/forumFixtures';

async function switchForumSection(page: Page, section: 'forum' | 'groups' | 'repository') {
    await dismissForumBlockers(page);
    const tab = page.getByTestId(`forum-section-tab-${section}`);
    if ((await tab.getAttribute('aria-selected')) === 'true') {
        await expect(page.getByTestId(`forum-section-${section}`)).toBeVisible({ timeout: 10_000 });
        return;
    }
    await tab.scrollIntoViewIfNeeded();
    await tab.click({ timeout: 10_000, force: true });
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 8_000 });
    await expect(page.getByTestId(`forum-section-${section}`)).toBeVisible({ timeout: 10_000 });
}

test.describe('المنتدى القانوني', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareForumE2E(page);
        await seedLawyerFiles(page);
    });

    test.afterEach(async ({ page }) => {
        if (page.isClosed()) return;
        const screen = page.getByTestId('forum-screen');
        const loading = page.getByTestId('forum-screen-loading');
        const open =
            (await screen.isVisible().catch(() => false)) ||
            (await loading.isVisible().catch(() => false));
        if (open) {
            await closeForumIfOpen(page).catch(() => undefined);
        }
    });

    test('يفتح من الرئيسية ويعرض الشريط والأقسام', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const screen = await openForumFromHome(page);
        await expect(screen.getByTestId('forum-section-switch')).toBeVisible();
        await expect(page.getByTestId('forum-section-tab-forum')).toBeVisible();
        await expect(page.getByTestId('forum-section-forum')).toBeVisible();
        await expect(page.getByTestId('forum-post-list')).toBeVisible({ timeout: 20_000 });
    });

    test('يبدّل بين أقسام المنتدى والمجموعات والمستودع', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);
        await switchForumSection(page, 'groups');
        await expect(page.getByTestId('forum-groups-directory')).toBeVisible();

        await switchForumSection(page, 'repository');
        await expect(page.getByTestId('forum-legal-repository')).toBeVisible();

        await switchForumSection(page, 'forum');
        await expect(page.getByTestId('forum-post-list')).toBeVisible();
    });

    test('يفتح البحث ويغلقه بـ Escape', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);
        await switchForumSection(page, 'forum');
        await dismissForumBlockers(page);
        await page.getByTestId('forum-search-trigger').click({ force: true });
        await expect(page.getByTestId('forum-search-overlay')).toBeVisible({ timeout: 10_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('forum-search-overlay')).toBeHidden({ timeout: 5_000 });
    });

    test('يفتح نموذج طرح استشارة ويغلقه بـ Escape', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);
        await switchForumSection(page, 'forum');
        await dismissForumBlockers(page);
        await page.getByTestId('forum-add-question-fab').click({ force: true });
        await expect(page.getByTestId('forum-add-question-sheet')).toBeVisible({ timeout: 10_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('forum-add-question-sheet')).toBeHidden({ timeout: 5_000 });
    });

    test('Escape من الشاشة الرئيسية يعود للوحة المحامي', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('forum-screen')).toBeHidden({ timeout: 10_000 });
        await expect(page.getByTestId('home-dock-forum')).toBeVisible();
    });

    test('زر الرجوع يغلق المنتدى وإعادة الفتح تعمل', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);
        await dismissForumBlockers(page);
        await page.getByTestId('forum-back').click({ force: true });
        await expect(page.getByTestId('forum-screen')).toBeHidden({ timeout: 10_000 });

        await openForumFromHome(page);
        await expect(page.getByTestId('forum-app-bar')).toBeVisible();
    });

    test('يفتح التنبيهات ويغلقها بـ Escape', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);
        await switchForumSection(page, 'forum');
        await dismissForumBlockers(page);
        await page.getByTestId('forum-notifications-trigger').click({ force: true });
        await expect(page.getByTestId('forum-notifications-panel')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId('forum-notifications-trigger')).toHaveAttribute('aria-expanded', 'true');

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('forum-notifications-panel')).toBeHidden({ timeout: 5_000 });
        await expect(page.getByTestId('forum-screen')).toBeVisible({ timeout: 8_000 });
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);

        const perfMs = await readForumOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:forum:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_FORUM_COLD_OPEN_MS);
    });

    test('الفتح مع cache محلي ضمن حد زمني', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openForumFromHome(page);
        await expect(page.getByTestId('forum-post-list')).toBeVisible({ timeout: 20_000 });

        await closeForumIfOpen(page);
        await clearForumPerfMarksInPage(page);
        await openForumFromHome(page);

        const perfMs = await readForumOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع فتح متكرر').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_FORUM_CACHED_OPEN_MS);
    });
});
