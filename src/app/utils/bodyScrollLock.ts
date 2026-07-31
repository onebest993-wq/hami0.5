import { useEffect } from 'react';

/** يُطلَق لإغلاق الستائر/المديرات/المخزن قبل فتح طبقة ملء الشاشة أخرى */
export const HAMI_DISMISS_OVERLAYS_EVENT = 'hami:dismiss-transient-overlays';

export type TransientOverlayId =
    | 'repository'
    | 'vault'
    | 'field-tasks'
    | 'tasks-manager'
    | 'transactions'
    | 'global-search'
    | 'notifications'
    | 'profile'
    | 'profile-settings'
    | 'settings'
    | 'forum'
    | 'notepad'
    | 'home-layout-edit';

export function dismissTransientOverlays(except?: TransientOverlayId): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except } }));
}

let lockCount = 0;
let prevBodyOverflow = '';
let prevBodyOverflowY = '';
let prevHtmlOverflow = '';
let prevHtmlOverflowY = '';
let scrollClampBound = false;
const lockCleanups = new Set<() => void>();

function clampDocumentScrollToTop(): void {
    if (typeof window === 'undefined') return;
    if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0 || document.body.scrollTop !== 0) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }
}

function bindScrollClamp(): void {
    if (scrollClampBound || typeof window === 'undefined') return;
    scrollClampBound = true;
    window.addEventListener('scroll', clampDocumentScrollToTop, { passive: true, capture: true });
}

function unbindScrollClamp(): void {
    if (!scrollClampBound || typeof window === 'undefined') return;
    scrollClampBound = false;
    window.removeEventListener('scroll', clampDocumentScrollToTop, true);
}

/** يحرّر كل أقفال التمرير النشطة — يُستدعى فقط عند إغلاق طبقات متداخلة أو تنظيف طارئ */
export function releaseBodyScrollLock(): void {
    if (typeof document === 'undefined') return;
    for (const cleanup of [...lockCleanups]) {
        cleanup();
    }
}

/** يصلح overflow عالقاً عندما لا يوجد قفل نشط — تنظيف بعد تعارض الطبقات */
export function reconcileBodyScrollLock(): void {
    if (typeof document === 'undefined') return;
    if (lockCount > 0) return;
    const bodyHidden =
        document.body.style.overflow === 'hidden' || document.body.style.overflowY === 'hidden';
    const htmlHidden =
        document.documentElement.style.overflow === 'hidden' ||
        document.documentElement.style.overflowY === 'hidden';
    if (bodyHidden || htmlHidden) {
        document.body.style.overflow = prevBodyOverflow || '';
        document.body.style.overflowY = prevBodyOverflowY || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        document.documentElement.style.overflowY = prevHtmlOverflowY || '';
    }
    if (document.body.style.touchAction === 'none' && !document.documentElement.dataset.hamiHomeDragActive) {
        document.body.style.touchAction = '';
    }
}

/** يصلح overflow عالقاً بعد العودة للتطبيق */
export function bindBodyScrollLockReconcile(): () => void {
    if (typeof document === 'undefined') return () => undefined;

    const onVisibility = () => {
        if (!document.hidden) reconcileBodyScrollLock();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
}

export function getBodyScrollLockDebugState(): {
    lockCount: number;
    bodyOverflow: string;
    htmlOverflow: string;
} {
    if (typeof document === 'undefined') {
        return { lockCount, bodyOverflow: '', htmlOverflow: '' };
    }
    return {
        lockCount,
        bodyOverflow: document.body.style.overflow || document.body.style.overflowY,
        htmlOverflow: document.documentElement.style.overflow || document.documentElement.style.overflowY,
    };
}

function applyLockedOverflow(): void {
    document.body.style.overflow = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
}

function restoreUnlockedOverflow(): void {
    document.body.style.overflow = prevBodyOverflow;
    document.body.style.overflowY = prevBodyOverflowY;
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.documentElement.style.overflowY = prevHtmlOverflowY;
}

export function lockBodyScroll(): () => void {
    if (typeof document === 'undefined') return () => undefined;

    if (lockCount === 0) {
        prevBodyOverflow = document.body.style.overflow;
        prevBodyOverflowY = document.body.style.overflowY;
        prevHtmlOverflow = document.documentElement.style.overflow;
        prevHtmlOverflowY = document.documentElement.style.overflowY;
        applyLockedOverflow();
        clampDocumentScrollToTop();
        bindScrollClamp();
    }
    lockCount += 1;

    const releaseOne = () => {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
            unbindScrollClamp();
            restoreUnlockedOverflow();
        }
    };

    const cleanup = () => {
        if (lockCleanups.delete(cleanup)) {
            releaseOne();
        }
    };

    lockCleanups.add(cleanup);
    return cleanup;
}

export function useBodyScrollLock(active: boolean): void {
    useEffect(() => {
        if (!active) return;
        return lockBodyScroll();
    }, [active]);
}
