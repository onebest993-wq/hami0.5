/**
 * NotificationRepository — تخزين محلي مشفَّر (hami:notifications:v1:<userId>).
 *
 * يتحقّق من:
 *  1) دورة حفظ/قراءة حقيقية عبر SecureStoreService (تشفير فعلي لا محاكاة).
 *  2) تخطّي كتابة مشفَّرة جديدة على fetchNotifications حين لا يتغيّر شيء —
 *     الإشعارات تُزامَن كل ٣٠-٦٠ث، وأغلب النبضات لا تحمل جديداً.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';

vi.mock('@/app/services/notifications/notificationServerSync', () => ({
    isNotificationServerSyncEnabled: () => true,
}));

const fetchNotificationsClientMock = vi.fn<() => Promise<NotificationModel[] | null>>();
const mergeNotificationsClientMock = vi.fn<() => Promise<NotificationModel[] | null>>(() =>
    Promise.resolve(null),
);
vi.mock('@/app/services/notifications/notificationClientPersist', () => ({
    fetchNotificationsClient: () => fetchNotificationsClientMock(),
    mergeNotificationsClient: () => mergeNotificationsClientMock(),
    syncMarkReadClient: () => Promise.resolve(null),
    syncMarkAllReadClient: () => Promise.resolve(null),
}));

function makeNotif(id: string, overrides: Partial<NotificationModel> = {}): NotificationModel {
    return {
        id,
        title: `عنوان-${id}`,
        message: `رسالة-${id}`,
        type: 'forum_reply',
        category: 'forum',
        direction: 'incoming',
        isRead: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        ...overrides,
    };
}

describe('NotificationRepository — تخزين محلي مشفَّر', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mergeNotificationsClientMock.mockResolvedValue(null);
        for (const key of SecureStoreService.listKeysSync()) {
            await SecureStoreService.deleteItem(key);
        }
    });

    it('يحفظ عبر SecureStoreService ويُعيد نفس البيانات من الكاش المحلي المشفَّر عند تعذّر الشبكة', async () => {
        const { NotificationRepository } = await import('@/app/infrastructure/NotificationRepository');
        const userId = 'repo-roundtrip-user';

        fetchNotificationsClientMock.mockResolvedValueOnce([makeNotif('n1')]);
        const first = await NotificationRepository.fetchNotifications(userId);
        expect(first.map((n) => n.id)).toEqual(['n1']);

        // الشبكة تعذّرت هذه المرّة — القراءة يجب أن تعود من الكاش المحلي المشفَّر لا فراغاً
        fetchNotificationsClientMock.mockResolvedValueOnce(null);
        const second = await NotificationRepository.fetchNotifications(userId);
        expect(second.map((n) => n.id)).toEqual(['n1']);
    });

    it('يتخطّى كتابة مشفَّرة جديدة على fetchNotifications حين تتطابق النتيجة تماماً مع المحلي', async () => {
        const { NotificationRepository } = await import('@/app/infrastructure/NotificationRepository');
        const setItemSpy = vi.spyOn(SecureStoreService, 'setItem');
        const userId = 'repo-stable-user';

        fetchNotificationsClientMock.mockResolvedValue([makeNotif('n1'), makeNotif('n2')]);

        await NotificationRepository.fetchNotifications(userId);
        const callsAfterFirst = setItemSpy.mock.calls.length;
        expect(callsAfterFirst).toBeGreaterThan(0);

        // نبضة polling ثانية بنفس المحتوى تماماً — لا تغيير فعلي
        await NotificationRepository.fetchNotifications(userId);
        expect(setItemSpy.mock.calls.length).toBe(callsAfterFirst);
    });

    it('peekLocalNotifications يقرأ فوراً بعد الحفظ (المفتاح مشفَّر وذاكرة الفكّ سُخِّنت بالكتابة)', async () => {
        const { NotificationRepository } = await import('@/app/infrastructure/NotificationRepository');
        const { peekLocalNotifications } = await import('@/app/infrastructure/notificationPeekLite');
        const userId = 'repo-peek-user';

        fetchNotificationsClientMock.mockResolvedValueOnce([makeNotif('n1')]);
        await NotificationRepository.fetchNotifications(userId);

        expect(peekLocalNotifications(userId).map((n) => n.id)).toEqual(['n1']);
    });

    it('peekLocalNotifications يقرأ leftover دون ترحيل على أول طلاء', async () => {
        const { peekLocalNotifications } = await import('@/app/infrastructure/notificationPeekLite');
        const userId = 'peek-drain-user';
        const key = `hami:notifications:v1:${userId}`;
        localStorage.setItem(key, JSON.stringify([makeNotif('legacy-n')]));
        expect(peekLocalNotifications(userId).map((n) => n.id)).toEqual(['legacy-n']);
        expect(localStorage.getItem(key)).not.toBeNull();
        expect(SecureStoreService.getItemSync(key)).toBeNull();
    });

    it('fetchNotifications يرحّل leftover بعد الإقلاع', async () => {
        const { NotificationRepository } = await import('@/app/infrastructure/NotificationRepository');
        const userId = 'repo-leftover-user';
        const key = `hami:notifications:v1:${userId}`;
        localStorage.setItem(key, JSON.stringify([makeNotif('legacy-n')]));
        fetchNotificationsClientMock.mockResolvedValueOnce(null);
        const list = await NotificationRepository.fetchNotifications(userId);
        expect(list.map((n) => n.id)).toEqual(['legacy-n']);
        expect(localStorage.getItem(key)).toBeNull();
        expect(SecureStoreService.getItemSync(key)).toContain('legacy-n');
    });
});
