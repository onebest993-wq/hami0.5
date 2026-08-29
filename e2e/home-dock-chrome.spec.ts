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
    expectScheduleSurfaceVisible,
    prepareHomeDockE2E,
} from './helpers/homeDockFixtures';
import { teardownTasksE2E, waitForFieldTasksSheetReady } from './helpers/tasksFixtures';
import { clickNativeElement } from './helpers/executionE2EBoot';

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
        await expect(modal.getByTestId('repository-feed-empty-all')).toBeVisible({ timeout: 12_000 });
    });

    test('يفتح مهام الميدان من أيقونة الدوك', async ({ page }) => {
        await bootHomeDockChrome(page);
        await clickDockTasks(page);
    });

    test('يتجاهل النقر السريع المتكرر على مهام الميدان', async ({ page }) => {
        await bootHomeDockChrome(page);
        await clickDockTasks(page);
        const tasksBtn = dockTasksTrigger(page).first();
        await clickNativeElement(tasksBtn);
        await clickNativeElement(tasksBtn);
        await waitForFieldTasksSheetReady(page, 35_000);
        await expect(page.getByTestId('field-tasks-sheet')).toHaveCount(1);
    });

    test('يفتح التقويم من أيقونة الدوك', async ({ page }) => {
        await bootHomeDockChrome(page);
        await clickDockCalendar(page);
        await expectScheduleSurfaceVisible(page);
    });
});
