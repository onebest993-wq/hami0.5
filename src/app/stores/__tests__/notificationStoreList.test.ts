import { describe, expect, it } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import {
    applyUpsertsToList,
    normalizeNotification,
    stripInvalidNotifications,
    unreadCountOf,
} from '@/app/stores/notificationStoreList';

function makeNotif(overrides: Partial<NotificationModel> = {}): NotificationModel {
    return {
        id: 'n-1',
        title: 'رد جديد على سؤالك',
        message: 'استشارة',
        type: 'forum_reply',
        isRead: false,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('notificationStoreList', () => {
    it('normalizeNotification يرفض الصادر وسجل النشاط', () => {
        expect(normalizeNotification(makeNotif({ direction: 'outgoing' }))).toBeNull();
        expect(normalizeNotification(makeNotif({ type: 'audit_log_civil' }))).toBeNull();
        expect(normalizeNotification(makeNotif())).not.toBeNull();
    });

    it('unreadCountOf يعد غير المقروء فقط', () => {
        expect(
            unreadCountOf([
                makeNotif({ id: 'a', isRead: false }),
                makeNotif({ id: 'b', isRead: true }),
                makeNotif({ id: 'c', isRead: false }),
            ]),
        ).toBe(2);
    });

    it('applyUpsertsToList يُبقي نفس المرجع عند قائمة وارد فارغة', () => {
        const current = [makeNotif()];
        expect(applyUpsertsToList(current, [])).toBe(current);
    });

    it('applyUpsertsToList يدمج التحديث ويتجاهل الصادر', () => {
        const current = [makeNotif({ id: 'keep', message: 'قديم' })];
        const next = applyUpsertsToList(current, [
            makeNotif({ id: 'keep', message: 'محدّث', isRead: true }),
            makeNotif({ id: 'out', direction: 'outgoing' }),
            makeNotif({ id: 'fresh', title: 'رد جديد على سؤالك' }),
        ]);
        expect(next.map((n) => n.id)).toEqual(['fresh', 'keep']);
        expect(next[1]!.message).toBe('محدّث');
        expect(next[1]!.isRead).toBe(true);
    });

    it('stripInvalidNotifications يصفي الصادر والفراغ', () => {
        const list = stripInvalidNotifications([
            makeNotif({ id: 'in' }),
            makeNotif({ id: 'out', direction: 'outgoing' }),
            makeNotif({ id: 'log', type: 'audit_log_task' }),
        ]);
        expect(list.map((n) => n.id)).toEqual(['in']);
    });

    it('normalizeNotification يُبقي dedupeKey ويزيل postId الخطر', () => {
        const next = normalizeNotification(
            makeNotif({
                actionPayload: { dedupeKey: 'sys:1', postId: 'javascript:alert(1)', appendedBy: 'server' },
            }),
        );
        expect(next?.actionPayload).toMatchObject({ dedupeKey: 'sys:1', appendedBy: 'server' });
        expect(next?.actionPayload?.postId).toBeUndefined();
    });
});
