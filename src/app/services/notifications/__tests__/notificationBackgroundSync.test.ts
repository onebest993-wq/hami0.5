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

vi.mock('@/app/services/forum/forumNotificationEvents', () => ({
    emitForumUnreadCount: (...args: unknown[]) => emitForumUnreadCount(...args),
}));

vi.mock('@/app/services/forum/forumNotificationBridge', () => ({
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

vi.mock('@/app/services/auth/accountNetworkGate', () => ({
    invalidateAccountNetworkGateCache: vi.fn(),
    fetchAccountNetworkGate: vi.fn(async () => ({
        frozen: false,
        forumBanned: false,
        freezeUntil: null,
        code: null,
        message: null,
    })),
}));

vi.mock('@/app/services/auth/lawyerVerificationRemote', () => ({
    syncLawyerVerificationFromServer: vi.fn(async () => undefined),
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

    it('capNotificationList يبقي تنبيهات المقر appendedBy=server حتى في الذيل', () => {
        const list = Array.from({ length: NOTIFICATION_LIST_CAP }, (_, i) => makeNotif(`n-${i}`));
        const hq = Array.from({ length: 5 }, (_, i) => {
            const n = makeNotif(`hq-${i}`);
            n.actionPayload = { appendedBy: 'server', dedupeKey: `sys:hq-${i}` };
            return n;
        });
        const capped = capNotificationList([...list, ...hq]);
        expect(capped).toHaveLength(NOTIFICATION_LIST_CAP);
        expect(capped.filter((n) => n.id.startsWith('hq-'))).toHaveLength(5);
        expect(capped[0]!.id).toBe('n-0');
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

    it('يزامن توثيق الحساب وبوابة الشبكة مع شارة الجرس', async () => {
        const { syncLawyerVerificationFromServer } = await import(
            '@/app/services/auth/lawyerVerificationRemote'
        );
        const { fetchAccountNetworkGate } = await import('@/app/services/auth/accountNetworkGate');
        await refreshNotificationShellBadge('user-1', { includeForumSync: false });
        expect(syncLawyerVerificationFromServer).toHaveBeenCalledWith('user-1');
        expect(fetchAccountNetworkGate).toHaveBeenCalledWith('user-1');
    });
});
