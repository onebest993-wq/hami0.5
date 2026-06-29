/**
 * E2E — الشريط السفلي: حاوية الدوك، تكديس، فتح المخزن/المهام.
 */
import { test, expect } from '@playwright/test';
import { openVaultMediaFromDock } from './helpers/repositoryFixtures';
import {
    bootHomeDockChrome,
    clickDockCalendar,
    clickDockTasks,
    expectDockWidgetsVisible,
    prepareHomeDockE2E,
} from './helpers/homeDockFixtures';

test.describe('الشريط السفلي', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareHomeDockE2E(page);
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
        const chrome = await bootHomeDockChrome(page);
        const tasksBtn = chrome
            .getByTestId('home-dock-shell-dockTasks')
            .or(page.getByTestId('home-dock-dockTasks'))
            .first();
        await tasksBtn.scrollIntoViewIfNeeded();
        await tasksBtn.click({ clickCount: 3, delay: 30, force: true });
        await expect(page.getByTestId('field-tasks-sheet')).toBeVisible({ timeout: 15_000 });
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
