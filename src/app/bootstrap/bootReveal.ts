/** أقل مدة عرض لطبقة الإقلاع — يمنع وميض «لون فقط» بلا شعار */
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/homeMainGridPaintGate';
import { hasStaticBootShell, purgeStaticBootShellPermanently } from '@/app/bootstrap/bootStaticShell';

export const BOOT_REVEAL_MIN_MS = 520;

export function getBootRevealMinMs(): number {
    return isDemoShellAuthBuild() ? 0 : BOOT_REVEAL_MIN_MS;
}

/**
 * مدة انتظار الخروج بعد الجاهزية.
 * 0 = قطع فوري بدون تلاشي (يمنع الشاشة السوداء بين الشعار والواجهة).
 */
export const BOOT_EXIT_MS = 0;

/** أقصى انتظار قبل إجبار الكشف (حماية من التعليق) */
export const BOOT_REVEAL_MAX_MS = 14_000;

/** نسخة تجريبية مفتوحة — 0 = كشف فوري بدون انتظار شعار */
export const BOOT_REVEAL_MAX_MS_DEMO = 0;

/**
 * كشف عند أول إطار ذي معنى (هيكل اللوحة).
 * deferred-app + dock يُحمَّلان بالتوازي لكن لا يحجبان الكشف — critical-shell + الشبكة الفورية يثبتان التخطيط.
 */
function isBootRevealGateReady(
    shellPaintedReady: boolean,
    _stylesReady: boolean,
    _dockChunkReady: boolean,
): boolean {
    return shellPaintedReady;
}

export function isDemoShellAuthBuild(): boolean {
    return import.meta.env.VITE_SHELL_AUTH_OPEN === 'true';
}

export function getBootRevealMaxMs(): number {
    return isDemoShellAuthBuild() ? BOOT_REVEAL_MAX_MS_DEMO : BOOT_REVEAL_MAX_MS;
}

/** مهلة جاهزية المحتوى قبل كشف — أقصر في التجريبي بعد التوازي المبكر */
export function getBootContentReadyMaxMs(): number {
    return isDemoShellAuthBuild() ? 800 : 8_000;
}

export function getBootStaticShellWatchdogMs(): number {
    return isDemoShellAuthBuild() ? 4_000 : 14_000;
}

/**
 * أساس الإقلاع الفوري للنسخة التجريبية — يُستدعى من hami-boot.js وindex.tsx.
 * يثبت الكشف + جاهزية المحتوى بلا microtask/rAF/انتظار CSS.
 */
export function applyInstantDemoBootFoundation(): void {
    if (!isDemoShellAuthBuild() || typeof window === 'undefined') return;

    /* لا كشف فوري ولا إزالة shell — MainView + useBootReveal يكشفان بعد paint */
    try {
        document.documentElement.dataset.hamiDemoInstantBoot = '1';
    } catch {
        /* ignore */
    }
}

export const BOOT_CONTENT_READY_EVENT = 'hami:boot-content-ready';
export const BOOT_REVEAL_DONE_EVENT = 'hami:boot-reveal-done';
/** يُطلق عند أول طلاء لتبويب المنزل الظاهر — مسار كشف أسرع من انتظار deferred الكامل */
export const FIRST_TAB_OPEN_EVENT = 'hami:first-tab-open';
/** يُطلق عند أول commit لـ MainView — يغطي التبويبات غير الرئيسية */
export const DASHBOARD_SHELL_PAINTED_EVENT = 'hami:dashboard-shell-painted';
/** يُطلق بعد أول paint لشبكة الرئيسية — بوابة إزالة splash الثابت */
export { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/homeMainGridPaintGate';

/**
 * مرة واحدة لكل تبويب/جلسة — يمنع إعادة شعار الإقلاع عند الرجوع من التنفيذ/الدعاوى/الإعدادات.
 * `hami_boot_complete` هو المفتاح المعتمد؛ `hami_splash_executed` يُبقى للتوافق مع نصوص إقلاع سابقة.
 */
export const HAMI_BOOT_COMPLETE_KEY = 'hami_boot_complete';
export const HAMI_SPLASH_EXECUTED_KEY = 'hami_splash_executed';

/** كل مفاتيح الجلسة التي تدل على اكتمال الإقلاع — تُقرأ وتُكتب معاً */
export const HAMI_BOOT_SESSION_KEYS = [
    HAMI_BOOT_COMPLETE_KEY,
    HAMI_SPLASH_EXECUTED_KEY,
] as const;

declare global {
    interface Window {
        __hamiBootContentReady__?: boolean;
        __hamiBootRevealDone__?: boolean;
        __hamiBootExitStarted__?: boolean;
        __hamiStaticBootPainted__?: boolean;
        /** true فقط بعد paint شبكة الرئيسية — بوابة إزالة #hami-static-boot */
        __hamiHomeMainGridPainted__?: boolean;
    }
}

function readSessionBootComplete(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return HAMI_BOOT_SESSION_KEYS.some((key) => sessionStorage.getItem(key) === '1');
    } catch {
        return false;
    }
}

