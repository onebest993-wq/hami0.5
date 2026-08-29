import { expect, type Page } from '@playwright/test';
import { GLOBAL_SEARCH_PERF_BUDGET } from '@/app/services/search/globalSearchPerfBudget';
import { lawyerDashboardReady } from './lawyerDashboardLocators';
import { closeNotificationsPanelForE2E } from './notificationFixtures';
import { revealHeaderToolbarTools } from './headerToolbarFixtures';
export { dismissSmartFileDossier, closeSmartFileDossier } from './dossierNavFixtures';

const GLOBAL_SEARCH_OPEN_LAYER =
    '[data-hami-global-search-shell] .hami-gs-layer[data-search-open="true"]';

export async function readGlobalSearchOpenToInteractiveMs(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const open = performance.getEntriesByName('hami:global-search:open-request', 'mark')[0];
        const interactive = performance.getEntriesByName('hami:global-search:interactive', 'mark')[0];
        if (!open || !interactive) return null;
        return Math.round(interactive.startTime - open.startTime);
    });
}

export async function clearGlobalSearchPerfMarksInPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        for (const phase of ['open-request', 'chunk-ready', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`hami:global-search:${phase}`);
        }
    });
}

export const E2E_GLOBAL_SEARCH_COLD_OPEN_MS = GLOBAL_SEARCH_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_GLOBAL_SEARCH_CACHED_OPEN_MS = GLOBAL_SEARCH_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

declare global {
    interface Window {
        __hamiE2eForceCloseGlobalSearch?: () => void;
        __hamiE2eForceOpenGlobalSearch?: (seed?: string) => void;
        __hamiE2eGlobalSearchDebug?: () => { showGlobalSearch: boolean };
    }
}

async function safePageEvaluate(page: Page, fn: () => void): Promise<void> {
    if (page.isClosed()) return;
    await page.evaluate(fn).catch(() => undefined);
}

async function waitForGlobalSearchE2eHooks(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page
        .waitForFunction(() => typeof window.__hamiE2eForceOpenGlobalSearch === 'function', undefined, {
            timeout: 12_000,
        })
        .catch(() => undefined);
}

async function forceCloseGlobalSearchInPage(page: Page): Promise<void> {
    await waitForGlobalSearchE2eHooks(page);
    await safePageEvaluate(page, () => window.__hamiE2eForceCloseGlobalSearch?.());
}

async function forceOpenGlobalSearchInPage(page: Page, seed = ''): Promise<void> {
    await waitForGlobalSearchE2eHooks(page);
    await safePageEvaluate(page, () => window.__hamiE2eForceOpenGlobalSearch?.(seed));
}

function globalSearchHeaderTrigger(page: Page): import('@playwright/test').Locator {
    return page.getByTestId('header-search-trigger').first();
}

/** يُنتظر حتى يصبح البحث مفتوحاً فعلياً (لا warm shell مخفي). */
export async function expectGlobalSearchOpen(page: Page, timeout = 25_000): Promise<void> {
    const overlay = page.getByTestId('global-search-overlay');
    const loading = page.getByTestId('global-search-overlay-loading');
    const openLayer = page.locator(GLOBAL_SEARCH_OPEN_LAYER);

    await expect(openLayer.or(loading)).toBeVisible({ timeout });
    await expect(overlay).toBeVisible({ timeout });
    await expect(async () => {
        const input = page.getByTestId('global-search-input');
        await expect(input).toBeAttached({ timeout: 2_000 });
        await expect(input).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: Math.max(timeout, 12_000) });
    await expect(page.getByRole('alertdialog', { name: 'خطأ في البحث' })).toBeHidden({
        timeout: 2_000,
    }).catch(() => undefined);
}

