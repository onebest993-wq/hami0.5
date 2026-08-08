import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissProductivityBlockers } from './productivityE2EFixtures';

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

/** منطق تخصيص الرئيسية — init script + evaluate */
export function applyE2eBootHomeLayoutInBrowser(): void {
    try {
        localStorage.setItem('hami:last-screen', 'lawyer');
        sessionStorage.setItem('hami:last-screen', 'lawyer');
        sessionStorage.removeItem('hami:lawyer-dashboard-tab');
        sessionStorage.removeItem('hami:lawyer-community-open');
        const key = 'lawyer_settings';
        let settings: Record<string, unknown> = {};
        const raw = localStorage.getItem(key);
        if (raw) {
            try {
                settings = JSON.parse(raw) as Record<string, unknown>;
            } catch {
                settings = {};
            }
        }
        const homeLayout = (settings.homeLayout as Record<string, unknown> | undefined) ?? {};
        homeLayout.dockVisible = true;
        homeLayout.quickNoteVisible = false;
        const overrides =
            (homeLayout.overrides as Record<string, { visible?: boolean }> | undefined) ?? {};
        for (const id of [
            'dockRepository',
            'dockTasks',
            'dockCalendar',
            'dockShell',
            'hubLawsuit',
            'hubExecution',
            'hubTransaction',
            'alerts',
            'forum',
            'hub',
        ]) {
            if (overrides[id]?.visible === false) delete overrides[id]!.visible;
        }
        homeLayout.overrides = overrides;
        settings.homeLayout = homeLayout;
        const performance = (settings.performance as Record<string, unknown> | undefined) ?? {};
        performance.prefetchScreens = true;
        performance.litePerformance = 'off';
        settings.performance = performance;
        if (settings.version == null) settings.version = 2;
        localStorage.setItem(key, JSON.stringify(settings));
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.dataset.hamiLite = '0';
        }
    } catch {
        /* ignore */
    }
}

/** يطبّق تخصيص الرئيسية بعد الإقلاع (بجانب addInitScript) */
export async function applyE2eBootHomeLayoutAtRuntime(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page.evaluate(() => {
        (window as unknown as { __hamiApplyE2eBootHomeLayout?: () => void }).__hamiApplyE2eBootHomeLayout?.();
    }).catch(async () => {
        await page.evaluate(applyE2eBootHomeLayoutInBrowser).catch(() => undefined);
    });
}

/** يجهّز جلسة E2E للإقلاع المباشر إلى لوحة المحامي */
export async function prepareBootE2E(page: Page): Promise<void> {
    await suppressWeeklyBackupReminder(page);
    await page.addInitScript(() => {
        const apply = () => {
            try {
                localStorage.setItem('hami:last-screen', 'lawyer');
                sessionStorage.setItem('hami:last-screen', 'lawyer');
                sessionStorage.removeItem('hami:lawyer-dashboard-tab');
                sessionStorage.removeItem('hami:lawyer-community-open');
                const key = 'lawyer_settings';
                let settings: Record<string, unknown> = {};
                const raw = localStorage.getItem(key);
                if (raw) {
                    try {
                        settings = JSON.parse(raw) as Record<string, unknown>;
                    } catch {
                        settings = {};
                    }
                }
                const homeLayout = (settings.homeLayout as Record<string, unknown> | undefined) ?? {};
                homeLayout.dockVisible = true;
                homeLayout.quickNoteVisible = false;
                const overrides =
                    (homeLayout.overrides as Record<string, { visible?: boolean }> | undefined) ?? {};
                for (const id of [
                    'dockRepository',
                    'dockTasks',
                    'dockCalendar',
                    'dockShell',
                    'hubLawsuit',
                    'hubExecution',
                    'hubTransaction',
                    'alerts',
                    'forum',
                    'hub',
                ]) {
                    if (overrides[id]?.visible === false) delete overrides[id]!.visible;
                }
                homeLayout.overrides = overrides;
                settings.homeLayout = homeLayout;
                const performance = (settings.performance as Record<string, unknown> | undefined) ?? {};
                performance.prefetchScreens = true;
                performance.litePerformance = 'off';
                settings.performance = performance;
                if (settings.version == null) settings.version = 2;
                localStorage.setItem(key, JSON.stringify(settings));
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.dataset.hamiLite = '0';
                }
            } catch {
                /* ignore */
            }
        };
        (window as unknown as { __hamiApplyE2eBootHomeLayout?: () => void }).__hamiApplyE2eBootHomeLayout =
            apply;
        apply();
        const strip = () => document.getElementById('hami-boot-failure')?.remove();
        strip();
        const observer = new MutationObserver(strip);
        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    });
}

