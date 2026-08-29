import { isSentryEnabledInBuild as isSentryConfigured } from '@/app/observability/sentryBuildPolicy';

export type SettingsPerfReportContext = {
    userId?: string;
    activeSection?: string;
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

/** breadcrumb + metric distribution — best effort، لا يرمي */
export function reportSettingsOpenToSentry(
    durationMs: number,
    context: SettingsPerfReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'settings.perf',
            message: `settings open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                activeSection: context.activeSection ?? null,
                hadChunkCached: context.hadChunkCached ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('settings.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_chunk_cached: Boolean(context.hadChunkCached),
                active_section: context.activeSection ?? 'unknown',
            },
        });
    });
}

/** للاختبارات */
export function resetSettingsSentryModuleForTests(): void {
    sentryModulePromise = null;
}