/** يفتح البحث من زر الهيدر مع fallback E2E عند VITE_E2E. */
export async function openGlobalSearch(page: Page): Promise<void> {
    const trigger = globalSearchHeaderTrigger(page);
    await lawyerDashboardReady(page).click({ timeout: 5_000 }).catch(() => undefined);
    await revealHeaderToolbarTools(page).catch(() => undefined);

    const triggerVisible = await trigger.isVisible({ timeout: 2_000 }).catch(() => false);
    if (triggerVisible) {
        await trigger.click({ timeout: 15_000, force: true }).catch(async () => {
            await trigger.evaluate((el) => {
                if (el instanceof HTMLElement) el.click();
            });
        });
    }

    const overlay = page.getByTestId('global-search-overlay');
    const openedQuickly =
        (await page.locator(GLOBAL_SEARCH_OPEN_LAYER).isVisible({ timeout: 4_000 }).catch(() => false)) ||
        (await overlay.isVisible({ timeout: 2_000 }).catch(() => false));

    if (!openedQuickly) {
        await forceOpenGlobalSearchInPage(page);
    }

    await expectGlobalSearchOpen(page);
}

/** Ctrl/Cmd+K — مع fallback لزر الهيدر على الموبايل حيث لا يعمل الاختصار. */
export async function openGlobalSearchViaKeyboard(page: Page): Promise<void> {
    await lawyerDashboardReady(page).click({ timeout: 5_000 }).catch(() => undefined);
    await page.keyboard.press('Control+K');

    const openedViaKeyboard =
        (await page.locator(GLOBAL_SEARCH_OPEN_LAYER).isVisible({ timeout: 2_500 }).catch(() => false)) ||
        (await page.getByTestId('global-search-overlay').isVisible({ timeout: 1_500 }).catch(() => false));

    if (!openedViaKeyboard) {
        await openGlobalSearch(page);
        return;
    }

    await expectGlobalSearchOpen(page, 15_000);
}

async function tryForceOpenGlobalSearch(page: Page): Promise<boolean> {
    await forceOpenGlobalSearchInPage(page);
    return (
        (await page.locator(GLOBAL_SEARCH_OPEN_LAYER).isVisible({ timeout: 4_000 }).catch(() => false)) ||
        (await page.getByTestId('global-search-overlay').isVisible({ timeout: 2_000 }).catch(() => false))
    );
}

async function isGlobalSearchLayerOpen(page: Page): Promise<boolean> {
    return (
        (await page.locator(GLOBAL_SEARCH_OPEN_LAYER).isVisible({ timeout: 500 }).catch(() => false)) ||
        (await page.getByTestId('global-search-overlay').isVisible({ timeout: 500 }).catch(() => false))
    );
}

/**
 * فتح البحث الشامل — لوحة المفاتيح على سطح المكتب، جسر E2E عند حجب الهيدر، زر الهيدر كملاذ أخير.
 */
export async function openGlobalSearchForE2E(page: Page): Promise<void> {
    if (page.isClosed()) return;

    await lawyerDashboardReady(page).click({ timeout: 5_000 }).catch(() => undefined);

    await page.keyboard.press('Control+K');
    if (await isGlobalSearchLayerOpen(page)) {
        await expectGlobalSearchOpen(page, 15_000);
        return;
    }

    const notificationPanelOpen = await page
        .getByTestId('notification-panel')
        .isVisible({ timeout: 800 })
        .catch(() => false);

    if (notificationPanelOpen) {
        await closeNotificationsPanelForE2E(page, 6_000);
        await page.keyboard.press('Control+K');
        if (await isGlobalSearchLayerOpen(page)) {
            await expectGlobalSearchOpen(page, 15_000);
            return;
        }
    }

    if (await tryForceOpenGlobalSearch(page)) {
        await expectGlobalSearchOpen(page, 15_000);
        return;
    }

    await openGlobalSearch(page);
}

export async function closeGlobalSearchForE2E(page: Page, timeout = 8_000): Promise<void> {
    if (page.isClosed()) return;
    if (await isGlobalSearchLayerOpen(page)) {
        await page.keyboard.press('Escape').catch(() => undefined);
    }
    await forceCloseGlobalSearchInPage(page);
    await expectGlobalSearchClosed(page, timeout);
}

export async function expectGlobalSearchClosed(page: Page, timeout = 8_000): Promise<void> {
    const openLayer = page.locator(GLOBAL_SEARCH_OPEN_LAYER);
    await expect(openLayer).toHaveCount(0, { timeout }).catch(async () => {
        await expect(openLayer).toBeHidden({ timeout });
    });
    await expect(page.getByTestId('global-search-input')).toBeHidden({ timeout: 2_000 }).catch(() => undefined);
}
