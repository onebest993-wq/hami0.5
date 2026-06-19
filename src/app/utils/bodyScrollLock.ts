import { useEffect } from 'react';

/** يُطلَق لإغلاق الستائر/المديرات/المخزن قبل فتح طبقة ملء الشاشة أخرى */
export const HAMI_DISMISS_OVERLAYS_EVENT = 'hami:dismiss-transient-overlays';

export type TransientOverlayId = 'vault' | 'field-tasks' | 'tasks-manager' | 'transactions';

export function dismissTransientOverlays(except?: TransientOverlayId): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except } }));
}

let lockCount = 0;
let prevBodyOverflow = '';
let prevHtmlOverflow = '';

export function lockBodyScroll(): () => void {
    if (typeof document === 'undefined') return () => undefined;

    if (lockCount === 0) {
        prevBodyOverflow = document.body.style.overflow;
        prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        }
    };
}

export function useBodyScrollLock(active: boolean): void {
    useEffect(() => {
        if (!active) return;
        return lockBodyScroll();
    }, [active]);
}
