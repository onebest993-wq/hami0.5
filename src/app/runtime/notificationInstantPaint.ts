/** كشف/إخفاء لوحة الإشعارات فوراً في الـ DOM — مستقل عن إطار React */

import {
    snapNotificationShellClose,
    snapNotificationShellOpen,
} from '@/app/services/notifications/notificationShellSnap';
import {
    armOverlayEnterSettle,
    clearOverlayEnterSettle,
} from '@/app/runtime/overlayEnterSettle';
import { NOTIFICATION_LAYER_SELECTOR } from './notificationInstantPaintConstants';
import { applyNotificationLayerVisible } from './notificationInstantPaintDom';
import { clearNotificationDismissLock } from './notificationInstantPaintInteract';
import {
    cancelNotificationChromeHandoff,
    ensureNotificationInstantBridge,
    removeNotificationInstantBridge,
    scheduleNotificationChromeHandoff,
} from './notificationInstantPaintBridge';
import { setNotificationForceVisible } from './notificationInstantPaintState';

export { NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS } from './notificationInstantPaintConstants';
export {
    clearNotificationForceVisible,
    isNotificationForceVisible,
} from './notificationInstantPaintState';
export {
    armNotificationOverlayInteraction,
} from './notificationInstantPaintDom';
export {
    beginNotificationDismissLock,
    clearNotificationDismissLock,
    isNotificationDismissLocked,
} from './notificationInstantPaintInteract';
export { removeNotificationInstantBridge } from './notificationInstantPaintBridge';

/**
 * طلاء في لمسة الجرس: Host موجود → الورقة الحقيقية (منزلق سفلي).
 * بلا Host → جسر شفاف يتحرّك بنفس CSS حتى تُركَّب الورقة.
 */
export function paintNotificationInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    snapNotificationShellOpen();
    setNotificationForceVisible(true);

    const existingHost = document.querySelector(NOTIFICATION_LAYER_SELECTOR);
    if (existingHost instanceof HTMLElement) {
        cancelNotificationChromeHandoff();
        removeNotificationInstantBridge();
        applyNotificationLayerVisible(existingHost, true);
        armOverlayEnterSettle(
            'data-hami-notif-enter',
            () => document.querySelector('.hami-notif-sheet-track'),
        );
        return true;
    }

    ensureNotificationInstantBridge();
    armOverlayEnterSettle(
        'data-hami-notif-enter',
        () => document.querySelector('.hami-notif-sheet-track'),
    );
    scheduleNotificationChromeHandoff();
    return true;
}

export function concealNotificationWarmPanel(): void {
    setNotificationForceVisible(false);
    cancelNotificationChromeHandoff();
    clearOverlayEnterSettle('data-hami-notif-enter');
    clearNotificationDismissLock();
    snapNotificationShellClose();
    if (typeof document === 'undefined') {
        removeNotificationInstantBridge();
        return;
    }
    const root = document.querySelector(NOTIFICATION_LAYER_SELECTOR);
    if (root instanceof HTMLElement) applyNotificationLayerVisible(root, false);
    removeNotificationInstantBridge();
}
