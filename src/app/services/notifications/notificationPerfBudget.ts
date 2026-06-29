/**
 * ميزانيات أداء لوحة الإشعارات — مرجع E2E + Sentry.
 */
export const NOTIFICATION_PERF_BUDGET = {
    openToInteractiveMs: {
        target: 2_200,
        ciColdMax: 6_000,
        ciCachedMax: 3_500,
    },
    sentryMetric: 'notifications.open_to_interactive_ms',
} as const;

export type NotificationPerfBudgetKey = keyof typeof NOTIFICATION_PERF_BUDGET.openToInteractiveMs;
