import { isSentryEnabledInBuild as isSentryConfigured } from '@/app/observability/sentryBuildPolicy';

export type RepositoryPerfReportContext = {
    userId?: string;
    vaultDocCount?: number;
    notesCount?: number;
    hadVaultCache?: boolean;
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
export function reportRepositoryOpenToSentry(
    durationMs: number,
    context: RepositoryPerfReportContext = {},
): void {
    if (durationMs < 0 || !Number.isFinite(durationMs)) return;

    void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;

        Sentry.addBreadcrumb?.({
            category: 'repository.perf',
            message: `repository open→interactive ${durationMs}ms`,
            level: 'info',
            data: {
                durationMs,
                vaultDocCount: context.vaultDocCount ?? null,
                notesCount: context.notesCount ?? null,
                hadVaultCache: context.hadVaultCache ?? null,
                userId: context.userId ? '[redacted]' : null,
            },
        });

        Sentry.metrics?.distribution?.('repository.open_to_interactive_ms', durationMs, {
            unit: 'millisecond',
            attributes: {
                had_vault_cache: Boolean(context.hadVaultCache),
            },
        });
    });
}

/** للاختبارات */
export function resetRepositorySentryModuleForTests(): void {
    sentryModulePromise = null;
}
