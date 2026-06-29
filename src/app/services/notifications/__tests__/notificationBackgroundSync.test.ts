import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshNotificationShellBadge } from '@/app/services/notifications/notificationBackgroundSync';
import { NOTIFICATION_LIST_CAP, capNotificationList } from '@/app/services/notifications/notificationLimits';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

const fetchNotifications = vi.fn().mockResolvedValue(undefined);
const listForumNotifications = vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 });
const purgeLegacyNotificationsIfNeeded = vi.fn().mockResolvedValue(false);
const retryLegacyPrefixCleanupIfPartial = vi.fn().mockResolvedValue(false);
const emitForumUnreadCount = vi.fn();
const syncForumNotificationsToAppStore = vi.fn().mockReturnValue(0);

vi.mock('@/app/services/forum/forumNotificationBridge', () => ({
    emitForumUnreadCount: (...args: unknown[]) => emitForumUnreadCount(...args),
    syncForumNotificationsToAppStore: (...args: unknown[]) => syncForumNotificationsToAppStore(...args),
}));

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: {
        getState: () => ({ fetchNotifications }),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listForumNotifications: (...args: unknown[]) => listForumNotifications(...args),
    },
}));

vi.mock('@/app/services/notifications/notificationLegacyMigration', () => ({
    purgeLegacyNotificationsIfNeeded: (...args: unknown[]) => purgeLegacyNotificationsIfNeeded(...args),
}));

vi.mock('@/app/services/notifications/notificationForumKvMigration', () => ({
    retryLegacyPrefixCleanupIfPartial: (...args: unknown[]) => retryLegacyPrefixCleanupIfPartial(...args),
}));

function makeNotif(id: string): NotificationModel {
    return {
        id,
        title: 't',
        message: 'm',
        type: 'system_alert',
        isRead: false,
        createdAt: new Date().toISOString(),
    };
}

describe('notificationLimits', () => {
    it('capNotificationList يحافظ على أحدث العناصر في المقدمة', () => {
        const list = Array.from({ length: NOTIFICATION_LIST_CAP + 5 }, (_, i) => makeNotif(`n-${i}`));
        const capped = capNotificationList(list);
        expect(capped).toHaveLength(NOTIFICATION_LIST_CAP);
        expect(capped[0]!.id).toBe('n-0');
        expect(capped[NOTIFICATION_LIST_CAP - 1]!.id).toBe(`n-${NOTIFICATION_LIST_CAP - 1}`);
    });
});

describe('refreshNotificationShellBadge', () => {
    beforeEach(() => {
        fetchNotifications.mockClear();
        listForumNotifications.mockClear();
        purgeLegacyNotificationsIfNeeded.mockClear();
        retryLegacyPrefixCleanupIfPartial.mockClear();
        emitForumUnreadCount.mockClear();
        syncForumNotificationsToAppStore.mockClear();
    });

    it('ينظّف legacy قبل المزامنة افتراضياً', async () => {
        await refreshNotificationShellBadge('user-1');
        expect(purgeLegacyNotificationsIfNeeded).toHaveBeenCalledWith('user-1');
        expect(retryLegacyPrefixCleanupIfPartial).toHaveBeenCalledWith('user-1');
    });

    it('يجلب blob الإشعارات ويزامن المنتدى افتراضياً', async () => {
        listForumNotifications.mockResolvedValueOnce({
            notifications: [{ id: 'f1', read: false }],
            unreadCount: 3,
        });
        await refreshNotificationShellBadge('user-1');
        expect(fetchNotifications).toHaveBeenCalledWith('user-1');
        expect(listForumNotifications).toHaveBeenCalledWith('user-1');
        expect(syncForumNotificationsToAppStore).toHaveBeenCalled();
        expect(emitForumUnreadCount).toHaveBeenCalledWith(3);
    });

    it('يتخطّى جلب blob عند includeStoreFetch=false', async () => {
        await refreshNotificationShellBadge('user-1', { includeStoreFetch: false });
        expect(fetchNotifications).not.toHaveBeenCalled();
        expect(listForumNotifications).toHaveBeenCalledWith('user-1');
    });

    it('يتخطّى مزامنة المنتدى عند includeForumSync=false', async () => {
        await refreshNotificationShellBadge('user-1', { includeForumSync: false });
        expect(fetchNotifications).toHaveBeenCalledWith('user-1');
        expect(listForumNotifications).not.toHaveBeenCalled();
    });
});
