/**
 * ميزانيات أداء التقويم — مرجع E2E + Sentry.
 * CI: حدود سخية لتفادي flakiness.
 * target: الهدف بعد تحسينات UI/cache (يُضبط من p95 إنتاج لاحقاً).
 */
export const CALENDAR_PERF_BUDGET = {
    /** open-request → interactive (performance marks) */
    openToInteractiveMs: {
        target: 2_500,
        /** أول فتح بدون كاش — CI */
        ciColdMax: 6_000,
        /** فتح مع snapshot محلي — CI */
        ciCachedMax: 3_000,
    },
    sentryMetric: 'calendar.open_to_interactive_ms',
} as const;

export type CalendarPerfBudgetKey = keyof typeof CALENDAR_PERF_BUDGET.openToInteractiveMs;
