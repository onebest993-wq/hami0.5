/**
 * ميزانيات أداء المنتدى — مرجع E2E + Sentry.
 */
export const FORUM_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 3_200,
        ciColdMax: 7_000,
        ciCachedMax: 3_800,
    },
    sentryMetric: 'forum.open_to_interactive_ms',
} as const;

export type ForumPerfBudgetKey = keyof typeof FORUM_PERF_BUDGET.openToInteractiveMs;
