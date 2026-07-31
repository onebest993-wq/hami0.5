import { describe, expect, it } from 'vitest';
import {
    deriveNotificationCategory,
    deriveNotificationDirection,
    isActivityLogNotification,
} from '@/app/infrastructure/notificationModel';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';

const base: NotificationModel = {
    id: 'n1',
    title: 't',
    message: 'm',
    type: 'system_alert',
    isRead: false,
    createdAt: new Date().toISOString(),
};

describe('notificationModel', () => {
    it('deriveNotificationCategory يعيد forum لأنواع المنتدى', () => {
        expect(deriveNotificationCategory({ ...base, type: 'forum_reply' })).toBe('forum');
        expect(deriveNotificationCategory({ ...base, type: 'forum_mention' })).toBe('forum');
    });

    it('deriveNotificationDirection يميّز الصادر من audit_log', () => {
        expect(deriveNotificationDirection({ ...base, type: 'audit_log_civil' })).toBe('outgoing');
        expect(deriveNotificationDirection({ ...base, type: 'forum_reply' })).toBe('incoming');
    });

    it('isActivityLogNotification يصفّي سجل النشاطات', () => {
        expect(isActivityLogNotification({ type: 'audit_log_task' })).toBe(true);
        expect(isActivityLogNotification({ type: 'forum_reply' })).toBe(false);
        expect(isActivityLogNotification({ type: 'system_alert' })).toBe(false);
    });

    it('NotificationRepository يعيد تصدير نفس الاشتقاقات', async () => {
        const repo = await import('@/app/infrastructure/NotificationRepository');
        expect(repo.deriveNotificationCategory({ ...base, type: 'forum_solved' })).toBe('forum');
    });
});
