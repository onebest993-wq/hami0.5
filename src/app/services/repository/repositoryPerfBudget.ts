/**
 * ميزانيات أداء المستودع — مرجع E2E + Sentry.
 */
export const REPOSITORY_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 2_800,
        ciColdMax: 6_500,
        ciCachedMax: 3_200,
    },
    sentryMetric: 'repository.open_to_interactive_ms',
} as const;

export type RepositoryPerfBudgetKey = keyof typeof REPOSITORY_PERF_BUDGET.openToInteractiveMs;
