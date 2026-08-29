/**
 * بوابة إقلاع المنزل — المالك الوحيد لإزالة #hami-static-boot بعد الشبكة الحية.
 * الاستيراد الثابت من HomeMainGrid ممنوع؛ الشبكة تعلن عبر homeMainGridPaintAnnounce فقط.
 */
import {
    BOOT_REVEAL_DONE_EVENT,
    markBootRevealDone,
    notifyBootContentReady,
} from '@/app/bootstrap/bootReveal';
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';
import { markDashboardInteractiveOnce } from '@/app/bootstrap/dashboardInteractiveMark';
import { markLawyerDashboardFirstTabOpenOnce } from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { hasAuthGateSurface, findLiveHomeMainGrid, isWorthyBootSurface } from '@/app/bootstrap/bootWorthySurface';
import {
    announceHomeMainGridPainted,
    isHomeGridRevealReady,
    isHomeMainGridPainted,
    resetHomeMainGridPaintAnnounceForTests,
    scheduleHomeMainGridPainted,
} from '@/app/bootstrap/homeMainGridPaintAnnounce';

export {
    HOME_MAIN_GRID_PAINTED_EVENT,
    announceHomeMainGridPainted,
    isHomeMainGridPainted,
    scheduleHomeMainGridPainted,
};

/** توافق اختبارات قديمة */
export const notifyHomeMainGridPainted = announceHomeMainGridPainted;

export function resetHomeMainGridPaintGateForTests(): void {
    resetHomeMainGridPaintAnnounceForTests();
    bootSideEffectsDone = false;
    watchdogArmed = false;
    if (watchdogTimer != null) {
        window.clearTimeout(watchdogTimer);
        watchdogTimer = null;
    }
    stopDashboardSurfaceWatch();
}

let bootSideEffectsDone = false;
let gateInstalled = false;
let watchdogArmed = false;
let watchdogTimer: number | null = null;
let uncoverKickTimer: number | null = null;
let uncoverObserver: MutationObserver | null = null;

/** سقف انتظار CSS بعد شبكة حية — لا قصّ بعد 800ms بلا أنماط (كان فراغاً ذهبياً) */
const DEFERRED_STYLE_HANG_MS = 8_000;

/** فتيل أمان للتعليق — لا يكشف سطحاً ناقصاً. الكشف السعيد = شبكة حية فوراً. */
export const BOOT_UNCOVER_WATCHDOG_MS = 8_000;

function uncoverBootShell(): void {
    /* تلاشي قصير فوق الواجهة النهائية — القصّ الفوري كان يُظهر رعشة الإطار الأول */
    removeStaticBootShell();
    markBootRevealDone();
    try {
        window.dispatchEvent(new Event(BOOT_REVEAL_DONE_EVENT));
    } catch {
        /* ignore */
    }
}

function waitForDeferredStylesThenUncover(): void {
    void import('@/app/runtime/deferredAppStyles')
        .then(async (m) => {
            if (m.isDeferredAppStylesLoaded()) {
                uncoverBootShell();
                return;
            }
            await Promise.race([
                m.ensureDeferredAppStylesLoaded(),
                new Promise<void>((resolve) => {
                    window.setTimeout(resolve, DEFERRED_STYLE_HANG_MS);
                }),
            ]);
            uncoverBootShell();
        })
        .catch(() => uncoverBootShell());
}

/** إزالة الغطاء idempotent — الحدث مرة واحدة عبر bootSideEffectsDone */

function finishBootShellRemoval(): void {
    notifyBootContentReady();
    waitForDeferredStylesThenUncover();
}

function finalizeBootShellRemoval(): void {
    finishBootShellRemoval();
    void import('@/app/bootstrap/BootLaunchOrchestrator')
        .then((m) => {
            m.beforeBootShellReveal();
        })
        .catch(() => undefined);
}

