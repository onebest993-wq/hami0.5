import { isSentryEnabledInBuild as isSentryConfigured } from '@/app/observability/sentryBuildPolicy';

export type CalendarPerfReportContext = {
    userId?: string;
    eventCount?: number;
    hadLocalCache?: boolean;
};

type SentryModule = {
    addBreadcrumb?: (crumb: {
        category?: string;
        message?: string;
        level?: string;
        data?: Record<string, unknown>;
    }) => void;
    metrics?: {
        distribution?: (
            name: string,
            value: number,
            options?: { unit?: string; attributes?: Record<string, string | number | boolean> },
        ) => void;
    };
};

let sentryModulePromise: Promise<SentryModule | null> | null = null;

function loadSentryModule(): Promise<SentryModule | null> {
    if (!isSentryConfigured()) return Promise.resolve(null);
    if (!sentryModulePromise) {
        sentryModulePromise = import('@sentry/react')
            .then((mod) => mod as SentryModule)
            .catch(() => null);
    }
    return sentryModulePromise;
}

/** breadcrumb + metric distribution — best effort، لا يرمي */
export function reportCalendarOpenToSentry(
    durationMs: number,
    context: CalendarPerfReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'calendar.perf',
            message: `calendar open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                eventCount: context.eventCount ?? null,
                hadLocalCache: context.hadLocalCache ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('calendar.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_local_cache: Boolean(context.hadLocalCache),
            },
        });
    });
}

export type CalendarBridgeSyncFailureContext = {
    phase: string;
    userId?: string;
};

/** breadcrumb عند فشل مزامنة جسر التقويم — لا يرمي */
export function reportCalendarBridgeSyncFailure(
    error: unknown,
    context: CalendarBridgeSyncFailureContext,
): void {
    const message = error instanceof Error ? error.message : String(error);
    void loadSentryModule().then((Sentry) => {
        Sentry?.addBreadcrumb?.({
            category: 'calendar.bridge',
            message: `bridge sync failed: ${context.phase}`,
            level: 'error',
            data: {
                phase: context.phase,
                userId: context.userId ? '[redacted]' : null,
                error: message.slice(0, 240),
            },
        });
    });
}

/** للاختبارات */
export function resetCalendarSentryModuleForTests(): void {
    sentryModulePromise = null;
}
