import { describe, expect, it, vi } from 'vitest';
import {
    NOTIFICATIONS_SHELL_FEATURE,
    computeNotificationsShellUnreadCount,
    openNotificationsFromShell,
} from '@/app/services/notifications/notificationShellNavigation';

describe('notificationShellNavigation', () => {
    it('opens notifications when signed in', () => {
        const onOpen = vi.fn();
        expect(openNotificationsFromShell({ signedIn: true, onOpen })).toBe(true);
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('blocks notifications when signed out', () => {
        const onOpen = vi.fn();
        const onSignedOut = vi.fn();
        expect(
            openNotificationsFromShell({ signedIn: false, onOpen, onSignedOut }),
        ).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('uses Arabic feature label', () => {
        expect(NOTIFICATIONS_SHELL_FEATURE).toBe('الإشعارات');
    });

    it('sums store unread and case-share pending counts', () => {
        expect(computeNotificationsShellUnreadCount(3, 2)).toBe(5);
        expect(computeNotificationsShellUnreadCount(-1, 1)).toBe(1);
    });
});
