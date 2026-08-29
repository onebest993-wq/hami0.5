/**
 * ميزانيات أداء مركز الإعدادات — مرجع E2E + Sentry.
 * fallback: الأمن sync؛ لا نعلّق علامة interactive 1200ms.
 */
export const SETTINGS_INTERACTIVE_FALLBACK_MS = 180;

export const SETTINGS_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 800,
        ciColdMax: 4_000,
        ciCachedMax: 2_000,
    },
    sentryMetric: 'settings.open_to_interactive_ms',
} as const;

export type SettingsPerfBudgetKey = keyof typeof SETTINGS_PERF_BUDGET.openToInteractiveMs;
