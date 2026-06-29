export type GlobalSearchPerfReportContext = {
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

function isSentryConfigured(): boolean {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    return Boolean(dsn && typeof dsn === 'string' && !dsn.includes('examplePublicKey'));
}

function loadSentryModule(): Promise<SentryModule | null> {
    if (!isSentryConfigured()) return Promise.resolve(null);
    if (!sentryModulePromise) {
        sentryModulePromise = import('@sentry/react')
            .then((mod) => mod as SentryModule)
            .catch(() => null);
    }
    return sentryModulePromise;
}

export function reportGlobalSearchOpenToSentry(
    durationMs: number,
    context: GlobalSearchPerfReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'global_search.perf',
            message: `global search open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                hadLocalCache: context.hadLocalCache ?? null,
                hadChunkCached: context.hadChunkCached ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('global_search.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_local_cache: Boolean(context.hadLocalCache),
                had_chunk_cached: Boolean(context.hadChunkCached),
            },
        });
    });
}

export function resetGlobalSearchSentryModuleForTests(): void {
    sentryModulePromise = null;
}
