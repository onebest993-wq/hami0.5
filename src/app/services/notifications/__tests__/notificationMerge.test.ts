import { describe, expect, it } from 'vitest';
import {
    mergeNotificationLists,
    mergeNotificationRecord,
    isServerAppendedNotification,
} from '@/app/services/notifications/notificationMerge';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

function make(id: string, isRead: boolean, createdAt: string): NotificationModel {
    return {
        id,
        title: `title-${id}`,
        message: `msg-${id}`,
        type: 'system_alert',
        isRead,
        createdAt,
    };
}

describe('notificationMerge', () => {
    it('isRead أحادي — true يفوز حتى من النسخة الأقدم', () => {
        const older = make('a', true, '2026-01-01T00:00:00.000Z');
        const newer = make('a', false, '2026-06-01T00:00:00.000Z');
        expect(mergeNotificationRecord(older, newer).isRead).toBe(true);
        expect(mergeNotificationRecord(newer, older).isRead).toBe(true);
    });

    it('المحتوى الأحدث يفوز عند اختلاف createdAt', () => {
        const older = make('a', false, '2026-01-01T00:00:00.000Z');
        older.message = 'قديم';
        const newer = make('a', false, '2026-06-01T00:00:00.000Z');
        newer.message = 'جديد';
        expect(mergeNotificationRecord(older, newer).message).toBe('جديد');
    });

    it('mergeNotificationLists يدمج قوائم متعددة دون فقد isRead', () => {
        const deviceA = [make('x', true, '2026-06-01T00:00:00.000Z')];
        const deviceB = [make('x', false, '2026-06-02T00:00:00.000Z'), make('y', false, '2026-06-02T00:00:00.000Z')];
        const merged = mergeNotificationLists(deviceA, deviceB);
        expect(merged.find((n) => n.id === 'x')?.isRead).toBe(true);
        expect(merged.find((n) => n.id === 'y')?.id).toBe('y');
    });

    it('نسخة الخادم (appendedBy=server) تفوز على محتوى العميل', () => {
        const client = make('a', false, '2026-06-10T00:00:00.000Z');
        client.message = 'عميل';
        const server = make('a', false, '2026-06-01T00:00:00.000Z');
        server.message = 'خادم';
        server.actionPayload = { appendedBy: 'server' };
        expect(isServerAppendedNotification(server)).toBe(true);
        expect(mergeNotificationRecord(client, server).message).toBe('خادم');
    });
});
