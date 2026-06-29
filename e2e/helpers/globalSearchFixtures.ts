import type { Page } from '@playwright/test';
import { GLOBAL_SEARCH_PERF_BUDGET } from '@/app/services/search/globalSearchPerfBudget';

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
        __hamiE2eForceOpenGlobalSearch?: (seed?: string) => void;
        __hamiE2eGlobalSearchDebug?: () => { showGlobalSearch: boolean };
    }
}
