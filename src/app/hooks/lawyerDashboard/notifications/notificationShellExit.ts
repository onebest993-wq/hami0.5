import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';
import { emitNotificationShellSnap } from '@/app/services/notifications/notificationShellSnap';

const CLOSING_ATTR = 'data-hami-notifications-closing';
const OPEN_ATTR = 'data-hami-notifications-open';
const TRACK_SELECTOR = '.hami-notif-sheet-track';
const SHEET_SELECTOR = '[data-testid="notification-panel"]';

/** مدة هبوط الورقة — تُطابق CSS؛ احتياط إن لم يصل transitionend */
export const NOTIFICATION_SHEET_EXIT_MS = 200;
export const NOTIFICATION_SHEET_EXIT_PAD_MS = 16;

function shouldSkipNotificationSheetMotion(): boolean {
    if (typeof document === 'undefined') return true;
    if (import.meta.env.VITE_E2E === '1' || import.meta.env.VITE_E2E === 'true') return true;
    const root = document.documentElement;
    if (
        root.dataset.hamiReduceMotion === '1' ||
        root.dataset.hamiAnimations === '0' ||
        root.dataset.hamiLite === '1'
    ) {
        return true;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

export function clearNotificationShellClosing(): void {
    if (typeof document === 'undefined') return;
    if (!document.documentElement.hasAttribute(CLOSING_ATTR)) return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    emitNotificationShellSnap();
}

/**
 * يُبقي الطبقة في الـ DOM ويهبط الورقة ثم يستدعي onDone —
 * لا يحذف React قبل اكتمال الحركة.
 */
export function beginNotificationShellExit(onDone: () => void): void {
    if (typeof document === 'undefined' || shouldSkipNotificationSheetMotion()) {
        clearOverlayEnterSettle('data-hami-notif-enter');
        clearNotificationShellClosing();
        onDone();
        return;
    }

    /* إغلاق وهو أصلاً مغلق كان يضع closing فيُظهر الورقة فوق الرئيسية */
    if (document.documentElement.getAttribute(OPEN_ATTR) !== '1') {
        clearOverlayEnterSettle('data-hami-notif-enter');
        clearNotificationShellClosing();
        onDone();
        return;
    }

    const track = document.querySelector(TRACK_SELECTOR);
    const sheet =
        track instanceof HTMLElement
            ? track
            : document.querySelector(SHEET_SELECTOR);
    if (!(sheet instanceof HTMLElement)) {
        clearNotificationShellClosing();
        onDone();
        return;
    }

    const root = document.documentElement;
    clearOverlayEnterSettle('data-hami-notif-enter');
    root.setAttribute(CLOSING_ATTR, '1');
    root.removeAttribute(OPEN_ATTR);
    /* حالة واحدة: مغلق بصرياً لكن ما زال يهبط — قبل أي مزامنة React */
    emitNotificationShellSnap();

    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        if (typeof window !== 'undefined') window.clearTimeout(fallbackTimer);
        sheet.removeEventListener('transitionend', onTransitionEnd);
        clearNotificationShellClosing();
        onDone();
    };

    const onTransitionEnd = (event: Event) => {
        if (!(event instanceof TransitionEvent)) return;
        if (event.propertyName !== 'transform') return;
        finish();
    };

    sheet.addEventListener('transitionend', onTransitionEnd);

    const fallbackTimer = window.setTimeout(
        finish,
        NOTIFICATION_SHEET_EXIT_MS + NOTIFICATION_SHEET_EXIT_PAD_MS,
    );
}
