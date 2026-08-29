import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

const queryInboxMock = vi.fn();
const upsertManyMock = vi.fn();
const readKvMock = vi.fn();
const kvDelMock = vi.fn();
const purgeMock = vi.fn();

const kvItem: NotificationModel = {
    id: 'sys_kv',
    title: 'من KV',
    message: 'إشعار محفوظ محلياً على الخادم',
    type: 'system_alert',
    category: 'system',
    direction: 'incoming',
    isRead: false,
    createdAt: '2026-08-28T00:00:00.000Z',
};

vi.mock('@/app/services/notifications/notificationSupabaseInbox', () => ({
    isShellNotificationSupabaseEnabled: () => true,
    queryShellNotificationInbox: (...args: unknown[]) => queryInboxMock(...args),
    upsertShellNotificationsSupabase: (...args: unknown[]) => upsertManyMock(...args),
}));

vi.mock('@/app/services/notifications/notificationStoragePolicy', () => ({
    shouldPurgeKvBlobAfterBackfill: () => true,
}));

vi.mock('@/app/services/notifications/inbox/notificationServerKvIo', () => ({
    kvDel: (...args: unknown[]) => kvDelMock(...args),
    purgeKvBlobIfSupabaseOwns: (...args: unknown[]) => purgeMock(...args),
    readKvBlob: (...args: unknown[]) => readKvMock(...args),
    syncKvCacheOptional: vi.fn(),
    writeKvBlob: vi.fn(),
}));

import { readBlob } from '@/app/services/notifications/inbox/notificationServerDualStore';

describe('readBlob — لا يُسقط صندوق KV عند فشل Supabase', () => {
    beforeEach(() => {
        queryInboxMock.mockReset();
        upsertManyMock.mockReset();
        readKvMock.mockReset();
        kvDelMock.mockReset();
        purgeMock.mockReset();
        readKvMock.mockResolvedValue([kvItem]);
        upsertManyMock.mockResolvedValue([]);
        kvDelMock.mockResolvedValue(undefined);
        purgeMock.mockResolvedValue(undefined);
    });

    it('يعيد KV عندما يستحيل قراءة صندوق Supabase', async () => {
        queryInboxMock.mockResolvedValue({ ok: false, rows: [] });
        const rows = await readBlob('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
        expect(rows).toEqual([kvItem]);
        expect(kvDelMock).not.toHaveBeenCalled();
    });

    it('لا يحذف KV إن فشل backfill لصندوق فارغ', async () => {
        queryInboxMock.mockResolvedValue({ ok: true, rows: [] });
        const rows = await readBlob('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
        expect(rows).toEqual([kvItem]);
        expect(upsertManyMock).toHaveBeenCalledTimes(1);
        expect(kvDelMock).not.toHaveBeenCalled();
    });

    it('يعيد صفوف Supabase عند نجاح القراءة', async () => {
        const remote = { ...kvItem, id: 'sys_sb', title: 'من السحابة' };
        queryInboxMock.mockResolvedValue({ ok: true, rows: [remote] });
        const rows = await readBlob('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
        expect(rows).toEqual([remote]);
        expect(purgeMock).toHaveBeenCalled();
        expect(upsertManyMock).not.toHaveBeenCalled();
    });
});
