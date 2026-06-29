/**
 * ميزانيات أداء بطاقة التنبيهات والتثبيت — مرجع E2E.
 */
export const HOME_HUB_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 2_800,
        ciColdMax: 6_500,
        ciCachedMax: 3_500,
    },
} as const;

export type HomeHubPerfBudgetKey = keyof typeof HOME_HUB_PERF_BUDGET.openToInteractiveMs;
