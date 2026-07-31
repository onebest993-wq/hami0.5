import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

const kvGetMock = vi.fn();
const kvSetMock = vi.fn();

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
    isShellNotificationSupabaseEnabled: () => false,
    listShellNotificationsSupabase: vi.fn(async () => []),
    upsertShellNotificationsSupabase: vi.fn(async () => []),
    upsertShellNotificationSupabase: vi.fn(async () => null),
    findShellNotificationByDedupeSupabase: vi.fn(async () => null),
    markShellNotificationReadSupabase: vi.fn(async () => []),
    markAllShellNotificationsReadSupabase: vi.fn(async () => []),
}));

vi.mock('@/app/services/notifications/notificationStoragePolicy', () => ({
    isShellNotificationSupabaseEnabled: () => false,
    isShellNotificationKvCacheEnabled: () => true,
    shouldPurgeKvBlobAfterBackfill: () => false,
}));

import { appendIncomingNotificationServer, markNotificationReadServer } from '@/app/services/notifications/notificationServerBlob';

describe('notificationServerBlob', () => {
    beforeEach(() => {
        kvGetMock.mockReset();
        kvSetMock.mockReset();
        kvGetMock.mockResolvedValue([]);
        kvSetMock.mockResolvedValue(undefined);
    });

    it('يُلحق إشعاراً جديداً بطابع زمني خادمي', async () => {
        const result = await appendIncomingNotificationServer('user-1', {
            title: 'تحديث',
            message: 'إصدار جديد',
            type: 'system_alert',
            category: 'system',
            dedupeKey: 'sys:1',
        });
        expect(result.title).toBe('تحديث');
        expect(result.direction).toBe('incoming');
        expect(result.isRead).toBe(false);
        expect(typeof result.createdAt).toBe('string');
        expect(kvSetMock).toHaveBeenCalledTimes(1);
        const saved = kvSetMock.mock.calls[0]?.[1] as NotificationModel[];
        expect(saved.some((n) => n.id === result.id)).toBe(true);
    });

    it('يُحدّث dedupeKey الموجود بدلاً من التكرار', async () => {
        const existing: NotificationModel = {
            id: 'sys_old',
            title: 'قديم',
            message: 'قديم',
            type: 'system_alert',
            category: 'system',
            direction: 'incoming',
            isRead: false,
            createdAt: '2020-01-01T00:00:00.000Z',
            actionPayload: { dedupeKey: 'sys:dup' },
        };
        kvGetMock.mockResolvedValue([existing]);

        const result = await appendIncomingNotificationServer('user-1', {
            title: 'جديد',
            message: 'جديد',
            type: 'system_alert',
            category: 'system',
            dedupeKey: 'sys:dup',
        });

        expect(result.id).toBe('sys_old');
        const saved = kvSetMock.mock.calls[0]?.[1] as NotificationModel[];
        expect(saved).toHaveLength(1);
        expect(saved[0]!.title).toBe('جديد');
    });

    it('markNotificationReadServer يضبط isRead مع readSyncedBy', async () => {
        kvGetMock.mockResolvedValue([
            {
                id: 'n1',
                title: 't',
                message: 'm',
                type: 'system_alert',
                isRead: false,
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ]);

        const result = await markNotificationReadServer('user-1', 'n1');
        expect(result[0]!.isRead).toBe(true);
        expect((result[0]!.actionPayload as Record<string, unknown>).readSyncedBy).toBe('server');
        expect(kvSetMock).toHaveBeenCalledTimes(1);
    });
});
