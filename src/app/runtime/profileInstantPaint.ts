/** كشف/إخفاء الملف المهني فوراً في الـ DOM — مستقل عن إطار React */

import {
    snapProfileShellClose,
    snapProfileShellOpen,
} from '@/app/services/profile/profileShellSnap';
import { markProfilePerfPhase } from '@/app/services/profile/profilePerfMetrics';
import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';
import { wasProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

const SURFACE_SELECTOR = '[data-testid="lawyer-dashboard-profile-surface"]';
const FIRST_PAGE_SELECTOR = '[data-profile-open-first-page]';
const LIVE_TREE_SELECTOR = '[data-profile-live-tree]';
const LIVE_CONTENT_SELECTOR = '[data-testid="lawyer-profile"]';
/** جسم الصفحة (تواصل/معرض) — الهيرو وحده ليس صفحة جاهزة */
const LIVE_BODY_SELECTOR = '[data-profile-page-body]';
const LIVE_BLOCKED_SELECTOR = '[data-testid="lawyer-profile-access-blocked"]';
const LIVE_ERROR_SELECTOR = '[data-testid="lawyer-profile-load-error"]';
const BRIDGE_ID = 'hami-profile-instant-bridge';
const FIRST_PAINT_LAYER = '[data-hami-home-first-paint-layer]';
const CHROME = '#020408';

/** إطارات بعد وجود الصفحة الحية — يمنح React/CSS وقت الرسم قبل رفع الجسر */
export const PROFILE_LIVE_PAINT_SETTLE_FRAMES = 2;

/** يُطلق عند snap الفتح — Inner يُرقّي FullBoot ويُزيل غطاء FirstPaint إن وُجد */
export const PROFILE_PROMOTE_SHELL_EVENT = 'hami:profile-promote-shell';

/** الصفحة الكاملة في الـ DOM — React يفعّل التبويب حينها لا قبلها */
export const PROFILE_LIVE_SHELL_READY_EVENT = 'hami:profile-live-shell-ready';

let forceVisible = false;
let handoffRaf = 0;
let snapObserver: MutationObserver | null = null;
const LIVE_SNAP_RAF_CAP = 120;

export function isProfileForceVisible(): boolean {
    return forceVisible;
}

export function clearProfileForceVisible(): void {
    forceVisible = false;
    cancelBridgeHandoff();
}

function resolveSurface(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const surface = document.querySelector(SURFACE_SELECTOR);
    return surface instanceof HTMLElement ? surface : null;
}

function isHomeFirstPaintCovering(): boolean {
    return Boolean(document.querySelector(FIRST_PAINT_LAYER));
}

function isProfilePageComplete(root: ParentNode): boolean {
    return Boolean(
        root.querySelector(LIVE_BODY_SELECTOR) ||
            root.querySelector(LIVE_BLOCKED_SELECTOR) ||
            root.querySelector(LIVE_ERROR_SELECTOR),
    );
}

/**
 * صفحة الفتح الكاملة أو الشجرة الحية — لا انتظار شبكة.
 */
export function isProfileLiveContentReady(): boolean {
    if (typeof document === 'undefined') return false;
    if (isHomeFirstPaintCovering()) return false;
    const surface = resolveSurface();
    if (!surface) return false;
    if (surface.querySelector(LIVE_ERROR_SELECTOR)) return true;
    if (surface.querySelector(FIRST_PAGE_SELECTOR)) return true;
    const live = surface.querySelector(LIVE_TREE_SELECTOR) ?? surface.querySelector(LIVE_CONTENT_SELECTOR);
    if (!(live instanceof HTMLElement)) return false;
    return isProfilePageComplete(live);
}

function applySurfacePaint(surface: HTMLElement, visible: boolean): void {
    /* دائماً fixed على الشاشة — يمنع شريط لون اللوحة فوق absolute داخل SafeView */
    surface.style.setProperty('position', 'fixed');
    surface.style.setProperty('inset', '0');
    surface.style.setProperty('width', '100%');
    surface.style.setProperty('height', '100%');
    surface.style.setProperty('max-height', '100dvh');
    surface.style.setProperty('background-color', CHROME);
    if (visible) {
        surface.style.setProperty('visibility', 'visible');
        surface.style.setProperty('pointer-events', 'auto');
        surface.style.setProperty('z-index', '200');
        surface.style.removeProperty('opacity');
        /* inert من keep-alive كان يعيد نقرات Playwright/اللمس إلى ستاك الرئيسية */
        surface.removeAttribute('inert');
        surface.classList.add('hami-dashboard-tab-preserve--active');
        surface.setAttribute('data-hami-tab-preserve', 'active');
    } else {
        /*
         * إخفاء صريح بالـ inline — لا removeProperty:
         * بينما React ما زال يضع --active يبقى السطح مرئياً من الـ CSS
         * إن اكتفينا بإزالة الأنماط فقط.
         */
        surface.style.setProperty('opacity', '0');
        surface.style.setProperty('visibility', 'hidden');
        surface.style.setProperty('pointer-events', 'none');
        surface.style.setProperty('z-index', '0');
        surface.classList.remove('hami-dashboard-tab-preserve--active');
        surface.setAttribute('data-hami-tab-preserve', 'idle');
    }
}


/**
 * يحرّر غطاء الرئيسية من data-hami-feature-open (useOpaqueFeatureSurface)
 * حتى تظهر الرئيسية المرسومة أصلاً فور إزالة data-hami-profile-open.
 */
export function releaseProfileFeatureChrome(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.removeAttribute('data-hami-feature-open');
    if ('hamiFeatureOpen' in root.dataset) {
        delete root.dataset.hamiFeatureOpen;
    }
}

export function removeProfileInstantBridge(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(BRIDGE_ID)?.remove();
}

function disconnectSnapObserver(): void {
    snapObserver?.disconnect();
    snapObserver = null;
}

function cancelBridgeHandoff(): void {
    if (handoffRaf && typeof window !== 'undefined') {
        window.cancelAnimationFrame(handoffRaf);
        handoffRaf = 0;
    }
    disconnectSnapObserver();
}

function attachSnapObserver(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    disconnectSnapObserver();
    const target = resolveSurface() ?? document.documentElement;
    snapObserver = new MutationObserver(() => {
        if (!forceVisible) {
            disconnectSnapObserver();
            return;
        }
        if (!isProfileLiveContentReady()) return;
        disconnectSnapObserver();
        commitLiveSurface(true);
    });
    snapObserver.observe(target, { childList: true, subtree: true });
}

function commitLiveSurface(notifyReact: boolean): void {
    /* rAF/Observer قد يكتمل بعد conceal — لا تعِد snap فوق الرئيسية */
    if (!forceVisible) return;
    snapProfileShellOpen();
    const surface = resolveSurface();
    if (surface) applySurfacePaint(surface, true);
    removeProfileInstantBridge();
    if (notifyReact && typeof window !== 'undefined') {
        try {
            window.dispatchEvent(new Event(PROFILE_LIVE_SHELL_READY_EVENT));
        } catch {
            /* ignore */
        }
    }
}

function scheduleLiveSnap(): void {
    if (typeof window === 'undefined') return;
    cancelBridgeHandoff();

    let ticks = 0;
    const tick = () => {
        handoffRaf = 0;
        if (!forceVisible) return;

        if (isProfileLiveContentReady()) {
            commitLiveSurface(true);
            return;
        }

        if (++ticks > LIVE_SNAP_RAF_CAP) {
            attachSnapObserver();
            return;
        }

        handoffRaf = window.requestAnimationFrame(tick);
    };

    handoffRaf = window.requestAnimationFrame(tick);
}

function dispatchPromoteShell(): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new Event(PROFILE_PROMOTE_SHELL_EVENT));
    } catch {
        /* ignore */
    }
}

