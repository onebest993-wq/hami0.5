/**
 * ميزانيات أداء مركز الإعدادات — مرجع E2E + Sentry.
 */
export const SETTINGS_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 2_000,
        ciColdMax: 5_500,
        ciCachedMax: 3_200,
    },
    sentryMetric: 'settings.open_to_interactive_ms',
} as const;

export type SettingsPerfBudgetKey = keyof typeof SETTINGS_PERF_BUDGET.openToInteractiveMs;
