export type ForumPerfReportContext = {
    userId?: string;
    postCount?: number;
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

/** breadcrumb + metric distribution — best effort، لا يرمي */
export function reportForumOpenToSentry(
    durationMs: number,
    context: ForumPerfReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'forum.perf',
            message: `forum open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                postCount: context.postCount ?? null,
                hadLocalCache: context.hadLocalCache ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('forum.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_local_cache: Boolean(context.hadLocalCache),
            },
        });
    });
}

/** للاختبارات */
export function resetForumSentryModuleForTests(): void {
    sentryModulePromise = null;
}
