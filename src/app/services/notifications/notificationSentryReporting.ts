import { isSentryEnabledInBuild as isSentryConfigured } from '@/app/observability/sentryBuildPolicy';

export type NotificationPerfReportContext = {
    userId?: string;
    hadLocalCache?: boolean;
    hadChunkCached?: boolean;
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

export function reportNotificationsOpenToSentry(
    durationMs: number,
    context: NotificationPerfReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'notifications.perf',
            message: `notifications open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                hadLocalCache: context.hadLocalCache ?? null,
                hadChunkCached: context.hadChunkCached ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('notifications.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_local_cache: Boolean(context.hadLocalCache),
                had_chunk_cached: Boolean(context.hadChunkCached),
            },
        });
    });
}

export function resetNotificationsSentryModuleForTests(): void {
    sentryModulePromise = null;
}
