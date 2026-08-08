/**
 * E2E — الواجهة الرئيسية: المنطقة الرئيسية، شبكة البطاقات، والتنقل.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';
import {
    expectHomeMainShell,
    prepareHomeMainE2E,
} from './helpers/homeMainFixtures';
import {
    ensureTransactionsDashboard,
    openTransactionsFromHome,
    waitForTransactionsHubClosed,
} from './helpers/transactionsFixtures';
import { closeNotepadShell, openNotepadShellFromHome } from './helpers/notepadFixtures';
import { openForumFromHome } from './helpers/forumFixtures';

test.describe('الواجهة الرئيسية', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareHomeMainE2E(page);
        await seedLawyerFiles(page);
    });

    test('تعرض المنطقة الرئيسية وشبكة البطاقات والهاب', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await expectHomeMainShell(page);
        await expect(page.getByTestId('hub-archive-execution')).toBeVisible();
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible();
        await expect(page.getByTestId('hub-archive-transaction')).toBeVisible();
        await expect(page.getByTestId('home-dock-forum')).toBeVisible();
    });

    test('بطاقة المنتدى تعرض المحتوى بعد التحميل دون مؤشر دائري', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);
        await expectHomeMainShell(page);

        const forumTile = page.getByTestId('home-dock-forum');
        await expect(forumTile).toBeVisible({ timeout: 15_000 });
        await expect(forumTile.locator('.hami-forum-meridian-pod')).toBeVisible();
        await expect(forumTile.locator('.hami-forum-meridian-lead')).toHaveText('المنتدى');

        const legacySpinnerCircle = forumTile.locator('svg circle[r="8.5"]');
        await expect(legacySpinnerCircle).toHaveCount(0);
    });

    test('تفتح المعاملات من بطاقة الشبكة', async ({ page }) => {
        await ensureTransactionsDashboard(page);
        await expectHomeMainShell(page);
        await openTransactionsFromHome(page);

        await page.keyboard.press('Escape');
        await waitForTransactionsHubClosed(page);
        await expect(page.getByTestId('lawyer-home-tab')).toBeVisible();
    });

    test('تفتح المنتدى من بطاقة الواجهة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await expectHomeMainShell(page);
        await openForumFromHome(page);

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('forum-screen')).toBeHidden({ timeout: 10_000 });
        await expect(page.getByTestId('lawyer-home-tab')).toBeVisible();
    });

    test('تفتح مخزن التنفيذ من بطاقة الشبكة', async ({ page }) => {
        await page.getByTestId('hub-archive-execution').click({ force: true });
        await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
            timeout: 25_000,
        });
    });

    test('تفتح مساحة الدعاوى من بطاقة الشبكة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await expectHomeMainShell(page);
        await page.getByTestId('hub-archive-lawsuit').click({ force: true });
        await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('lawsuits-tab-civil')).toBeVisible({ timeout: 15_000 });
    });

    test('تفتح المفكرة والتقويم من بلاطات الرئيسية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await expectHomeMainShell(page);

        await openNotepadShellFromHome(page);
        await closeNotepadShell(page);

        await page
            .getByTestId('home-dock-dockCalendar')
            .or(page.getByTestId('home-dock-shell-dockCalendar'))
            .click({ force: true });
        await expect(
            page.getByTestId('smart-legal-radar').or(page.getByTestId('schedule-tab-loading')),
        ).toBeVisible({ timeout: 15_000 });
    });
});
