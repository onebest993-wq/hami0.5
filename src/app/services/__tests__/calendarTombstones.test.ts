import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn(async (key: string) => store.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: string) => {
            store.set(key, value);
        }),
        getItemSync: vi.fn((key: string) => store.get(key) ?? null),
        setItemSync: vi.fn((key: string, value: string) => {
            store.set(key, value);
        }),
    },
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: vi.fn(() => {
            throw new Error('calendar tombstones must not call the network');
        }),
    },
}));

describe('calendarTombstones — محلي فقط', () => {
    beforeEach(async () => {
        store.clear();
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('hami:calendar:tombstones:v1');
            } catch {
                /* ignore */
            }
        }
        const { invalidateTombstoneCache, resetTombstoneStateForTests } = await import(
            '../calendarTombstones'
        );
        invalidateTombstoneCache();
        resetTombstoneStateForTests();
    });

    it('recordTombstone ثم loadTombstoneIds بلا شبكة', async () => {
        const { recordTombstone, loadTombstoneIds } = await import('../calendarTombstones');
        await recordTombstone('user-1', 'event-1');
        const ids = await loadTombstoneIds('user-1');
        expect(ids.has('event-1')).toBe(true);
        expect(ids.size).toBe(1);
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });

    it('loadTombstoneIds يعيد مجموعة فارغة لمعرّف مستخدم فارغ', async () => {
        const { loadTombstoneIds } = await import('../calendarTombstones');
        const ids = await loadTombstoneIds('');
        expect(ids.size).toBe(0);
    });

    it('clearTombstone يزيل الشاهد محلياً', async () => {
        const { recordTombstone, clearTombstone, loadTombstoneIds, invalidateTombstoneCache } =
            await import('../calendarTombstones');
        await recordTombstone('user-1', 'event-1');
        await clearTombstone('user-1', 'event-1');
        invalidateTombstoneCache('user-1');
        const ids = await loadTombstoneIds('user-1');
        expect(ids.has('event-1')).toBe(false);
    });

    it('لا يفعل شيئاً لمدخلات باطلة', async () => {
        const { recordTombstone, clearTombstone, loadTombstoneIds } = await import(
            '../calendarTombstones'
        );
        await recordTombstone('', 'evt');
        await recordTombstone('uid', '');
        await clearTombstone('', 'evt');
        const ids = await loadTombstoneIds('uid');
        expect(ids.size).toBe(0);
    });

    it('لا يخلط شواهد مستخدم بآخر', async () => {
        const { recordTombstone, loadTombstoneIds } = await import('../calendarTombstones');
        await recordTombstone('user-1', 'event-1');
        const other = await loadTombstoneIds('user-2');
        expect(other.size).toBe(0);
    });

    it('mergeTombstoneStoreFromCheckpoint يوحّد الشواهد بلا شبكة', async () => {
        const { recordTombstone, mergeTombstoneStoreFromCheckpoint, loadTombstoneIds } =
            await import('../calendarTombstones');
        await recordTombstone('user-1', 'local-1');
        const added = await mergeTombstoneStoreFromCheckpoint({
            'user-1': [
                { eventId: 'local-1', deletedAt: '2026-01-01T00:00:00.000Z' },
                { eventId: 'cloud-1', deletedAt: '2026-02-01T00:00:00.000Z' },
            ],
        });
        expect(added).toBe(1);
        const ids = await loadTombstoneIds('user-1');
        expect(ids.has('local-1')).toBe(true);
        expect(ids.has('cloud-1')).toBe(true);
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });
});
