import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { SETTINGS_PERF_BUDGET } from '@/app/services/settings/settingsPerfBudget';
import { SETTINGS_SECTION_STORAGE_KEY } from '@/app/services/settings/settingsSectionPersistence';
import { SETTINGS_REOPEN_SUPPRESS_MS } from '@/app/runtime/settingsInstantPaintReopen';
import { dismissProductivityBlockers } from './productivityE2EFixtures';
import { stripBootFailureLayer, recoverLawyerDashboardBootError } from './bootFixtures';
import { revealHeaderToolbarTools } from './headerToolbarFixtures';
export { revealHeaderToolbarTools };

/** Shell جاهز للتفاعل — بعد interactive lifecycle */
export const SETTINGS_HYDRATED_SHELL_SELECTOR =
    '[data-testid="hami-settings-shell"][data-settings-hydrated="true"]';

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
    await page.addInitScript((sectionKey) => {
        try {
            sessionStorage.removeItem(sectionKey);
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
    }, SETTINGS_SECTION_STORAGE_KEY);
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
    await resetSettingsE2ETransientState(page);
    if (!page.isClosed()) {
        await page
            .evaluate(() => {
                const w = window as Window & {
                    __hamiE2eForceCloseGlobalSearch?: () => void;
                    __hamiE2eForceCloseNotifications?: () => void;
                };
                w.__hamiE2eForceCloseGlobalSearch?.();
                w.__hamiE2eForceCloseNotifications?.();
            })
            .catch(() => undefined);
    }
    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 45_000 });
    await revealHeaderToolbarTools(page);
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
    await expect(shell.locator('[data-testid^="settings-nav-"][aria-selected="true"]')).toBeVisible({
        timeout: 8_000,
    });
    return page.getByTestId('hami-settings-shell');
}

const SETTINGS_POINTER_INIT = {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    pointerId: 1,
    isPrimary: true,
    pointerType: 'mouse',
} as const;

/** نقر DOM — يتجاوز actionability عندما الشريط يُطوى أثناء سلسلة Playwright */
export async function dispatchDomClick(target: Locator): Promise<void> {
    await target.evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
    });
}

/** pointerdown+up — لأزرار تُفتح/تُغلق عند اللمس لا عند click */
export async function dispatchPrimaryPointerDown(target: Locator): Promise<void> {
    await target.evaluate((el, init) => {
        if (!(el instanceof HTMLElement)) return;
        const down = { ...init, view: window, buttons: 1 };
        el.dispatchEvent(new PointerEvent('pointerdown', down));
        el.dispatchEvent(new PointerEvent('pointerup', { ...down, buttons: 0 }));
    }, SETTINGS_POINTER_INIT);
}

async function isSettingsShellOpen(page: Page): Promise<boolean> {
    return page.locator(SETTINGS_HYDRATED_SHELL_SELECTOR).isVisible().catch(() => false);
}

/** click برمجي — pointerdown يطلي الكروم قبل React فيُتخطى الفتح الحقيقي */
async function completeSettingsGearOpenGesture(page: Page): Promise<void> {
    await page.getByTestId('header-settings-trigger').evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
    });
}

/** حارس الإغلاق يبقى حتى تسليح الطبقة — لا تُغلق قبل --interact */
async function waitUntilSettingsCloseUnblocked(page: Page): Promise<void> {
    await page
        .waitForFunction(
            () =>
                !document.documentElement.hasAttribute('data-settings-close-guard') &&
                Boolean(document.querySelector('.hami-settings-overlay-layer--interact')),
            { timeout: 3_000 },
        )
        .catch(() => undefined);
}

export async function openSettingsFromHeader(page: Page) {
    await awaitDashboardStableForSettings(page);
    await page
        .waitForFunction(
            () => !document.documentElement.hasAttribute('data-hami-settings-closing'),
            { timeout: 2_000 },
        )
        .catch(() => undefined);
    await page.waitForTimeout(SETTINGS_REOPEN_SUPPRESS_MS + 40);

    await expect(async () => {
        if (await isSettingsShellOpen(page)) return;

        await revealHeaderToolbarTools(page);
        await completeSettingsGearOpenGesture(page);
        await expect(page.locator(SETTINGS_HYDRATED_SHELL_SELECTOR)).toBeVisible({ timeout: 8_000 });
    }).toPass({ timeout: 45_000 });

    const shell = await waitForSettingsShellReady(page, 20_000);
    await waitUntilSettingsCloseUnblocked(page);
    return shell;
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

/**
 * مسار تفعيل المزامنة السحابية — حوار تأكيد ثم fail-closed في E2E demo (لا جلسة Supabase حقيقية).
 * يُرجع الحالة النهائية للمفتاح.
 */
export async function exerciseCloudSyncToggleFromData(
    page: Page,
): Promise<'disabled' | 'enabled' | 'blocked-after-confirm'> {
    const toggle = page.getByTestId('settings-toggle-data-cloudSync');
    await expect(toggle).toBeVisible({ timeout: 12_000 });

    if ((await toggle.getAttribute('aria-disabled')) === 'true') {
        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        return 'disabled';
    }

    if ((await toggle.getAttribute('aria-checked')) === 'true') {
        return 'enabled';
    }

    await ensureSmartDialogInfrastructure(page);
    await toggle.evaluate((el) => (el as HTMLElement).click());
    const dialog = page.getByTestId('smart-dialog-overlay');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await dialog.getByTestId('smart-dialog-confirm').click({ force: true, noWaitAfter: true });
    await expect(dialog).toBeHidden({ timeout: 8_000 });

    if ((await toggle.getAttribute('aria-checked')) === 'true') {
        return 'enabled';
    }
    return 'blocked-after-confirm';
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
