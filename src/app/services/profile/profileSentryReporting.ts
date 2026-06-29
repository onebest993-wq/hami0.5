export type ProfileSentryReportContext = {
    userId?: string;
    hadWarmCache?: boolean;
    isOwnProfile?: boolean;
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

export function reportProfileOpenToSentry(
    durationMs: number,
    context: ProfileSentryReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'profile.perf',
            message: `profile open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                hadWarmCache: context.hadWarmCache ?? null,
                isOwnProfile: context.isOwnProfile ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('profile.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_warm_cache: Boolean(context.hadWarmCache),
                is_own_profile: Boolean(context.isOwnProfile),
            },
        });
    });
}

export function resetProfileSentryModuleForTests(): void {
    sentryModulePromise = null;
}
