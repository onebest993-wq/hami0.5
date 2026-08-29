/**
 * E2E — مجموعة أدوات الهيدر: النجمة، الفتح/الإغلاق، عدم بقاء حوارات مغلقة.
 */
import { test, expect } from '@playwright/test';
import { gotoLawyerHomeE2E } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    expectHeaderToolbarCollapsed,
    expectOpenHeaderMatchesHomeGrid,
    revealHeaderToolbarTools,
} from './helpers/headerToolbarFixtures';

test.describe('مجموعة أدوات الهيدر', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
    });

    test('مطوية عند الإقلاع — العلامة ظاهرة والأدوات مخفية', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await expect(page.getByTestId('header-tools-reveal')).toBeVisible({ timeout: 30_000 });
        await expectHeaderToolbarCollapsed(page);
        await expect(page.getByTestId('header-settings-trigger')).toBeHidden();
        await expect(page.getByRole('dialog', { name: 'بحث شامل' })).toHaveCount(0);
        await expect(page.getByRole('dialog', { name: 'الإشعارات' })).toHaveCount(0);
    });

    test('على 1440px الأدوات المفتوحة بعرض عمود الشبكة نفسه', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await page.screenshot({ path: 'test-results/home-live-1440-collapsed.png', fullPage: false });
        await expectOpenHeaderMatchesHomeGrid(page, {
            minNavW: 520,
            maxNavW: 808,
            cols: 3,
        });
        await page.screenshot({ path: 'test-results/home-live-1440-tools.png', fullPage: false });
    });

    test('على 390px الأدوات المفتوحة تملأ عمود الهاتف', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await expectOpenHeaderMatchesHomeGrid(page, {
            minNavW: 280,
            maxNavW: 390,
            cols: 2,
        });
        await page.screenshot({ path: 'test-results/home-live-390-tools.png', fullPage: false });
    });

    test('على 1024px ثلاثة أعمدة داخل سقف العمود', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await expectOpenHeaderMatchesHomeGrid(page, {
            minNavW: 480,
            maxNavW: 648,
            cols: 3,
        });
        await page.screenshot({ path: 'test-results/home-live-1024-tools.png', fullPage: false });
    });

    test('الضغط على العلامة يكشف البحث والإشعارات والإعدادات', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await revealHeaderToolbarTools(page);
        await expect(page.getByTestId('header-search-trigger')).toBeVisible();
        await expect(page.getByTestId('header-notifications-trigger')).toBeVisible();
        await expect(page.getByTestId('header-settings-trigger')).toBeVisible();
    });

    test('Escape يطوي الأدوات دون فتح طبقة', async ({ page }) => {
        await gotoLawyerHomeE2E(page);
        await dismissProductivityBlockers(page);

        await revealHeaderToolbarTools(page);
        await page.keyboard.press('Escape');
        await expectHeaderToolbarCollapsed(page);
        await expect(page.getByTestId('hami-settings-shell')).toBeHidden();
    });
});
