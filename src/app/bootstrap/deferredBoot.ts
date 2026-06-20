import { cleanupDevServiceWorkers } from '@/app/utils/devServiceWorkerCleanup';
import { initWebVitalsLogging } from '@/app/utils/webVitalsObserver';

function installSubmitGuard(): void {
    const w = window as unknown as { __hamiSubmitGuardInstalled?: boolean };
    if (w.__hamiSubmitGuardInstalled) return;
    w.__hamiSubmitGuardInstalled = true;
    document.addEventListener(
        'submit',
        (ev) => {
            ev.preventDefault();
        },
        true,
    );
}

function installIraqDateFormatPatch(): void {
    const w = window as unknown as { __hamiIraqDateFormatInstalled?: boolean };
    if (w.__hamiIraqDateFormatInstalled) return;
    w.__hamiIraqDateFormatInstalled = true;

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    const formatTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

    const originalToLocaleDateString = Date.prototype.toLocaleDateString;
    const originalToLocaleString = Date.prototype.toLocaleString;

    Date.prototype.toLocaleDateString = function (locales?: unknown, options?: unknown) {
        try {
            const d = this as unknown as Date;
            if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
                return originalToLocaleDateString.call(d as Date, locales as never, options as never);
            }
            return formatDate(d);
        } catch {
            return originalToLocaleDateString.call(this as Date, locales as never, options as never);
        }
    };

    Date.prototype.toLocaleString = function (locales?: unknown, options?: unknown) {
        try {
            const d = this as unknown as Date;
            if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
                return originalToLocaleString.call(d as Date, locales as never, options as never);
            }
            return `${formatDate(d)} ${formatTime(d)}`;
        } catch {
            return originalToLocaleString.call(this as Date, locales as never, options as never);
        }
    };
}

function installArabicDatePickersPatch(): void {
    const w = window as unknown as { __hamiArabicDatePickersInstalled?: boolean };
    if (w.__hamiArabicDatePickersInstalled) return;
    w.__hamiArabicDatePickersInstalled = true;

    const apply = () => {
        try {
            document.querySelectorAll('input[type="date"]').forEach((el) => {
                el.setAttribute('lang', 'ar-IQ');
                el.setAttribute('dir', 'ltr');
                el.setAttribute('placeholder', 'DD/MM/YYYY');
                el.setAttribute('title', 'DD/MM/YYYY');
                el.setAttribute('data-date-format', 'dmy');
            });
        } catch {
            /* ignore */
        }
    };

    apply();
    try {
        let debounceTimer: number | null = null;
        let disconnected = false;
        const mo = new MutationObserver(() => {
            if (disconnected) return;
            if (debounceTimer !== null) window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                debounceTimer = null;
                apply();
            }, 400);
        });
        mo.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['type'],
        });
        window.setTimeout(() => {
            disconnected = true;
            mo.disconnect();
            if (debounceTimer !== null) window.clearTimeout(debounceTimer);
        }, 8_000);
    } catch {
        /* ignore */
    }
}

function initSentryDeferred(): void {
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    if (!sentryDsn || sentryDsn.includes('examplePublicKey')) return;

    void import('@sentry/react')
        .then((Sentry) => {
            const isProd = import.meta.env.PROD;
            Sentry.init({
                dsn: sentryDsn,
                integrations: [
                    Sentry.browserTracingIntegration(),
                    Sentry.replayIntegration({
                        maskAllText: false,
                        blockAllMedia: false,
                    }),
                ],
                tracesSampleRate: isProd ? 0.12 : 1,
                replaysSessionSampleRate: isProd ? 0.02 : 0.1,
                replaysOnErrorSampleRate: 1,
                environment: import.meta.env.MODE,
                beforeSend(event) {
                    if (event.level === 'warning') return null;
                    return event;
                },
            });
        })
        .catch(() => {
            /* optional */
        });
}

function prefetchDemoChunks(): void {
    if (import.meta.env.DEV) return;
    void import('@/app/utils/screenPrefetch').then(({ scheduleDemoPrefetchWaves }) => {
        scheduleDemoPrefetchWaves();
    });
}

/** مهام ما بعد أول إطار — لا تُستدعى قبل ReactDOM.render */
export function runDeferredBootTasks(): void {
    installSubmitGuard();

    const run = () => {
        if (import.meta.env.DEV) {
            void cleanupDevServiceWorkers();
            try {
                initWebVitalsLogging();
            } catch {
                /* ignore */
            }
        }

        installIraqDateFormatPatch();
        installArabicDatePickersPatch();
        initSentryDeferred();
        prefetchDemoChunks();
    };

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 2000 });
    } else {
        window.setTimeout(run, 0);
    }
}