/**
 * يكشف الملف فقط عندما الصفحة الكاملة في الـ DOM.
 * تفعيل تبويب React (--active، z-index 5) قبل ذلك يغطي الرئيسية بسطح #020408 فارغ —
 * حتى بلا data-hami-profile-open. هذا أصل الشاشة السوداء لا وزن المعرض.
 */
export function revealProfileWarmShell(): boolean {
    if (typeof document === 'undefined') return false;

    forceVisible = true;
    dispatchPromoteShell();

    const live = isProfileLiveContentReady();

    if (live) {
        commitLiveSurface(false);
        try {
            markProfilePerfPhase('shell-revealed');
        } catch {
            /* ignore */
        }
        return !isHomeFirstPaintCovering();
    }

    removeProfileInstantBridge();
    scheduleLiveSnap();

    try {
        markProfilePerfPhase('shell-revealed');
    } catch {
        /* ignore */
    }
    return false;
}

export function paintProfileInstantChrome(): boolean {
    return revealProfileWarmShell();
}

const BACK_LOCK_ATTR = 'data-hami-profile-back-locked';
export const PROFILE_BACK_UNLOCK_FALLBACK_MS = 700;
let backLockCleanup: (() => void) | null = null;

export function isProfileBackLocked(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.hasAttribute(BACK_LOCK_ATTR);
}

function setBackLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    if (locked) document.documentElement.setAttribute(BACK_LOCK_ATTR, '1');
    else document.documentElement.removeAttribute(BACK_LOCK_ATTR);
}

export function clearProfileBackLock(): void {
    if (backLockCleanup) {
        backLockCleanup();
        backLockCleanup = null;
    }
    setBackLock(false);
}

/**
 * زر الرجوع يظهر في ركن الاسم — نفس الإصبع يغلق إن بقي الزر قابلاً للنقر.
 */
export function beginProfileBackLock(): void {
    if (typeof document === 'undefined') return;
    setBackLock(true);
    if (backLockCleanup) {
        backLockCleanup();
        backLockCleanup = null;
    }
    if (typeof window === 'undefined') return;

    let settled = false;
    const unlock = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', unlock, true);
        window.removeEventListener('click', onOpeningClick, true);
        window.clearTimeout(fallbackTimer);
        backLockCleanup = null;
        setBackLock(false);
    };

    const onOpeningClick = (event: Event) => {
        const target = event.target;
        if (target instanceof Element && target.closest('[data-testid="lawyer-profile-back"]')) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
        }
        unlock();
    };

    const onPointerEnd = () => {
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.addEventListener('click', onOpeningClick, true);
    };

    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', unlock, true);
    const fallbackTimer = window.setTimeout(unlock, PROFILE_BACK_UNLOCK_FALLBACK_MS);

    backLockCleanup = () => {
        settled = true;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', unlock, true);
        window.removeEventListener('click', onOpeningClick, true);
        window.clearTimeout(fallbackTimer);
        backLockCleanup = null;
    };
}

/**
 * إخفاء فوري للملف + تحرير feature-open —
 * الرئيسية تبقى is-active أثناء تبويب الملف (home-stack) فتظهر فور إزالة
 * data-hami-profile-open — بلا data-hami-feature-open من تبويب الملف.
 */
export function concealProfileWarmShell(): void {
    /* جلسة فتح قائمة: لا تُخفِ snap من مسار إصلاحي (تبويب الرئيسية بالخطأ).
     * الإغلاق المقصود يصفّر النية أولاً في runProfileClosePaint. */
    if (wasProfileOpenedThisPage()) return;
    forceVisible = false;
    cancelBridgeHandoff();
    clearOverlayEnterSettle('data-hami-profile-enter');
    clearProfileBackLock();
    /* حرّر أي feature-open متبقّي قبل إخفاء السطح — يمنع إطار أسود */
    releaseProfileFeatureChrome();
    snapProfileShellClose();
    removeProfileInstantBridge();
    const surface = resolveSurface();
    if (surface) applySurfacePaint(surface, false);
}
