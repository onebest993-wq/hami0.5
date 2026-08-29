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
        const readyProbe = staticBoot
            .or(bootShell)
            .or(page.getByTestId('lawyer-dashboard-ready'))
            .first();
        await expect(readyProbe).toBeVisible({
            timeout: 20_000,
        });

        await bootToLawyerHome(page);
        await expect(staticBoot).toHaveCount(0);
        await expect(bootShell).toBeHidden();
    });

    test('مسار الإقلاع — سطح صامت ثم إزالة الطبقة عند الجاهزية', async ({ page }) => {
        await page.goto('/', { waitUntil: 'commit' });

        const staticBoot = page.locator('#hami-static-boot[data-testid="hami-static-boot"]');
        await expect(staticBoot).toBeAttached({ timeout: 10_000 });
        await expect(staticBoot).toHaveAttribute('data-hami-boot-mode', 'silent-canvas');
        await expect(page.getByTestId('hami-boot-wordmark')).toHaveCount(0);

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

    test('بعد الكشف: هوية مستقرة وشبكة حية بلا هيكل عائم', async ({ page }) => {
        await page.goto('/');
        await bootToLawyerHome(page);
        await expect(page.getByTestId('hami-static-boot')).toHaveCount(0, { timeout: 8_000 });
        const profile = page.getByTestId('home-dock-forum-profile');
        await expect(profile).toHaveAttribute('data-identity-settled', '1', { timeout: 8_000 });
        const label = (await profile.getAttribute('aria-label')) ?? '';
        expect(label).toContain('الملف المهني');
        expect(label).not.toContain('جاري التحميل');
        await expect(page.locator('[data-testid^="home-widget-slot-skeleton-"]')).toHaveCount(0);
        expect(await page.locator('[data-testid^="hub-archive-"]').count()).toBeGreaterThanOrEqual(2);
        await expect(page.getByTestId('home-main-grid')).toBeVisible();
        await expect(page.locator('[data-hami-home-first-paint-layer]')).toHaveCount(0);
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

    test('بلاطة Hub تستقر بعد الإقلاع', async ({ page }) => {
        await page.goto('/');
        await bootToLawyerHome(page);

        const tile = page.getByTestId('home-hub-card');
        await expect(tile).toBeVisible({ timeout: 15_000 });
        await expect(tile).toBeAttached({ timeout: 8_000 });
        await tile.evaluate((el) => {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
        await expect
            .poll(
                async () => {
                    const live = page.getByTestId('home-hub-card');
                    const box = await live.boundingBox();
                    return Boolean(box && box.width >= 44 && box.height >= 44);
                },
                { timeout: 8_000 },
            )
            .toBe(true);

        const liveTile = page.getByTestId('home-hub-card');
        await expect
            .poll(
                async () => {
                    const a = await liveTile.boundingBox();
                    await page.waitForTimeout(400);
                    const b = await liveTile.boundingBox();
                    if (!a || !b) return false;
                    return Math.abs(b.height - a.height) < 8 && Math.abs(b.width - a.width) < 4;
                },
                { timeout: 12_000 },
            )
            .toBe(true);
    });
});
