import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearNotificationForceVisible,
    concealNotificationWarmPanel,
    isNotificationForceVisible,
    revealNotificationWarmPanel,
} from '@/app/runtime/notificationInstantPaint';

describe('notificationInstantPaint', () => {
    beforeEach(() => {
        clearNotificationForceVisible();
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearNotificationForceVisible();
        vi.useRealTimers();
    });

    it('reveals warm notification panel with pointer-events auto', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-notification-root', '');
        layer.style.visibility = 'hidden';
        document.body.appendChild(layer);

        expect(revealNotificationWarmPanel()).toBe(true);
        expect(isNotificationForceVisible()).toBe(true);
        expect(layer.style.visibility).toBe('visible');
        expect(layer.style.pointerEvents).toBe('auto');
    });

    it('conceals the warm panel', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-notification-root', '');
        document.body.appendChild(layer);
        revealNotificationWarmPanel();
        concealNotificationWarmPanel();

        expect(isNotificationForceVisible()).toBe(false);
        expect(layer.style.visibility).toBe('hidden');
    });

    it('arms interact class after grace', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-notification-root', '');
        document.body.appendChild(layer);
        revealNotificationWarmPanel();
        expect(layer.classList.contains('hami-notif-layer--interact')).toBe(false);

        vi.advanceTimersByTime(320);
        expect(layer.classList.contains('hami-notif-layer--interact')).toBe(true);
    });
});
