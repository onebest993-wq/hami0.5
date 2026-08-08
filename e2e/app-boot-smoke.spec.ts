/**
 * E2E — الإقلاع والتحميل وظهور حاويات لوحة المحامي
 */
import { test, expect } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';
import {
    bootToLawyerHome,
    collectFatalBootPageErrors,
    expectHomeContainersVisible,
    prepareBootE2E,
    stripBootFailureLayer,
} from './helpers/bootFixtures';

test.describe('إقلاع التطبيق', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareBootE2E(page);
        await seedLawyerFiles(page);
    });

    test('يصل إلى لوحة المحامي الجاهزة بدون أخطاء JS حرجة', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto('/');
        await bootToLawyerHome(page);
        await stripBootFailureLayer(page);

        expect(collectFatalBootPageErrors(pageErrors)).toEqual([]);
    });

    test('يعرض هيكل الإقلاع ثم يخفيه عند الجاهزية', async ({ page }) => {
        await page.goto('/');

        const staticBoot = page.getByTestId('hami-static-boot');
        const bootShell = page.getByTestId('lawyer-boot-shell');
        await expect(staticBoot.or(bootShell).or(page.getByTestId('lawyer-dashboard-ready'))).toBeVisible({
            timeout: 20_000,
        });

        await bootToLawyerHome(page);
        await expect(staticBoot).toHaveCount(0);
        await expect(bootShell).toBeHidden();
    });

    test('مسار الإقلاع — كلمة حامي ثم إزالة الطبقة عند الجاهزية', async ({ page }) => {
        await page.goto('/', { waitUntil: 'commit' });

        const staticBoot = page.locator('#hami-static-boot[data-testid="hami-static-boot"]');
        await expect(staticBoot).toBeAttached({ timeout: 10_000 });
        await expect(page.getByTestId('hami-boot-wordmark')).toHaveText('حامي');

        await bootToLawyerHome(page);

        await expect(page.getByTestId('home-main-grid')).toBeVisible();
        await expect(staticBoot).toHaveCount(0, { timeout: 8_000 });
    });

    test('تظهر حاويات الرئيسية بعد الإقلاع', async ({ page }) => {
        await page.goto('/');
        await bootToLawyerHome(page);
        await dismissBlockingOverlays(page);
        await expectHomeContainersVisible(page);
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 15_000 });
    });

    test('لا يعرض طبقة فشل الإقلاع في المسار السعيد', async ({ page }) => {
        await page.goto('/');
        await bootToLawyerHome(page);
        await expect(page.getByTestId('hami-boot-failure')).toHaveCount(0);
        await expect(page.getByTestId('app-boot-fatal-error')).toHaveCount(0);
        await expect(page.getByTestId('global-error-boundary-fallback')).toHaveCount(0);
    });

    test('يُسجّل مرحلة dashboard-interactive بعد الجاهزية', async ({ page }) => {
        await page.goto('/');
        await bootToLawyerHome(page);
        const hasMark = await page.evaluate(
            () => performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark').length > 0,
        );
        expect(hasMark).toBe(true);
    });
});
