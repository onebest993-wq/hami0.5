import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginNotificationDismissLock,
    clearNotificationDismissLock,
    clearNotificationForceVisible,
    concealNotificationWarmPanel,
    isNotificationDismissLocked,
    isNotificationForceVisible,
    NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS,
    paintNotificationInstantChrome,
} from '@/app/runtime/notificationInstantPaint';

describe('notificationInstantPaint', () => {
    beforeEach(() => {
        clearNotificationForceVisible();
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearNotificationForceVisible();
        clearNotificationDismissLock();
        document.documentElement.removeAttribute('data-hami-notifications-open');
        document.documentElement.removeAttribute('data-hami-notif-dismiss-locked');
        vi.useRealTimers();
    });

    it('reveals warm notification panel with pointer-events auto', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-notification-root', '');
        layer.style.visibility = 'hidden';
        document.body.appendChild(layer);

        expect(paintNotificationInstantChrome()).toBe(true);
        expect(isNotificationForceVisible()).toBe(true);
        expect(layer.style.visibility).toBe('visible');
        expect(layer.style.pointerEvents).toBe('auto');
        expect(document.documentElement.getAttribute('data-hami-notifications-open')).toBe('1');
    });

    it('paints instant chrome bridge when no host exists', () => {
        expect(paintNotificationInstantChrome()).toBe(true);
        const bridge = document.getElementById('hami-notifications-instant-bridge');
        expect(bridge).toBeTruthy();
        expect(bridge?.textContent).toContain('الإشعارات');
        expect(isNotificationForceVisible()).toBe(true);
    });

    it('conceals the warm panel', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-notification-root', '');
        document.body.appendChild(layer);
        paintNotificationInstantChrome();
        concealNotificationWarmPanel();

        expect(isNotificationForceVisible()).toBe(false);
        expect(layer.style.visibility).toBe('hidden');
        expect(document.documentElement.hasAttribute('data-hami-notifications-open')).toBe(false);
        expect(document.getElementById('hami-notifications-instant-bridge')).toBeNull();
    });

    it('does not dump overlay opacity on the cold bridge', () => {
        paintNotificationInstantChrome();
        const overlay = document.querySelector(
            '#hami-notifications-instant-bridge .hami-notif-overlay-btn',
        );
        expect(overlay).toBeTruthy();
        expect((overlay as HTMLElement).style.opacity).toBe('');
        expect(
            document.querySelector('#hami-notifications-instant-bridge .hami-notif-sheet-track'),
        ).toBeTruthy();
    });

    it('locks dismiss until the opening click finishes', () => {
        beginNotificationDismissLock();
        expect(isNotificationDismissLocked()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-notif-dismiss-locked')).toBe('1');

        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        window.dispatchEvent(new Event('click', { bubbles: true }));
        expect(isNotificationDismissLocked()).toBe(false);
    });

    it('unlocks dismiss after hung-pointer fallback', () => {
        beginNotificationDismissLock();
        expect(isNotificationDismissLocked()).toBe(true);
        vi.advanceTimersByTime(NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS);
        expect(isNotificationDismissLocked()).toBe(false);
    });
});