/** يعالج خطأ React boundary للوحة ويعيد المحاولة */
export async function recoverLawyerDashboardBootError(page: Page): Promise<boolean> {
    if (page.isClosed()) return false;
    const bootError = page.getByTestId('lawyer-dashboard-boot-error');
    if (!(await bootError.isVisible().catch(() => false))) return false;
    await page.getByTestId('lawyer-dashboard-boot-error-retry').click({ force: true, noWaitAfter: true });
    try {
        await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 30_000 });
    } catch {
        return false;
    }
    await stripBootFailureLayer(page);
    await dismissProductivityBlockers(page);
    return true;
}

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

/** إقلاع موحّد للأقسام المغلقة — goto + تخطيط الرئيسية + انتظار الجاهزية */
export async function gotoLawyerHomeE2E(
    page: Page,
    options?: { waitUntil?: 'commit' | 'domcontentloaded' | 'load' },
): Promise<void> {
    await page.goto('/', { waitUntil: options?.waitUntil ?? 'domcontentloaded' });
    await applyE2eBootHomeLayoutAtRuntime(page);
    await bootToLawyerHome(page);
}

/** يشخّص فشل الإقلاع الشائع (بوابة دخول / fatal) */
export async function assertE2eBootSurface(page: Page): Promise<void> {
    if (page.isClosed()) return;
    const signInGate = page.getByTestId('lawyer-sign-in-gate');
    if (await signInGate.isVisible({ timeout: 1_500 }).catch(() => false)) {
        throw new Error(
            '[E2E boot] ظهرت بوابة تسجيل الدخول — شغّل npm run build:e2e ثم E2E_USE_PREVIEW=1 (أو npm run test:e2e:repository)',
        );
    }
    const fatal = page.getByTestId('app-boot-fatal-error');
    if (await fatal.isVisible({ timeout: 500 }).catch(() => false)) {
        const detail = await page
            .locator('[data-testid="app-boot-fatal-error"] pre, [data-testid="app-boot-fatal-error"] p')
            .first()
            .textContent()
            .catch(() => null);
        throw new Error(
            `[E2E boot] خطأ إقلاع حرج${detail ? `: ${detail.trim().slice(0, 240)}` : ''} — جرّب npm run build:e2e`,
        );
    }
}

export async function bootToLawyerHome(page: Page): Promise<void> {
    await recoverLawyerDashboardBootError(page);
    try {
        await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 60_000 });
    } catch (error) {
        await assertE2eBootSurface(page);
        throw error;
    }
    await stripBootFailureLayer(page);
    await dismissProductivityBlockers(page);

    const homeReady =
        (await page.getByTestId('lawyer-home-tab').isVisible().catch(() => false)) &&
        (await page.getByTestId('home-main-grid').isVisible().catch(() => false));
    if (homeReady) return;

    await expect(async () => {
        await recoverLawyerDashboardBootError(page);
        await stripBootFailureLayer(page);
        await dismissProductivityBlockers(page);
        await expect(page.getByTestId('lawyer-home-tab')).toBeVisible({ timeout: 4_000 });
        await expect(page.getByTestId('home-main-grid')).toBeVisible({ timeout: 4_000 });
        await expect(page.getByTestId('home-dock-dockTasks')).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 60_000 });

    await expect(page.getByTestId('hami-static-boot')).toHaveCount(0, { timeout: 5_000 }).catch(() => undefined);
    await expect(page.getByTestId('lawyer-boot-shell')).toBeHidden({ timeout: 5_000 }).catch(() => undefined);
}

/** ينتظر ظهور حاويات الرئيسية الأساسية بعد الإقلاع */
export async function expectHomeContainersVisible(page: Page): Promise<void> {
    await expect(page.locator('[data-hami-lawyer-dashboard]')).toBeVisible();
    await expect(page.getByTestId('home-main-grid')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('home-dock-dockRepository')).toBeVisible({ timeout: 15_000 });
}
