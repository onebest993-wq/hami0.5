import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

const kvGetMock = vi.fn();
const kvSetMock = vi.fn();
const upsertOneMock = vi.fn();
const queryInboxMock = vi.fn();

vi.mock('@/app/api/security/loadKvStoreAdmin', () => ({
    loadKvStoreAdmin: vi.fn(async () => ({
        kvGet: (...args: unknown[]) => kvGetMock(...args),
        kvSet: (...args: unknown[]) => kvSetMock(...args),
        kvDel: vi.fn(async () => undefined),
        kvGetByPrefix: vi.fn(async () => []),
        kvDelByPrefix: vi.fn(async () => 0),
        kvKeysByPrefix: vi.fn(async () => []),
    })),
}));

vi.mock('@/app/services/notifications/notificationSupabaseInbox', () => ({
    isShellNotificationSupabaseEnabled: () => true,
    queryShellNotificationInbox: (...args: unknown[]) => queryInboxMock(...args),
    listShellNotificationsSupabase: vi.fn(async () => []),
    upsertShellNotificationsSupabase: vi.fn(async () => []),
    upsertShellNotificationSupabase: (...args: unknown[]) => upsertOneMock(...args),
    findShellNotificationByDedupeSupabase: vi.fn(async () => null),
    markShellNotificationReadSupabase: vi.fn(async () => []),
    markAllShellNotificationsReadSupabase: vi.fn(async () => []),
}));

vi.mock('@/app/services/notifications/notificationStoragePolicy', () => ({
    isShellNotificationSupabaseEnabled: () => true,
    isShellNotificationKvCacheEnabled: () => false,
    shouldPurgeKvBlobAfterBackfill: () => false,
}));

import { appendIncomingNotificationServer } from '@/app/services/notifications/notificationServerBlob';

describe('appendIncomingNotificationServer — fallback KV', () => {
    beforeEach(() => {
        kvGetMock.mockReset();
        kvSetMock.mockReset();
        upsertOneMock.mockReset();
        queryInboxMock.mockReset();
        kvGetMock.mockResolvedValue([]);
        kvSetMock.mockResolvedValue(undefined);
        queryInboxMock.mockResolvedValue({ ok: false, rows: [] });
        upsertOneMock.mockResolvedValue(null);
    });

    it('يحفظ في KV إن فشل upsert صندوق Supabase', async () => {
        const result = await appendIncomingNotificationServer('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', {
            title: 'تنبيه المقر',
            message: 'صيانة الليلة',
            type: 'system_alert',
            category: 'system',
            dedupeKey: 'hq:sys:batch:user',
        });

        expect(result.title).toBe('تنبيه المقر');
        expect(result.isRead).toBe(false);
        expect(upsertOneMock).toHaveBeenCalledTimes(1);
        expect(kvSetMock).toHaveBeenCalledTimes(1);
        const saved = kvSetMock.mock.calls[0]?.[1] as NotificationModel[];
        expect(saved.some((n) => n.title === 'تنبيه المقر' && n.category === 'system')).toBe(true);
    });

    it('لا يكتب KV إن نجح upsert', async () => {
        upsertOneMock.mockResolvedValue({
            id: 'sys_ok',
            title: 'تنبيه المقر',
            message: 'صيانة',
            type: 'system_alert',
            category: 'system',
            isRead: false,
            createdAt: '2026-08-28T00:00:00.000Z',
        });

        await appendIncomingNotificationServer('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', {
            title: 'تنبيه المقر',
            message: 'صيانة',
            type: 'system_alert',
            category: 'system',
        });

        expect(kvSetMock).not.toHaveBeenCalled();
    });
});
