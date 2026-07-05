import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { SETTINGS_PERF_BUDGET } from '@/app/services/settings/settingsPerfBudget';

/** Shell جاهز للتفاعل — بعد interactive lifecycle */
export const SETTINGS_HYDRATED_SHELL_SELECTOR =
    '[data-testid="hami-settings-shell"][data-settings-hydrated="true"]';

const SETTINGS_SECTION_STORAGE_KEY = 'hami:settings-active-section';
const SETTINGS_PERF_MARKS = ['open-request', 'first-paint', 'interactive', 'chunk-ready'] as const;

/** ms من open-request → interactive — للـ E2E */
export async function readSettingsOpenToInteractiveMs(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const open = performance.getEntriesByName('hami:settings:open-request', 'mark')[0];
        const interactive = performance.getEntriesByName('hami:settings:interactive', 'mark')[0];
        if (!open || !interactive) return null;
        return Math.round(interactive.startTime - open.startTime);
    });
}

export async function clearSettingsPerfMarksInPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`hami:settings:${phase}`);
        }
    });
}

export const E2E_SETTINGS_COLD_OPEN_MS = SETTINGS_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_SETTINGS_CACHED_OPEN_MS = SETTINGS_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

/** عزل حالة الإعدادات قبل كل سيناريو — init script يُنفَّذ قبل تحميل الصفحة */
export async function installSettingsE2EIsolation(page: Page): Promise<void> {
    await page.addInitScript(() => {
        try {
            sessionStorage.removeItem('hami:settings-active-section');
            for (const phase of ['open-request', 'first-paint', 'interactive', 'chunk-ready']) {
                performance.clearMarks(`hami:settings:${phase}`);
            }
        } catch {
            /* ignore */
        }
    });
}

/** تصفير overlays وmarks — لا يمسّ تبويب الجلسة المحفوظ */
export async function resetSettingsE2ETransientState(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page
        .evaluate(() => {
            try {
                for (const phase of ['open-request', 'first-paint', 'interactive', 'chunk-ready']) {
                    performance.clearMarks(`hami:settings:${phase}`);
                }
                window.dispatchEvent(new CustomEvent('hami:dismiss-transient-overlays', { detail: {} }));
            } catch {
                /* ignore */
            }
        })
        .catch(() => undefined);
}

/** تصفير كامل لحالة الإعدادات — beforeEach / afterEach فقط */
export async function resetSettingsE2EPageState(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page
        .evaluate((sectionKey) => {
            try {
                sessionStorage.removeItem(sectionKey);
            } catch {
                /* ignore */
            }
        }, SETTINGS_SECTION_STORAGE_KEY)
        .catch(() => undefined);
    await resetSettingsE2ETransientState(page);
}

/** يدمج عزل الإعدادات مع boot E2E — يُستدعى من beforeEach */
export async function prepareSettingsE2E(page: Page): Promise<void> {
    await installSettingsE2EIsolation(page);
}

/** ينتظر استقرار اللوحة بعد staggered boot قبل فتح الإعدادات */
export async function awaitDashboardStableForSettings(page: Page): Promise<void> {
    const trigger = page.getByTestId('header-settings-trigger');
    await expect(trigger).toBeVisible({ timeout: 20_000 });

    const dashboardReady = page.getByTestId('lawyer-dashboard-ready');
    const onDashboard = await dashboardReady.isVisible().catch(() => false);
    if (!onDashboard) return;

    await expect(dashboardReady).toBeVisible({ timeout: 45_000 });

    await page.evaluate(async () => {
        const bootDone = performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark').length > 0;
        if (bootDone) return;
        await new Promise<void>((resolve) => {
            const timeout = window.setTimeout(resolve, 8_000);
            const done = () => {
                window.clearTimeout(timeout);
                window.removeEventListener('hami:dashboard-interactive', done);
                resolve();
            };
            window.addEventListener('hami:dashboard-interactive', done, { once: true });
        });
    });

    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

/** ينتظر shell حقيقي + marker hydration — لا fallback تحميل */
export async function waitForSettingsShellReady(page: Page, timeout = 45_000) {
    const shell = page.locator(SETTINGS_HYDRATED_SHELL_SELECTOR);
    await expect(shell).toBeVisible({ timeout });
    await expect(page.getByTestId('settings-nav-appearance')).toBeVisible({ timeout: 5_000 });
    return page.getByTestId('hami-settings-shell');
}

export async function openSettingsFromHeader(page: Page) {
    await awaitDashboardStableForSettings(page);
    await resetSettingsE2ETransientState(page);

    const trigger = page.getByTestId('header-settings-trigger');
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click({ timeout: 15_000, force: true });

    try {
        return await waitForSettingsShellReady(page, 30_000);
    } catch {
        await page.keyboard.press('Escape').catch(() => undefined);
        await expect(page.getByTestId('hami-settings-shell-loading'))
            .toBeHidden({ timeout: 5_000 })
            .catch(() => undefined);
        await expect(page.getByTestId('hami-settings-shell'))
            .toBeHidden({ timeout: 5_000 })
            .catch(() => undefined);
        await awaitDashboardStableForSettings(page);
        await trigger.click({ timeout: 15_000, force: true });
        return waitForSettingsShellReady(page, 35_000);
    }
}

const SECTION_READY: Record<'appearance' | 'security' | 'data' | 'account', string> = {
    appearance: 'settings-section-appearance',
    security: 'settings-section-security',
    data: 'settings-section-data',
    account: 'settings-section-account',
};

export async function switchSettingsTab(
    shell: Locator,
    tab: 'appearance' | 'security' | 'data' | 'account',
) {
    await expect(shell).toHaveAttribute('data-settings-hydrated', 'true', { timeout: 10_000 });
    const nav = shell.getByTestId(`settings-nav-${tab}`);
    await nav.scrollIntoViewIfNeeded();
    await nav.click({ force: true, timeout: 15_000 });
    await expect(nav).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
    await expect(shell.getByTestId(SECTION_READY[tab])).toBeVisible({ timeout: 20_000 });
}

export async function openSettingsDataTab(page: Page) {
    const shell = await openSettingsFromHeader(page);
    await switchSettingsTab(shell, 'data');
    return shell;
}

/** إغلاق الإعدادات وتصفير الحالة — afterEach */
export async function teardownSettingsE2E(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page.keyboard.press('Escape').catch(() => undefined);
    await expect(page.getByTestId('hami-settings-shell'))
        .toBeHidden({ timeout: 8_000 })
        .catch(() => undefined);
    await resetSettingsE2EPageState(page);
}
