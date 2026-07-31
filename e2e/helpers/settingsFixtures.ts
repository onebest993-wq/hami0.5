import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { SETTINGS_PERF_BUDGET } from '@/app/services/settings/settingsPerfBudget';
import { dismissProductivityBlockers } from './productivityE2EFixtures';
import { stripBootFailureLayer, recoverLawyerDashboardBootError } from './bootFixtures';

/** Shell جاهز للتفاعل — بعد interactive lifecycle */
export const SETTINGS_HYDRATED_SHELL_SELECTOR =
    '[data-testid="hami-settings-shell"][data-settings-hydrated="true"]';

const SETTINGS_SECTION_STORAGE_KEY = 'hami:settings-active-section';

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
            const key = 'lawyer_settings';
            const raw = localStorage.getItem(key);
            if (raw) {
                const settings = JSON.parse(raw) as { security?: { localOnlyMode?: boolean } };
                if (settings.security?.localOnlyMode) {
                    settings.security.localOnlyMode = false;
                    localStorage.setItem(key, JSON.stringify(settings));
                }
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
                const key = 'lawyer_settings';
                const raw = localStorage.getItem(key);
                if (raw) {
                    const settings = JSON.parse(raw) as { security?: { localOnlyMode?: boolean } };
                    if (settings.security?.localOnlyMode) {
                        settings.security.localOnlyMode = false;
                        localStorage.setItem(key, JSON.stringify(settings));
                    }
                }
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

/** يصل للوحة قبل فتح الإعدادات — خفيف بدون انتظار networkidle */
export async function awaitDashboardStableForSettings(page: Page): Promise<void> {
    await recoverLawyerDashboardBootError(page);
    await stripBootFailureLayer(page);
    await dismissProductivityBlockers(page);
    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('header-settings-trigger')).toBeVisible({ timeout: 20_000 });
}

/** يعيد فتح الإعدادات إن أُغلقت بعد خطأ إقلاع أو تعطيل لوحة */
export async function ensureSettingsShellOpen(page: Page): Promise<Locator> {
    await recoverLawyerDashboardBootError(page);
    const shell = page.getByTestId('hami-settings-shell');
    if (await shell.isVisible().catch(() => false)) {
        return shell;
    }
    return openSettingsFromHeader(page);
}

/** ينتظر shell حقيقي + marker hydration — لا fallback تحميل */
export async function waitForSettingsShellReady(page: Page, timeout = 45_000) {
    const shell = page.locator(SETTINGS_HYDRATED_SHELL_SELECTOR);
    await expect(shell).toBeVisible({ timeout });
    await expect(page.getByTestId('settings-nav-appearance')).toBeVisible({ timeout: 8_000 });
    return page.getByTestId('hami-settings-shell');
}

export async function openSettingsFromHeader(page: Page) {
    await awaitDashboardStableForSettings(page);
    await resetSettingsE2ETransientState(page);

    const trigger = page.getByTestId('header-settings-trigger');
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click({ timeout: 15_000, force: true, noWaitAfter: true });

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
        await trigger.click({ timeout: 15_000, force: true, noWaitAfter: true });
        return waitForSettingsShellReady(page, 35_000);
    }
}

const SECTION_READY: Record<'appearance' | 'security' | 'data' | 'account', string> = {
    appearance: 'settings-section-appearance',
    security: 'settings-section-security',
    data: 'settings-section-data',
    account: 'settings-section-account',
};

/** نقر مباشر — يتجاوز scroll/actionability على تبويبات الإعدادات الثابتة */
async function tapSettingsNav(page: Page, tab: keyof typeof SECTION_READY): Promise<void> {
    await expect(async () => {
        const nav = page.getByTestId(`settings-nav-${tab}`);
        await expect(nav).toBeVisible({ timeout: 5_000 });
        await nav.dispatchEvent('click');
        await expect(nav).toHaveAttribute('aria-selected', 'true', { timeout: 4_000 });
    }).toPass({ timeout: 25_000 });
}

