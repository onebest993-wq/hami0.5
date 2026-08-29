/**
 * قياس CLS وإزاحة هندسية لسطح الرئيسية بعد الكشف — ليس تخميناً من CSS.
 */
import { test, expect } from '@playwright/test';
import { bootToLawyerHome, prepareBootE2E } from './helpers/bootFixtures';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
    buildE2eHubRadarCalendarEvent,
    hydrateCalendarEventsForE2E,
    seedCalendarEvents,
} from './helpers/homeHubFixtures';
import {
    installHomeSurfaceStabilityProbe,
    measureHomeSurfaceStability,
    restartHomeSurfaceStabilityProbe,
} from './helpers/homeSurfaceStability';
import {
    HOME_SURFACE_MAX_RECT_SHIFT_PX,
    HOME_SURFACE_POST_REVEAL_CLS_MAX,
} from '@/app/services/alerts/homeSurfaceStabilityGate';

test.describe('ثبات سطح الرئيسية بعد الكشف', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await installHomeSurfaceStabilityProbe(page);
        await prepareBootE2E(page);
        await seedLawyerFiles(page);
        await seedCalendarEvents(page, [buildE2eHubRadarCalendarEvent()]);
    });

    test('CLS بعد ظهور البطاقة وإزاحة الشبكة/الهيدر ضمن الحد', async ({ page }) => {
        const radarEvent = buildE2eHubRadarCalendarEvent();
        await page.goto('/');
        await bootToLawyerHome(page);
        await hydrateCalendarEventsForE2E(page, [radarEvent]);

        const card = page.getByTestId('home-hub-card');
        await expect(card).toBeVisible({ timeout: 15_000 });
        await expect(card).toHaveAttribute('data-hub-boot-settling', '0', { timeout: 12_000 });
        await expect(card).toHaveAttribute('data-hub-has-items', '1', { timeout: 12_000 });
        await expect(card).toHaveAttribute('data-hub-layout-mode', 'feed', { timeout: 8_000 });
        await expect(card.getByTestId('home-hub-alerts-feed')).toBeVisible({ timeout: 20_000 });
        await expect(card.getByTestId('home-hub-radar-item-e2e-radar-event-1')).toBeVisible({
            timeout: 20_000,
        });

        let lastHeight = -1;
        await expect
            .poll(
                async () => {
                    const box = await card.boundingBox();
                    const height = box?.height ?? 0;
                    const stable =
                        Boolean(box && box.width >= 44 && height >= 240) &&
                        lastHeight > 0 &&
                        Math.abs(height - lastHeight) <= 1;
                    lastHeight = height;
                    return stable;
                },
                { timeout: 8_000 },
            )
            .toBe(true);
        await restartHomeSurfaceStabilityProbe(page);

        const verdict = await measureHomeSurfaceStability(page);
        expect(
            verdict.ok,
            verdict.failures.join('; ') || 'home surface stability',
        ).toBe(true);
        expect(verdict.metrics.framesCaptured).toBeGreaterThan(8);
        expect(verdict.metrics.postRevealCls).toBeLessThanOrEqual(HOME_SURFACE_POST_REVEAL_CLS_MAX);
        expect(verdict.metrics.hubShiftPx).toBeLessThanOrEqual(HOME_SURFACE_MAX_RECT_SHIFT_PX);
        expect(verdict.metrics.gridShiftPx).toBeLessThanOrEqual(HOME_SURFACE_MAX_RECT_SHIFT_PX);
        expect(verdict.metrics.headerShiftPx).toBeLessThanOrEqual(HOME_SURFACE_MAX_RECT_SHIFT_PX);
    });
});
