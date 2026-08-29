import {
    NOTIFICATION_BRIDGE_ID,
    NOTIFICATION_INTERACT_CLASS,
    NOTIFICATION_LAYER_SELECTOR,
    NOTIFICATION_OPEN_ATTR,
} from './notificationInstantPaintConstants';

export function resolveNotificationLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const host = document.querySelector(NOTIFICATION_LAYER_SELECTOR);
    if (host instanceof HTMLElement) return host;
    const bridge = document.getElementById(NOTIFICATION_BRIDGE_ID);
    return bridge instanceof HTMLElement ? bridge : null;
}

export function armNotificationOverlayInteraction(root?: HTMLElement | null): void {
    const el = root ?? resolveNotificationLayer();
    if (!el) return;
    el.classList.add(NOTIFICATION_INTERACT_CLASS);
    el.style.setProperty('pointer-events', 'auto');
}

export function applyNotificationLayerVisible(root: HTMLElement, visible: boolean): void {
    if (visible) {
        root.style.setProperty('visibility', 'visible');
        root.style.setProperty('pointer-events', 'auto');
        root.style.removeProperty('opacity');
        root.classList.add('hami-notif-layer--visible');
        root.classList.remove(NOTIFICATION_INTERACT_CLASS);
        root.setAttribute('data-open', 'true');
        root.removeAttribute('aria-hidden');
        root.removeAttribute('inert');
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute(NOTIFICATION_OPEN_ATTR, '1');
        }
        return;
    }

    root.style.removeProperty('opacity');
    root.style.setProperty('visibility', 'hidden');
    root.style.setProperty('pointer-events', 'none');
    root.classList.remove('hami-notif-layer--visible');
    root.classList.remove(NOTIFICATION_INTERACT_CLASS);
    root.setAttribute('data-open', 'false');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
    if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute(NOTIFICATION_OPEN_ATTR);
    }
}
