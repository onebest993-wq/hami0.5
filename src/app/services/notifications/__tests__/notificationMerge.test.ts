import { describe, expect, it } from 'vitest';
import {
    mergeNotificationLists,
    mergeNotificationRecord,
    isServerAppendedNotification,
    notificationListsReferenceEqual,
    notificationListsContentEqual,
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

    it('mergeNotificationRecord يُعيد نفس مرجع a حين لا يُغيّر الدمج شيئاً فعلياً', () => {
        const a = make('a', false, '2026-01-01T00:00:00.000Z');
        const bSameContent = make('a', false, '2026-01-01T00:00:00.000Z');
        expect(mergeNotificationRecord(a, bSameContent)).toBe(a);

        const bChanged = make('a', true, '2026-01-01T00:00:00.000Z');
        expect(mergeNotificationRecord(a, bChanged)).not.toBe(a);
    });

    it('notificationListsReferenceEqual: يقارن بالمرجع — يفشل مع محتوى مطابق من كائنات مختلفة', () => {
        const list = [make('a', false, '2026-01-01T00:00:00.000Z')];
        const sameRefList = [...list];
        const rebuiltList = [make('a', false, '2026-01-01T00:00:00.000Z')];

        expect(notificationListsReferenceEqual(list, sameRefList)).toBe(true);
        expect(notificationListsReferenceEqual(list, rebuiltList)).toBe(false);
        expect(notificationListsReferenceEqual(list, [])).toBe(false);
    });

    it('notificationListsContentEqual: يقارن بالمحتوى — ينجح مع كائنات مختلفة نفس القيم (محاكاة JSON.parse جديد)', () => {
        const original = [make('a', false, '2026-01-01T00:00:00.000Z'), make('b', true, '2026-02-01T00:00:00.000Z')];
        const reparsed: NotificationModel[] = JSON.parse(JSON.stringify(original));

        expect(reparsed[0]).not.toBe(original[0]);
        expect(notificationListsContentEqual(original, reparsed)).toBe(true);

        const changed = JSON.parse(JSON.stringify(original)) as NotificationModel[];
        changed[0]!.isRead = true;
        expect(notificationListsContentEqual(original, changed)).toBe(false);
        expect(notificationListsContentEqual(original, [original[0]!])).toBe(false);
    });
});
