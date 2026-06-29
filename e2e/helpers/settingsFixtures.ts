import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { SETTINGS_PERF_BUDGET } from '@/app/services/settings/settingsPerfBudget';

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

/** ينتظر اكتمال تحميل مركز الإعدادات (التبويبات = Shell الحقيقي وليس fallback التحميل) */
export async function waitForSettingsShellReady(page: Page, timeout = 45_000) {
    await expect(page.getByTestId('settings-nav-appearance')).toBeVisible({ timeout });
    const shell = page.getByTestId('hami-settings-shell');
    await expect(shell).toBeVisible({ timeout: 5_000 });
    return shell;
}

export async function openSettingsFromHeader(page: Page) {
    const trigger = page.getByTestId('header-settings-trigger');
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click({ timeout: 15_000, force: true });
    try {
        return await waitForSettingsShellReady(page, 25_000);
    } catch {
        await page.keyboard.press('Escape').catch(() => undefined);
        await expect(page.getByTestId('hami-settings-shell-loading')).toBeHidden({ timeout: 5_000 }).catch(() => undefined);
        await expect(trigger).toBeVisible({ timeout: 15_000 });
        await trigger.click({ timeout: 15_000, force: true });
        return waitForSettingsShellReady(page);
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
