/**
 * E2E — الشريط السفلي: حاوية الدوك، تكديس، فتح المخزن/المهام.
 */
import { test, expect } from '@playwright/test';
import { openVaultMediaFromDock } from './helpers/repositoryFixtures';
import {
    bootHomeDockChrome,
    clickDockCalendar,
    clickDockTasks,
    dockTasksTrigger,
    expectDockWidgetsVisible,
    prepareHomeDockE2E,
} from './helpers/homeDockFixtures';
import { teardownTasksE2E, waitForFieldTasksSheetReady } from './helpers/tasksFixtures';

test.describe('الشريط السفلي', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareHomeDockE2E(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownTasksE2E(page);
    });

    test('يعرض حاوية الدوك', async ({ page }) => {
        const chrome = await bootHomeDockChrome(page);
        await expectDockWidgetsVisible(chrome);
    });

    test('يفتح المخزن من أيقونة الدوك', async ({ page }) => {
        await bootHomeDockChrome(page);
        const modal = await openVaultMediaFromDock(page);
        await expect(modal.getByTestId('repository-feed-empty-media')).toBeVisible({ timeout: 12_000 });
    });

    test('يفتح مهام الميدان من أيقونة الدوك', async ({ page }) => {
        await bootHomeDockChrome(page);
        await clickDockTasks(page);
    });

    test('يتجاهل النقر السريع المتكرر على مهام الميدان', async ({ page }) => {
        await bootHomeDockChrome(page);
        const tasksBtn = dockTasksTrigger(page).first();
        await tasksBtn.scrollIntoViewIfNeeded();
        // نقرات متزامنة — تطابق سلوك debounce في useCommandCenterDockActions
        await tasksBtn.evaluate((el) => {
            for (let i = 0; i < 3; i++) (el as HTMLElement).click();
        });
        await waitForFieldTasksSheetReady(page, 35_000);
        await expect(page.getByTestId('field-tasks-sheet')).toHaveCount(1);
    });

    test('يفتح التقويم من أيقونة الدوك', async ({ page }) => {
        await bootHomeDockChrome(page);
        await clickDockCalendar(page);
        await expect(page.getByTestId('schedule-tab-loading').or(page.getByTestId('smart-legal-radar'))).toBeVisible({
            timeout: 10_000,
        });
        await expect(page.getByTestId('smart-legal-radar')).toBeVisible({ timeout: 15_000 });
    });
});
