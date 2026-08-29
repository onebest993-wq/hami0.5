import {
    NOTIFICATION_BRIDGE_ID,
    NOTIFICATION_DISMISS_LOCK_ATTR,
    NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS,
} from './notificationInstantPaintConstants';
import { armNotificationOverlayInteraction } from './notificationInstantPaintDom';

let dismissLockCleanup: (() => void) | null = null;

export function isNotificationDismissLocked(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.hasAttribute(NOTIFICATION_DISMISS_LOCK_ATTR);
}

function setDismissLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    if (locked) document.documentElement.setAttribute(NOTIFICATION_DISMISS_LOCK_ATTR, '1');
    else document.documentElement.removeAttribute(NOTIFICATION_DISMISS_LOCK_ATTR);
}

function clearDismissLockSchedule(): void {
    if (!dismissLockCleanup) return;
    dismissLockCleanup();
    dismissLockCleanup = null;
}

function isNotificationDismissSurface(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
        target.closest('.hami-notif-overlay-btn') ||
            target.closest(`#${NOTIFICATION_BRIDGE_ID}`) ||
            target.closest('[aria-label="إغلاق الإشعارات"]'),
    );
}

export function clearNotificationDismissLock(): void {
    clearDismissLockSchedule();
    setDismissLock(false);
}

/**
 * الخلفية full-screen فوق الجرس عند أول طلاء — نفس الإصبع يغلق إن بقيت قابلة للنقر.
 * يُقفل الإغلاق حتى تُبتلع click فتح الجرس.
 */
export function beginNotificationDismissLock(): void {
    if (typeof document === 'undefined') return;
    setDismissLock(true);
    clearDismissLockSchedule();

    if (typeof window === 'undefined') return;

    let settled = false;
    const unlock = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', unlock, true);
        window.removeEventListener('click', onOpeningClick, true);
        window.clearTimeout(fallbackTimer);
        dismissLockCleanup = null;
        setDismissLock(false);
        armNotificationOverlayInteraction();
    };

    const onOpeningClick = (event: Event) => {
        if (isNotificationDismissSurface(event.target)) {
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
    const fallbackTimer = window.setTimeout(unlock, NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS);

    dismissLockCleanup = () => {
        settled = true;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', unlock, true);
        window.removeEventListener('click', onOpeningClick, true);
        window.clearTimeout(fallbackTimer);
        dismissLockCleanup = null;
    };
}
