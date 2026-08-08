import { isSentryEnabledInBuild as isSentryConfigured } from '@/app/observability/sentryBuildPolicy';

export type HomeHubSentryReportContext = {
    userId?: string;
    alertsTabCount?: number;
    pinsCount?: number;
    hadRadarCache?: boolean;
    hadAlertsCache?: boolean;
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
export function reportHomeHubOpenToSentry(
    durationMs: number,
    context: HomeHubSentryReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'homeHub.perf',
            message: `homeHub open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                alertsTabCount: context.alertsTabCount ?? null,
                pinsCount: context.pinsCount ?? null,
                hadRadarCache: context.hadRadarCache ?? null,
                hadAlertsCache: context.hadAlertsCache ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('homeHub.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_radar_cache: Boolean(context.hadRadarCache),
                had_alerts_cache: Boolean(context.hadAlertsCache),
            },
        });
    });
}

/** للاختبارات */
export function resetHomeHubSentryModuleForTests(): void {
    sentryModulePromise = null;
}
