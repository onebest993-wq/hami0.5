/** أقل مدة عرض لطبقة الإقلاع — 0 على الأصلي (نص→لوحة فور الجاهزية) */
export const BOOT_REVEAL_MIN_MS = 0;

export function getBootRevealMinMs(): number {
    return BOOT_REVEAL_MIN_MS;
}

/**
 * مدة انتظار الخروج بعد الجاهزية.
 * 0 = قطع فوري بدون تلاشي (يمنع الشاشة السوداء بين الشعار والواجهة).
 */
export const BOOT_EXIT_MS = 0;

/** أقصى انتظار قبل إجبار الكشف (حماية من التعليق) */
export const BOOT_REVEAL_MAX_MS = 14_000;

export const BOOT_CONTENT_READY_EVENT = 'hami:boot-content-ready';
export const BOOT_REVEAL_DONE_EVENT = 'hami:boot-reveal-done';
/** يُطلق عند أول طلاء لتبويب المنزل الظاهر — مسار كشف أسرع من انتظار deferred الكامل */
export const FIRST_TAB_OPEN_EVENT = 'hami:first-tab-open';

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
    window.__hamiBootRevealDone__ = true;
    try {
        document.documentElement.dataset.hamiBootRevealed = '1';
    } catch {
        /* ignore */
    }
    try {
        for (const key of HAMI_BOOT_SESSION_KEYS) {
            sessionStorage.setItem(key, '1');
        }
    } catch {
        /* ignore */
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

/**
 * كشف بعد أسبق من المسارين:
 * 1) اكتمال deferred-app (استقرار كامل) — يبدأ بعد stylesDeferMs لمنح HomeTab الشبكة
 * 2) first-tab-open — critical-shell يغطي تخطيط المنزل
 */
export function scheduleBootContentReadyAfterStyles(
    ensureStyles: () => Promise<void>,
    opts?: { maxWaitMs?: number; onReady?: () => void; stylesDeferMs?: number },
): () => void {
    if (typeof window === 'undefined') return () => undefined;
    let cancelled = false;
    let done = false;
    const maxWaitMs = opts?.maxWaitMs ?? 8_000;
    const stylesDeferMs = opts?.stylesDeferMs ?? 320;

    const finish = () => {
        if (cancelled || done) return;
        done = true;
        notifyBootContentReady();
        opts?.onReady?.();
    };

    const finishAfterPaint = () => {
        requestAnimationFrame(() => {
            if (!cancelled) finish();
        });
    };

    const hangId = window.setTimeout(finish, maxWaitMs);

    let stylesStarted = false;
    const startStylesRace = () => {
        if (cancelled || done || stylesStarted) return;
        stylesStarted = true;
        void ensureStyles()
            .then(() => {
                window.clearTimeout(hangId);
                if (cancelled || done) return;
                finishAfterPaint();
            })
            .catch(() => {
                window.clearTimeout(hangId);
                if (!done) finish();
            });
    };

    /* امنح HomeTab(~52KB) أولوية شبكة قبل deferred-app(~577KB) */
    const stylesDelayId = window.setTimeout(startStylesRace, stylesDeferMs);

    const onFirstTab = () => {
        window.clearTimeout(stylesDelayId);
        window.clearTimeout(hangId);
        if (cancelled || done) return;
        finish();
        /* بعد الكشف — حمّل/أكمل الأنماط للتحسين بدون حجب الشعار */
        stylesStarted = true;
        void ensureStyles().catch(() => undefined);
    };
    window.addEventListener(FIRST_TAB_OPEN_EVENT, onFirstTab, { once: true });
    if (
        typeof performance !== 'undefined' &&
        performance.getEntriesByName('hami:boot:first-tab-open', 'mark').length > 0
    ) {
        queueMicrotask(onFirstTab);
    }

    return () => {
        cancelled = true;
        window.clearTimeout(hangId);
        window.clearTimeout(stylesDelayId);
        window.removeEventListener(FIRST_TAB_OPEN_EVENT, onFirstTab);
    };
}
