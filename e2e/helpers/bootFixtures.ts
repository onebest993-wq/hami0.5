import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** يزيل طبقة فشل الإقلاع التي تحجب النقرات أثناء الاختبارات */
export async function stripBootFailureLayer(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page
        .evaluate(() => {
            document.getElementById('hami-boot-failure')?.remove();
        })
        .catch(() => undefined);
}

export function isRecoverableBootPageError(message: string): boolean {
    return (
        /ResizeObserver loop/i.test(message) ||
        /Loading chunk/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message) ||
        /Failed to load resource.*favicon/i.test(message)
    );
}

export function collectFatalBootPageErrors(pageErrors: string[]): string[] {
    return pageErrors.filter((msg) => !isRecoverableBootPageError(msg));
}

/** يمنع toast «تذكير أسبوعي» من حجب النقرات أثناء E2E */
export async function suppressWeeklyBackupReminder(page: Page): Promise<void> {
    await page.addInitScript(() => {
        try {
            localStorage.setItem('hami:weekly-backup-reminder-at', String(Date.now()));
        } catch {
            /* ignore */
        }
    });
}

/** يجهّز جلسة E2E للإقلاع المباشر إلى لوحة المحامي */
export async function prepareBootE2E(page: Page): Promise<void> {
    await page.addInitScript(() => {
        try {
            localStorage.setItem('hami:last-screen', 'lawyer');
        } catch {
            /* ignore */
        }
        const strip = () => document.getElementById('hami-boot-failure')?.remove();
        strip();
        const observer = new MutationObserver(strip);
        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    });
}

/** يجمع خط زمن الإقلاع من performance marks */
export async function collectBootTimeline(page: Page): Promise<
    Array<{ phase: string; ms: number | null }>
> {
    return page.evaluate(() => {
        const phases = [
            'start',
            'static-shell-visible',
            'app-render',
            'shell-visible',
            'dashboard-chunk-loaded',
            'dashboard-interactive',
        ];
        const startMark = performance.getEntriesByName('hami:boot:start', 'mark')[0];
        const origin = startMark?.startTime ?? 0;
        return phases.map((phase) => {
            const entry = performance.getEntriesByName(`hami:boot:${phase}`, 'mark')[0];
            return { phase, ms: entry ? Math.round(entry.startTime - origin) : null };
        });
    });
}

export async function bootToLawyerHome(page: Page): Promise<void> {
    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-hami-drop-zone="main"]')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('home-dock-chrome')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('hami-static-boot')).toHaveCount(0, { timeout: 5_000 });
    await expect(page.getByTestId('lawyer-boot-shell')).toBeHidden({ timeout: 5_000 });
}

/** ينتظر ظهور حاويات الرئيسية الأساسية بعد الإقلاع */
export async function expectHomeContainersVisible(page: Page): Promise<void> {
    await expect(page.locator('[data-hami-lawyer-dashboard]')).toBeVisible();
    await expect(page.getByTestId('home-bottom-chrome')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('home-dock-chrome')).toBeVisible();
}
