import { reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';

const SNAP_CLOSE_ATTR = 'data-hami-overlay-snap-close';

/** يعطّل انتقالات CSS لإطار واحد — إغلاق فوري لكل الطبقات */
export function markOverlaySnapClosing(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute(SNAP_CLOSE_ATTR, '1');
    queueMicrotask(() => {
        root.removeAttribute(SNAP_CLOSE_ATTR);
    });
}

export type OverlaySnapCloseSteps = {
    conceal?: () => void;
    commit?: () => void;
    releaseScrollLock?: boolean;
};

/**
 * مسار إغلاق موحّد: إخفاء DOM → commit React متزامن → تحرير scroll lock.
 * يُستخدم لكل الأقسام بدل rAF / flushSync / تأخيرات متفرقة.
 */
export function executeOverlaySnapClose(steps: OverlaySnapCloseSteps): void {
    markOverlaySnapClosing();
    steps.conceal?.();
    steps.commit?.();
    if (steps.releaseScrollLock !== false) {
        reconcileBodyScrollLock();
    }
}
