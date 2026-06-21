/**
 * E2E: إقلاع التطبيق — بدون شاشة سوداء أو أخطاء JS حرجة
 */
import { test, expect } from '@playwright/test';

test.describe('App boot smoke', () => {
    test('loads lawyer shell without fatal page errors', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto('/');
        await page.waitForFunction(
            () => (document.querySelector('#root')?.innerHTML?.length ?? 0) > 800,
            undefined,
            { timeout: 45_000 },
        );

        const loader = page.locator('#loading-overlay');
        await expect(loader).toHaveCount(0, { timeout: 15_000 });

        const fatalBoot = pageErrors.filter(
            (msg) =>
                !/ResizeObserver loop/i.test(msg) &&
                !/Loading chunk/i.test(msg) &&
                !/Failed to fetch dynamically imported module/i.test(msg),
        );
        expect(fatalBoot).toEqual([]);
    });
});
