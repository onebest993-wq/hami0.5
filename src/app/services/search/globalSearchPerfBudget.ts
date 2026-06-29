/**
 * ميزانيات أداء البحث الشامل — مرجع E2E + Sentry.
 */
export const GLOBAL_SEARCH_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 2_400,
        ciColdMax: 7_000,
        ciCachedMax: 4_000,
    },
    sentryMetric: 'global_search.open_to_interactive_ms',
} as const;
