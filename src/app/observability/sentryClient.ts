type SentryModule = typeof import('@sentry/react');

type BufferedCapture = {
    kind: 'exception' | 'message';
    error: unknown;
    message?: string;
    extras?: Record<string, unknown>;
};

let sentryModule: SentryModule | null = null;
let initPromise: Promise<SentryModule | null> | null = null;
let initialized = false;
const preInitBuffer: BufferedCapture[] = [];

function isConfigured(): boolean {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    return Boolean(dsn && !dsn.includes('examplePublicKey'));
}

function flushPreInitBuffer(mod: SentryModule): void {
    if (preInitBuffer.length === 0) return;
    const pending = preInitBuffer.splice(0, preInitBuffer.length);
    for (const item of pending) {
        try {
            mod.withScope((scope) => {
                if (item.extras) scope.setExtras(item.extras);
                if (item.kind === 'exception') {
                    mod.captureException(item.error);
                } else if (item.message) {
                    mod.captureMessage(item.message);
                }
            });
        } catch {
            /* ignore buffered flush errors */
        }
    }
}

/**
 * تهيئة Sentry مرة واحدة — تُستدعى من deferred boot أو عند أول capture.
 * الأخطاء المبكرة تُخزَّن مؤقتاً ثم تُرسل بعد التهيئة.
 */
export function ensureSentryInitialized(): Promise<SentryModule | null> {
    if (!isConfigured()) return Promise.resolve(null);
    if (initialized && sentryModule) return Promise.resolve(sentryModule);
    if (initPromise) return initPromise;

    initPromise = import('@sentry/react')
        .then((Sentry) => {
            const isProd = import.meta.env.PROD;
            let replayAttached = false;

            const attachReplayOnError = () => {
                if (replayAttached) return;
                replayAttached = true;
                Sentry.addIntegration(
                    Sentry.replayIntegration({
                        maskAllText: false,
                        blockAllMedia: false,
                    }),
                );
            };

            Sentry.init({
                dsn: import.meta.env.VITE_SENTRY_DSN,
                integrations: [Sentry.browserTracingIntegration()],
                tracesSampleRate: isProd ? 0.12 : 1,
                replaysSessionSampleRate: 0,
                replaysOnErrorSampleRate: 1,
                environment: import.meta.env.MODE,
                beforeSend(event) {
                    if (event.level === 'warning') return null;
                    if (event.level === 'error' || event.level === 'fatal') attachReplayOnError();
                    return event;
                },
            });

            sentryModule = Sentry;
            initialized = true;
            flushPreInitBuffer(Sentry);
            return Sentry;
        })
        .catch(() => null);

    return initPromise;
}

function captureWithModule(
    mod: SentryModule,
    buffer: BufferedCapture,
): void {
    mod.withScope((scope) => {
        if (buffer.extras) scope.setExtras(buffer.extras);
        if (buffer.kind === 'exception') {
            mod.captureException(buffer.error);
        } else if (buffer.message) {
            mod.captureMessage(buffer.message);
        }
    });
}

export async function sentryCaptureException(
    error: unknown,
    extras?: Record<string, unknown>,
): Promise<void> {
    if (!isConfigured()) return;
    const buffer: BufferedCapture = { kind: 'exception', error, extras };
    if (!initialized || !sentryModule) {
        preInitBuffer.push(buffer);
        void ensureSentryInitialized();
        return;
    }
    try {
        captureWithModule(sentryModule, buffer);
    } catch {
        return;
    }
}

export async function sentryCaptureMessage(
    message: string,
    extras?: Record<string, unknown>,
): Promise<void> {
    if (!isConfigured()) return;
    const buffer: BufferedCapture = { kind: 'message', error: new Error(message), message, extras };
    if (!initialized || !sentryModule) {
        preInitBuffer.push(buffer);
        void ensureSentryInitialized();
        return;
    }
    try {
        captureWithModule(sentryModule, buffer);
    } catch {
        return;
    }
}

export async function sentryMetricDistribution(
    name: string,
    value: number,
    tags?: Record<string, string>,
): Promise<void> {
    const mod = await ensureSentryInitialized();
    if (!mod) return;
    try {
        if (!mod.metrics?.distribution) return;
        void tags;
        mod.metrics.distribution(name, value);
    } catch {
        return;
    }
}

/** للاختبارات — إعادة ضبط حالة التهيئة */
export function resetSentryClientForTests(): void {
    sentryModule = null;
    initPromise = null;
    initialized = false;
    preInitBuffer.length = 0;
}
