import { cleanupDevServiceWorkers } from '@/app/utils/devServiceWorkerCleanup';
import { initWebVitalsLogging } from '@/app/utils/webVitalsObserver';
import { scheduleDeferredGoogleFonts } from '@/app/runtime/deferredGoogleFonts';
import { applyCapacitorShellBoot } from '@/app/runtime/capacitorShellBoot';
import { bootNativeCapacitorShell } from '@/app/runtime/nativeCapacitorBoot';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { reportBootTimeline } from '@/app/bootstrap/bootMetrics';
import { ensureSentryInitialized } from '@/app/observability/sentryClient';
import { isSentryEnabledInBuild } from '@/app/observability/sentryBuildPolicy';
import { clearBootFailureRecord, reportPendingBootFailure } from '@/app/observability/bootFailureBlackBox';

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

/**
 * التهيئة كلها في sentryClient — تكرارها هنا كان يسمح بتهيئة Sentry مرتين
 * لأن كل ملف يتتبّع حالته على حدة.
 */
function initSentryDeferred(): void {
    if (!isSentryEnabledInBuild()) return;
    void ensureSentryInitialized();
}

/**
 * إقلاعٌ فاشل سبق هذا الإقلاع الناجح.
 *
 * السجل يُفرَّغ حتى مع تعطيل المراقبة: تركه يعني بلاغاً عن عطل قديم يُرسَل في
 * أول مرة تُفعَّل فيها، منسوباً إلى بناء ليس هو الذي أنتجه.
 */
function drainBootFailureRecord(): void {
    if (!isSentryEnabledInBuild()) {
        clearBootFailureRecord();
        return;
    }
    reportPendingBootFailure();
}

/** مهام ما بعد أول إطار — لا تُستدعى قبل ReactDOM.render */
export function runDeferredBootTasks(): void {
    if (isCapacitorNativePlatform()) {
        void bootNativeCapacitorShell();
    } else {
        applyCapacitorShellBoot();
    }
    installSubmitGuard();

    const run = () => {
        if (import.meta.env.DEV) {
            void cleanupDevServiceWorkers();
            try {
                initWebVitalsLogging();
                reportBootTimeline();
            } catch {
                /* ignore */
            }
        }

        installIraqDateFormatPatch();
        installArabicDatePickersPatch();
        initSentryDeferred();
        drainBootFailureRecord();
        scheduleDeferredGoogleFonts();
    };

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 8_000 });
    } else {
        window.setTimeout(run, 1_000);
    }
}