export function isBootContentReady(): boolean {
    return typeof window !== 'undefined' && window.__hamiBootContentReady__ === true;
}

export function isBootRevealDone(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.__hamiBootRevealDone__ === true) return true;
    return readSessionBootComplete();
}

/** يثبت أن الإقلاع اكتمل لهذه الجلسة — لا يُعرض Splash مرة أخرى */
export function markBootRevealDone(): void {
    if (typeof window === 'undefined') return;
    if (window.__hamiBootRevealDone__ === true) return;
    window.__hamiBootRevealDone__ = true;
    try {
        for (const key of HAMI_BOOT_SESSION_KEYS) {
            sessionStorage.setItem(key, '1');
        }
    } catch {
        /* ignore */
    }

    const applyRevealedDom = () => {
        try {
            document.documentElement.dataset.hamiBootRevealed = '1';
            document.documentElement.removeAttribute('data-hami-initial-boot');
        } catch {
            /* ignore */
        }
    };

    if (hasStaticBootShell()) {
        purgeStaticBootShellPermanently();
    }
    if (typeof window !== 'undefined') {
        window.requestAnimationFrame(applyRevealedDom);
    } else {
        applyRevealedDom();
    }
}

/**
 * حارس مجمّد: بعد true لا يجوز لأي Suspense/layout جذر أن يعيد شعار الإقلاع.
 * مرادف صريح لـ isBootRevealDone لعقود الطبقة الجذرية.
 */
export function isSplashGuardFrozen(): boolean {
    return isBootRevealDone();
}

/** يُستدعى عند جاهزية هيكل اللوحة (بعد paint) */
export function notifyBootContentReady(): void {
    if (typeof window === 'undefined') return;
    if (window.__hamiBootContentReady__ === true) return;
    const fire = () => {
        window.__hamiBootContentReady__ = true;
        window.dispatchEvent(new Event(BOOT_CONTENT_READY_EVENT));
    };
    // microtask — كان rAF يُضاعَف مع finishAfterPaint/startExit ويطيل wall بعد first-tab
    queueMicrotask(fire);
}

/** بعد جاهزية المحتوى (أو فوراً إن سبق) — لتأجيل تسخين الهيدر/الأسطر عن مسار HomeTab+CSS. */
export function onBootContentReady(run: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    if (isBootContentReady()) {
        queueMicrotask(run);
        return () => undefined;
    }
    const handler = () => run();
    window.addEventListener(BOOT_CONTENT_READY_EVENT, handler, { once: true });
    return () => window.removeEventListener(BOOT_CONTENT_READY_EVENT, handler);
}

function finishAfterStablePaint(cancelled: () => boolean, finish: () => void): void {
    if (isDemoShellAuthBuild()) {
        if (!cancelled()) finish();
        return;
    }
    requestAnimationFrame(() => {
        if (!cancelled()) finish();
    });
}

/**
 * كشف عند first-tab-open / dashboard-shell-painted ثم إطار paint واحد.
 * المسارات الثانوية (deferred-app، home-dock) تُشغَّل بالتوازي ولا تحجب الكشف.
 */
