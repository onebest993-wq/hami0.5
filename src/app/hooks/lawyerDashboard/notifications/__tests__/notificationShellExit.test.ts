import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginNotificationShellExit,
    clearNotificationShellClosing,
    NOTIFICATION_SHEET_EXIT_MS,
    NOTIFICATION_SHEET_EXIT_PAD_MS,
} from '@/app/hooks/lawyerDashboard/notifications/notificationShellExit';

describe('notificationShellExit', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-notifications-open');
        document.documentElement.removeAttribute('data-hami-notifications-closing');
        delete document.documentElement.dataset.hamiReduceMotion;
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearNotificationShellClosing();
        vi.useRealTimers();
    });

    it('مع تقليل الحركة يُغلق فوراً بلا سمة closing', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const onDone = vi.fn();
        beginNotificationShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-notifications-closing')).toBe(false);
    });

    it('بدون ورقة يغلق فوراً', () => {
        const onDone = vi.fn();
        beginNotificationShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('يهبط الورقة ثم ينهي بعد المهلة', () => {
        document.documentElement.setAttribute('data-hami-notifications-open', '1');
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'notification-panel');
        document.body.appendChild(sheet);

        const onDone = vi.fn();
        beginNotificationShellExit(onDone);

        expect(onDone).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute('data-hami-notifications-closing')).toBe('1');
        expect(document.documentElement.hasAttribute('data-hami-notifications-open')).toBe(false);

        vi.advanceTimersByTime(NOTIFICATION_SHEET_EXIT_MS + NOTIFICATION_SHEET_EXIT_PAD_MS);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-notifications-closing')).toBe(false);
    });

    it('transitionend على transform يُنهي قبل المهلة', () => {
        document.documentElement.setAttribute('data-hami-notifications-open', '1');
        const track = document.createElement('div');
        track.className = 'hami-notif-sheet-track';
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'notification-panel');
        track.appendChild(sheet);
        document.body.appendChild(track);

        const onDone = vi.fn();
        beginNotificationShellExit(onDone);
        track.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform', bubbles: true }));

        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('ورقة keep-alive بلا snap لا تضع closing', () => {
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'notification-panel');
        document.body.appendChild(sheet);
        const onDone = vi.fn();
        beginNotificationShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-notifications-closing')).toBe(false);
    });
});
