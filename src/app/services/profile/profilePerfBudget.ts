/**
 * ميزانيات أداء الملف المهني — مرجع E2E.
 */
export const PROFILE_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 3_200,
        ciColdMax: 8_000,
        ciCachedMax: 4_500,
    },
} as const;

export type ProfilePerfBudgetKey = keyof typeof PROFILE_PERF_BUDGET.openToInteractiveMs;
