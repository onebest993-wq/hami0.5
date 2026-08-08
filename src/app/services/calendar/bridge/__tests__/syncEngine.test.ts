import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';

const saveEventsBatch = vi.fn();
const getEvents = vi.fn();

vi.mock('@/app/services/cloud/lawyerCalendarCloud', () => ({
    CalendarDB: {
        getEvents: (...args: unknown[]) => getEvents(...args),
        saveEventsBatch: (...args: unknown[]) => saveEventsBatch(...args),
    },
}));

describe('calendar syncEngine', () => {
    beforeEach(async () => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        localStorage.clear();
        saveEventsBatch.mockReset();
        getEvents.mockReset();
        getEvents.mockResolvedValue([]);
        saveEventsBatch.mockResolvedValue(undefined);
        const g = globalThis as typeof globalThis & { __hamiCalendarSyncQueue?: unknown };
        delete g.__hamiCalendarSyncQueue;
        vi.resetModules();
    });

    it('flushPendingCalendarSyncs يرفض عند فشل saveEventsBatch', async () => {
        saveEventsBatch.mockRejectedValueOnce(new Error('disk full'));
        const { fireAndForgetCalendarSync, flushPendingCalendarSyncs } = await import(
            '@/app/services/calendar/bridge/syncEngine'
        );

        fireAndForgetCalendarSync({
            userId: 'lawyer-1',
            sourceModule: 'lawsuit',
            sourceEntityId: 'file-1',
            sourceEventId: 'appt-1',
            date: '2028-01-15',
            title: 'جلسة',
        });

        await expect(flushPendingCalendarSyncs()).rejects.toThrow('disk full');
    });

    it('flushPendingCalendarSyncs يكتمل عند نجاح الحفظ', async () => {
        const { fireAndForgetCalendarSync, flushPendingCalendarSyncs } = await import(
            '@/app/services/calendar/bridge/syncEngine'
        );

        fireAndForgetCalendarSync({
            userId: 'lawyer-1',
            sourceModule: 'lawsuit',
            sourceEntityId: 'file-2',
            sourceEventId: 'appt-2',
            date: '2028-02-01',
            title: 'جلسة ثانية',
        });

        await expect(flushPendingCalendarSyncs()).resolves.toBeUndefined();
        expect(saveEventsBatch).toHaveBeenCalledTimes(1);
    });
});
