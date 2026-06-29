import { describe, expect, it } from 'vitest';
import { mapRowToNotificationModel } from '@/app/services/notifications/notificationSupabaseInbox';

describe('notificationSupabaseInbox', () => {
    it('mapRowToNotificationModel يحوّل صف DB إلى NotificationModel', () => {
        const model = mapRowToNotificationModel({
            user_id: 'u1',
            id: 'n1',
            title: 'عنوان',
            message: 'رسالة',
            notification_type: 'system_alert',
            category: 'system',
            direction: 'incoming',
            is_read: false,
            dedupe_key: 'dk1',
            action_payload: { dedupeKey: 'dk1', appendedBy: 'server' },
            created_at: '2026-06-01T00:00:00.000Z',
            updated_at: '2026-06-01T00:00:00.000Z',
        });

        expect(model.id).toBe('n1');
        expect(model.type).toBe('system_alert');
        expect(model.category).toBe('system');
        expect(model.isRead).toBe(false);
        expect(model.actionPayload?.dedupeKey).toBe('dk1');
    });
});
