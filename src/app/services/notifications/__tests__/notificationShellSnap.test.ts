import { describe, expect, it, beforeEach } from 'vitest';

import {
    isNotificationShellSnappedOpen,
    resetNotificationShellSnapForTests,
    snapNotificationShellClose,
    snapNotificationShellOpen,
} from '@/app/services/notifications/notificationShellSnap';

describe('notificationShellSnap', () => {
    beforeEach(() => {
        resetNotificationShellSnapForTests();
    });

    it('snapNotificationShellOpen يضع علم html فوراً', () => {
        expect(snapNotificationShellOpen()).toBe(false);
        expect(isNotificationShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-notifications-open')).toBe('1');
    });

    it('snapNotificationShellClose يزيل العلم', () => {
        snapNotificationShellOpen();
        snapNotificationShellClose();
        expect(isNotificationShellSnappedOpen()).toBe(false);
    });
});
