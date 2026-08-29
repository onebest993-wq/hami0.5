import { describe, expect, it } from 'vitest';
import { resolveNotificationEscapeAction } from '@/app/components/lawyer/NotificationPanel/notificationEscapeStack';

describe('notificationEscapeStack', () => {
    it('يلغي الحوار قبل مسار التحكم وقبل إغلاق اللوحة', () => {
        expect(
            resolveNotificationEscapeAction({ smartDialogOpen: true, alertControlsOpen: true }),
        ).toBe('dismiss-dialog');
        expect(
            resolveNotificationEscapeAction({ smartDialogOpen: false, alertControlsOpen: true }),
        ).toBe('back-to-inbox');
        expect(
            resolveNotificationEscapeAction({ smartDialogOpen: false, alertControlsOpen: false }),
        ).toBe('close-panel');
    });
});
