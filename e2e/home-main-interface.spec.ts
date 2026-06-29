/**
 * E2E — الواجهة الرئيسية: المنطقة الرئيسية، شبكة البطاقات، التنقل، وضع التخصيص.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';
import {
    expectHomeMainShell,
    openHomeLayoutEditFromSettings,
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

    test('وضع التخصيص يُفتح من الإعدادات ويُغلق بـ Escape', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await expectHomeMainShell(page);
        await openHomeLayoutEditFromSettings(page);
        await expect(page.getByTestId('hami-settings-shell')).toBeHidden({ timeout: 5_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('home-layout-edit-bar')).toBeHidden({ timeout: 5_000 });
        await expect(page.getByTestId('lawyer-home-tab')).toBeVisible();
    });

    test('وضع التخصيص يُغلق بزر تم', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openHomeLayoutEditFromSettings(page);
        await page.getByTestId('home-layout-edit-done').click({ force: true });
        await expect(page.getByTestId('home-layout-edit-bar')).toBeHidden({ timeout: 5_000 });
        await expect(page.getByTestId('lawyer-home-tab')).toBeVisible();
    });

    test('تفتح مخزن التنفيذ من بطاقة الشبكة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await expectHomeMainShell(page);
        await page.getByTestId('hub-archive-execution').scrollIntoViewIfNeeded();
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

    test('تفتح المفكرة والتقويم من الدوك السفلي', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await expectHomeMainShell(page);
        const chrome = page.getByTestId('home-bottom-chrome');

        await openNotepadShellFromHome(page);
        await closeNotepadShell(page);

        await chrome.getByTestId('home-dock-shell-dockCalendar').click({ force: true });
        await expect(
            page.getByTestId('smart-legal-radar').or(page.getByTestId('schedule-tab-loading')),
        ).toBeVisible({ timeout: 15_000 });
    });
});
