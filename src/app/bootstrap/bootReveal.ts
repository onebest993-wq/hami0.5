/** أقل مدة عرض لطبقة الإقلاع — سطح صامت بنفس لون اللوحة: صفر. أي حد أدنى = انتظار بلا مبرر. */
/** إزالة #hami-static-boot ليست هنا — مالك التسليم = homeMainGridPaintGate (تلاشي وليس قصّاً). */
import { FIRST_TAB_OPEN_EVENT, HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';

export function getBootRevealMinMs(): number {
    return 0;
}

/**
 * مدة انتظار الخروج بعد الجاهزية.
 * 0 = قطع فوري بدون تلاشي (يمنع الشاشة السوداء بين الشعار والواجهة).
 */
export const BOOT_EXIT_MS = 0;

/** أقصى انتظار قبل إخفاء طبقة React — لا يزيل #hami-static-boot */
const BOOT_REVEAL_MAX_MS = 4_000;

/** تجريبي/جهاز: حارس تعليق فقط — ليس كشفاً فورياً يمزّق الطبقة قبل طلاء المنزل */
const BOOT_REVEAL_MAX_MS_DEMO = 4_000;

/**
 * كشف عند أول إطار ذي معنى: شبكة الرئيسية المرسومة (أو بوابة الدخول عبر bootGateSurface).
 * first-tab صار مرادفاً لـ home-main-grid — لا كشف من نموذج Minimal الفارغ.
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
function getBootContentReadyMaxMs(): number {
    return isDemoShellAuthBuild() ? 800 : 8_000;
}

/**
 * أساس الإقلاع الفوري للنسخة التجريبية — يُستدعى من hami-boot.js وindex.tsx.
 * يثبت الكشف + جاهزية المحتوى بلا microtask/rAF/انتظار CSS.
 */
export function applyInstantDemoBootFoundation(): void {
    if (!isDemoShellAuthBuild() || typeof window === 'undefined') return;

    /* لا كشف فوري ولا إزالة shell — التسليم يبقى لـ homeMainGridPaintGate بعد الشبكة الحية */
    try {
        document.documentElement.dataset.hamiDemoInstantBoot = '1';
    } catch {
        /* ignore */
    }
}

export const BOOT_CONTENT_READY_EVENT = 'hami:boot-content-ready';
export const BOOT_REVEAL_DONE_EVENT = 'hami:boot-reveal-done';
/** يُطلق عند أول commit لـ MainView — يغطي التبويبات غير الرئيسية */
export const DASHBOARD_SHELL_PAINTED_EVENT = 'hami:dashboard-shell-painted';
export { FIRST_TAB_OPEN_EVENT, HOME_MAIN_GRID_PAINTED_EVENT };

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

function pingNativeBootReady(): void {
    /* لا void-and-forget صامت: المسار يُعيد المحاولة ويُعلن الفشل إن لزم */
    void import('@/app/runtime/nativeBootSplash').then((m) => {
        void m.notifyNativeBootReady().catch(() => false);
    });
}

/** يثبت أن الإقلاع اكتمل لهذه الجلسة — لا يُعرض Splash مرة أخرى */
export function markBootRevealDone(): void {
    if (typeof window === 'undefined') return;
    /* hami-boot.js قد يضع العلم من sessionStorage قبل paint — لا نتخطى إشعار الأصلي */
    const firstMark = window.__hamiBootRevealDone__ !== true;
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
        pingNativeBootReady();
    };

    applyRevealedDom();
    if (firstMark && typeof window !== 'undefined') {
        void import('@/app/runtime/nativeBootTelemetry').then((m) => m.publishNativeBootTelemetry());
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
 * جاهزية محتوى اللوحة بعد طلاء سطح ذي معنى.
 * لا يحجب الكشف على deferred-app / dock — يعملان بالتوازي.
 * إزالة #hami-static-boot ليست هنا: مالك المنزل = homeMainGridPaintGate.
 */
export function scheduleBootContentReadyAfterStyles(
    ensureStyles: () => Promise<void>,
    opts?: { maxWaitMs?: number; onReady?: () => void; stylesDeferMs?: number },
): () => void {
    if (typeof window === 'undefined') return () => undefined;

    let cancelled = false;
    let done = false;
    let shellPaintedReady = false;
    let stylesReady = false;
    const maxWaitMs = opts?.maxWaitMs ?? getBootContentReadyMaxMs();
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
        if (!isBootRevealGateReady(shellPaintedReady, stylesReady, true)) return;
        finishAfterStablePaintLocal();
    };

    const hangId = window.setTimeout(() => {
        if (!cancelled && !done) {
            shellPaintedReady = true;
            stylesReady = true;
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