function runBootSideEffectsAfterGridPaint(): void {
    if (typeof window === 'undefined' || bootSideEffectsDone) return;
    if (!isHomeMainGridPainted() && window.__hamiHomeMainGridPainted__ !== true) return;
    bootSideEffectsDone = true;
    markLawyerDashboardFirstTabOpenOnce();
    markDashboardInteractiveOnce();
    finalizeBootShellRemoval();
}

function canAnnounceHappyPathUncover(): boolean {
    if (hasAuthGateSurface()) return true;
    const grid = findLiveHomeMainGrid();
    if (!grid) return false;
    return isHomeGridRevealReady(grid);
}

function armUncoverWatchdog(): void {
    if (watchdogArmed) return;
    watchdogArmed = true;
    watchdogTimer = window.setTimeout(() => {
        watchdogTimer = null;
        if (isHomeMainGridPainted() || window.__hamiHomeMainGridPainted__ === true) return;
        if (!document.getElementById('hami-static-boot')) return;
        /* فتيل أخير: سطح حي مكتمل بلا طبقة FirstPaint — لا هيكل ناقص */
        if (canAnnounceHappyPathUncover() || isWorthyBootSurface() || hasAuthGateSurface()) {
            announceHomeMainGridPainted();
        }
    }, BOOT_UNCOVER_WATCHDOG_MS);
}

/**
 * كشف السطح عند تغيّر DOM — لا استطلاع 50ms.
 * ركلة واحدة setTimeout(0) بعد الإطار الحالي + MutationObserver + فتيل 8 ثوانٍ.
 */
function stopDashboardSurfaceWatch(): void {
    if (uncoverKickTimer != null) {
        window.clearTimeout(uncoverKickTimer);
        uncoverKickTimer = null;
    }
    if (uncoverObserver) {
        uncoverObserver.disconnect();
        uncoverObserver = null;
    }
}

function watchDashboardSurfaceUncover(): void {
    if (typeof window === 'undefined') return;
    const tick = () => {
        if (isHomeMainGridPainted() || window.__hamiHomeMainGridPainted__ === true) {
            stopDashboardSurfaceWatch();
            return;
        }
        const splash = document.getElementById('hami-static-boot');
        if (!splash || !splash.parentNode) {
            stopDashboardSurfaceWatch();
            return;
        }
        if (canAnnounceHappyPathUncover()) {
            stopDashboardSurfaceWatch();
            announceHomeMainGridPainted();
            return;
        }
        if (document.querySelector('[data-hami-lawyer-dashboard]')) {
            armUncoverWatchdog();
        }
    };

    stopDashboardSurfaceWatch();
    tick();
    if (isHomeMainGridPainted() || window.__hamiHomeMainGridPainted__ === true) return;
    const splash = document.getElementById('hami-static-boot');
    if (!splash || !splash.parentNode) return;

    uncoverKickTimer = window.setTimeout(tick, 0);

    if (typeof MutationObserver === 'undefined') return;
    const root = document.documentElement;
    uncoverObserver = new MutationObserver(tick);
    uncoverObserver.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
            'data-hami-lawyer-dashboard',
            'data-hami-auth-gate',
            'data-testid',
            'data-hub-boot-settling',
            'data-hub-state',
            'data-identity-settled',
            'hidden',
        ],
    });
}

/** يُستدعى من مسار الإقلاع مرة واحدة — يربط الإعلان بإزالة الغطاء */
export function installHomeMainGridPaintGate(): void {
    if (typeof window === 'undefined' || gateInstalled) return;
    gateInstalled = true;
    window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, runBootSideEffectsAfterGridPaint);
    /* إن سبق الإعلان قبل التركيب (سباق إطار) */
    runBootSideEffectsAfterGridPaint();
    watchDashboardSurfaceUncover();
    window.addEventListener('hami:app-runtime-ready', watchDashboardSurfaceUncover);
}

installHomeMainGridPaintGate();