export function scheduleBootContentReadyAfterStyles(
    ensureStyles: () => Promise<void>,
    opts?: { maxWaitMs?: number; onReady?: () => void; stylesDeferMs?: number },
): () => void {
    if (typeof window === 'undefined') return () => undefined;

    /** تجريبي: نفس بوابات الإنتاج — يمنع قفز البطاقات/العناوين بعد الكشف */
    if (isDemoShellAuthBuild()) {
        const maxWaitMs = opts?.maxWaitMs ?? getBootContentReadyMaxMs();
        let cancelled = false;
        let done = false;
        let shellPaintedReady = false;
        let stylesReady = false;
        let dockChunkReady = false;

        const finish = () => {
            if (cancelled || done) return;
            done = true;
            notifyBootContentReady();
            opts?.onReady?.();
        };

        const finishAfterStablePaintLocal = () => {
            finishAfterStablePaint(() => cancelled, finish);
        };

        const tryFinish = () => {
            if (isBootRevealGateReady(shellPaintedReady, stylesReady, dockChunkReady)) {
                finishAfterStablePaintLocal();
            }
        };

        const onShellPainted = () => {
            shellPaintedReady = true;
            tryFinish();
        };
        window.addEventListener(FIRST_TAB_OPEN_EVENT, onShellPainted, { once: true });
        window.addEventListener(DASHBOARD_SHELL_PAINTED_EVENT, onShellPainted, { once: true });
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onShellPainted, { once: true });

        void ensureStyles().then(() => {
            if (!cancelled) {
                stylesReady = true;
                tryFinish();
            }
        });

        void import('@/app/bootstrap/homeDockBootGate')
            .then((m) => m.waitForHomeDockBootChunk())
            .then(() => {
                if (!cancelled) {
                    dockChunkReady = true;
                    tryFinish();
                }
            })
            .catch(() => {
                if (!cancelled) {
                    dockChunkReady = true;
                    tryFinish();
                }
            });

        const maxTimer = window.setTimeout(() => {
            if (!cancelled) finishAfterStablePaintLocal();
        }, maxWaitMs);

        return () => {
            cancelled = true;
            window.clearTimeout(maxTimer);
            window.removeEventListener(FIRST_TAB_OPEN_EVENT, onShellPainted);
            window.removeEventListener(DASHBOARD_SHELL_PAINTED_EVENT, onShellPainted);
            window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onShellPainted);
        };
    }

    let cancelled = false;
    let done = false;
    let shellPaintedReady = false;
    let stylesReady = false;
    let dockChunkReady = false;
    const maxWaitMs = opts?.maxWaitMs ?? 8_000;
    const stylesDeferMs = opts?.stylesDeferMs ?? 0;

    const finish = () => {
        if (cancelled || done) return;
        done = true;
        notifyBootContentReady();
        opts?.onReady?.();
    };

    const finishAfterStablePaintLocal = () => {
        finishAfterStablePaint(() => cancelled, finish);
    };

    const tryFinish = () => {
        if (cancelled || done) return;
        if (!isBootRevealGateReady(shellPaintedReady, stylesReady, dockChunkReady)) return;
        finishAfterStablePaintLocal();
    };

    const hangId = window.setTimeout(() => {
        if (!cancelled && !done) {
            shellPaintedReady = true;
            stylesReady = true;
            dockChunkReady = true;
            finishAfterStablePaintLocal();
        }
    }, maxWaitMs);

    let stylesStarted = false;
    const startStylesRace = () => {
        if (cancelled || done || stylesStarted) return;
        stylesStarted = true;
        void ensureStyles()
            .then(() => {
                if (cancelled || done) return;
                stylesReady = true;
                tryFinish();
            })
            .catch(() => {
                if (cancelled || done) return;
                stylesReady = true;
                tryFinish();
            });
    };

    const stylesDelayId =
        stylesDeferMs > 0
            ? window.setTimeout(startStylesRace, stylesDeferMs)
            : (startStylesRace(), 0);

    void import('@/app/bootstrap/homeDockBootGate')
        .then((m) => m.waitForHomeDockBootChunk())
        .then(() => {
            if (cancelled || done) return;
            dockChunkReady = true;
            tryFinish();
        })
        .catch(() => {
            if (cancelled || done) return;
            dockChunkReady = true;
            tryFinish();
        });

    const onShellPainted = () => {
        if (cancelled || done) return;
        shellPaintedReady = true;
        tryFinish();
    };
    window.addEventListener(FIRST_TAB_OPEN_EVENT, onShellPainted, { once: true });
    window.addEventListener(DASHBOARD_SHELL_PAINTED_EVENT, onShellPainted, { once: true });
    window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onShellPainted, { once: true });
    if (typeof performance !== 'undefined') {
        if (performance.getEntriesByName('hami:boot:first-tab-open', 'mark').length > 0) {
            queueMicrotask(onShellPainted);
        }
        if (performance.getEntriesByName('hami:boot:dashboard-main-view', 'mark').length > 0) {
            queueMicrotask(onShellPainted);
        }
    }

    return () => {
        cancelled = true;
        window.clearTimeout(hangId);
        if (stylesDelayId) window.clearTimeout(stylesDelayId);
        window.removeEventListener(FIRST_TAB_OPEN_EVENT, onShellPainted);
        window.removeEventListener(DASHBOARD_SHELL_PAINTED_EVENT, onShellPainted);
        window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onShellPainted);
    };
}