export async function switchSettingsTab(
    shell: Locator,
    tab: 'appearance' | 'security' | 'data' | 'account',
) {
    const page = shell.page();
    await recoverLawyerDashboardBootError(page);
    const activeShell = (await shell.isVisible().catch(() => false))
        ? shell
        : await ensureSettingsShellOpen(page);
    await expect(activeShell).toHaveAttribute('data-settings-hydrated', 'true', { timeout: 10_000 });
    await expect(activeShell).toBeVisible({ timeout: 5_000 });
    await tapSettingsNav(page, tab);
    await expect(page.getByTestId(SECTION_READY[tab])).toBeVisible({ timeout: 20_000 });
}

/** ينتظر تحميل حاويات overlay (toast + dialog) بعد idle */
export async function ensureSmartDialogInfrastructure(page: Page): Promise<void> {
    await page
        .waitForFunction(
            () => document.querySelector('[data-testid="smart-toast-stack"]') !== null,
            undefined,
            { timeout: 20_000 },
        )
        .catch(() => undefined);
    await page.waitForTimeout(400);
}

/** يفعّل قطع الاتصال مع انتظار تحميل SmartDialog الكسول */
export async function enableLocalOnlyModeFromSecurity(page: Page): Promise<void> {
    await ensureSmartDialogInfrastructure(page);

    const toggle = page.getByTestId('settings-toggle-security-localOnlyMode');
    await expect(toggle).toBeVisible({ timeout: 12_000 });

    if ((await toggle.getAttribute('aria-checked')) === 'true') {
        await expect(page.getByTestId('settings-local-only-banner')).toBeVisible({ timeout: 5_000 });
        return;
    }

    await expect(async () => {
        const current = page.getByTestId('settings-toggle-security-localOnlyMode');
        if ((await current.getAttribute('aria-checked')) === 'true') {
            await expect(page.getByTestId('settings-local-only-banner')).toBeVisible({ timeout: 3_000 });
            return;
        }
        await current.evaluate((el) => (el as HTMLElement).click());
        const dialog = page.getByTestId('smart-dialog-overlay');
        await expect(dialog).toBeVisible({ timeout: 6_000 });
        await dialog.getByTestId('smart-dialog-confirm').click({ force: true, noWaitAfter: true });
        await expect(dialog).toBeHidden({ timeout: 6_000 });
        await expect(current).toHaveAttribute('aria-checked', 'true', { timeout: 6_000 });
        await expect(page.getByTestId('settings-local-only-banner')).toBeVisible({ timeout: 6_000 });
    }).toPass({ timeout: 35_000 });
}

export async function disableLocalOnlyModeFromSecurity(page: Page): Promise<void> {
    const toggle = page.getByTestId('settings-toggle-security-localOnlyMode');
    if ((await toggle.getAttribute('aria-checked')) !== 'true') return;
    await toggle.evaluate((el) => (el as HTMLElement).click());
    await expect(toggle).toHaveAttribute('aria-checked', 'false', { timeout: 8_000 });
    await expect(page.getByTestId('settings-local-only-banner')).toBeHidden({ timeout: 8_000 });
}

/** تبديل تبويب سريع — بدون إعادة فتح الإعدادات */
export async function activateSettingsTab(
    page: Page,
    tab: 'appearance' | 'security' | 'data' | 'account',
): Promise<void> {
    await tapSettingsNav(page, tab);
    await expect(page.getByTestId(SECTION_READY[tab])).toBeVisible({ timeout: 20_000 });
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
    await expect(page.getByTestId('smart-dialog-overlay'))
        .toBeHidden({ timeout: 3_000 })
        .catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await expect(page.getByTestId('hami-settings-shell'))
        .toBeHidden({ timeout: 8_000 })
        .catch(() => undefined);
    await resetSettingsE2EPageState(page);
}
