/**
 * مسبار إقلاع — معيار ممتاز لا «ظهر شيء».
 * الشامل متعدد المنصات: npm run test:e2e:boot:full
 */
import { test, expect } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';
import {
    bootToLawyerHome,
    collectBootTimeline,
    collectFatalBootPageErrors,
    prepareBootE2E,
} from './helpers/bootFixtures';

const SECTION_IDS = [
    'hami-static-boot',
    'lawyer-dashboard-ready',
    'lawyer-home-tab',
    'home-main-grid',
    'home-hub-card',
    'home-dock-shell',
    'home-dock-dockRepository',
    'home-dock-dockTasks',
    'home-dock-dockCalendar',
    'home-dock-forum',
    'hub-archive-lawsuit',
    'hub-archive-execution',
] as const;

const REQUIRED_TIMELINE = [
    'start',
    'static-shell-visible',
    'shell-visible',
    'app-render',
    'dashboard-chunk-loaded',
    'dashboard-interactive',
    'first-tab-open',
    'hub-boot-stable',
] as const;

const MUST_VISIBLE = [
    'lawyer-dashboard-ready',
    'lawyer-home-tab',
    'home-main-grid',
    'home-hub-card',
    'home-dock-dockRepository',
    'home-dock-dockTasks',
    'home-dock-dockCalendar',
    'home-dock-forum',
    'hub-archive-lawsuit',
    'hub-archive-execution',
] as const;

test.describe('مسبار مسار الإقلاع الكامل', () => {
    test.describe.configure({ timeout: 90_000 });

    test('من الصفر → سطح صامت → كشف → شبكة → أقسام ظاهرة', async ({ page }, testInfo) => {
        await prepareBootE2E(page);
        await seedLawyerFiles(page);

        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto('/', { waitUntil: 'commit' });

        const staticBoot = page.locator('#hami-static-boot[data-testid="hami-static-boot"]');
        await expect(staticBoot).toBeAttached({ timeout: 10_000 });
        const bootMode = await staticBoot.getAttribute('data-hami-boot-mode');
        expect(bootMode).toBe('silent-canvas');
        await expect(page.getByTestId('hami-boot-wordmark')).toHaveCount(0);

        await bootToLawyerHome(page);
        await dismissBlockingOverlays(page);

        await expect(staticBoot).toHaveCount(0, { timeout: 8_000 });
        await expect(page.getByTestId('home-main-grid')).toBeVisible();

        for (const id of MUST_VISIBLE) {
            await expect(page.getByTestId(id), id).toBeVisible({ timeout: 15_000 });
        }

        const hubTile = page.getByTestId('home-hub-card');
        await expect(hubTile).toBeVisible({ timeout: 15_000 });

        const bootMarks = await page.evaluate(() => ({
            shell: performance.getEntriesByName('hami:boot:shell-visible', 'mark').length,
            interactive: performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark').length,
            firstTab: performance.getEntriesByName('hami:boot:first-tab-open', 'mark').length,
            hubStable: performance.getEntriesByName('hami:boot:hub-boot-stable', 'mark').length,
        }));
        if (bootMarks.shell === 0) {
            throw new Error(
                '[boot-full-path] hami:boot:shell-visible غائبة — الحزمة قديمة. شغّل npm run build:e2e',
            );
        }

        await page.waitForFunction(() => {
            const marks = [
                'hami:boot:shell-visible',
                'hami:boot:dashboard-interactive',
                'hami:boot:first-tab-open',
                'hami:boot:hub-boot-stable',
            ];
            return marks.every((name) => performance.getEntriesByName(name, 'mark').length > 0);
        }, undefined, { timeout: 15_000 });

        const sections = await page.evaluate((ids) => {
            return ids.map((id) => {
                const el = document.querySelector(`[data-testid="${id}"]`);
                if (!el) return { id, present: false, visible: false };
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                const visible =
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    (rect.width > 0 || rect.height > 0);
                return { id, present: true, visible };
            });
        }, [...SECTION_IDS]);

        const timeline = await collectBootTimeline(page);
        const frame1 = await page.evaluate(() => {
            const snap = (window as unknown as { __hamiFrame1Hydrate__?: { unreadCount?: number } })
                .__hamiFrame1Hydrate__;
            return {
                hasSnap: Boolean(snap),
                unreadCount: snap?.unreadCount ?? null,
                revealDone: document.documentElement.dataset.hamiBootRevealed === '1',
                homeGridPainted: Boolean(
                    (window as unknown as { __hamiHomeMainGridPainted__?: boolean })
                        .__hamiHomeMainGridPainted__,
                ),
            };
        });

        const report = {
            bootMode,
            frame1,
            timeline,
            sections,
            pageErrorCount: pageErrors.length,
            pageErrors: pageErrors.slice(0, 5),
        };

        await testInfo.attach('boot-full-path-report', {
            body: Buffer.from(JSON.stringify(report, null, 2), 'utf8'),
            contentType: 'application/json',
        });

        // eslint-disable-next-line no-console
        console.log('[boot-full-path]\n' + JSON.stringify(report, null, 2));

        expect(collectFatalBootPageErrors(pageErrors)).toEqual([]);
        expect(frame1.homeGridPainted).toBe(true);
        expect(frame1.revealDone).toBe(true);

        for (const phase of REQUIRED_TIMELINE) {
            const row = timeline.find((item) => item.phase === phase);
            expect(row?.ms, `${phase} يجب أن يُعلَّم`).not.toBeNull();
        }

        for (const id of MUST_VISIBLE) {
            const row = sections.find((s) => s.id === id);
            expect(row?.present, `${id} present`).toBe(true);
            expect(row?.visible, `${id} visible`).toBe(true);
        }

        expect(sections.find((s) => s.id === 'hami-static-boot')?.present).toBe(false);
        /* الشريط السفلي الثابت خارج مسار الإقلاع — البلاطات في شبكة الرئيسية */
        expect(sections.find((s) => s.id === 'home-dock-shell')?.present).toBe(false);
    });
});
