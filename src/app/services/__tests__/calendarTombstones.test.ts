import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase client
const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
const selectEqSpy = vi.fn().mockResolvedValue({ data: [], error: null });
const deleteEqEqSpy = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: () => ({
            upsert: upsertSpy,
            select: () => ({ eq: selectEqSpy }),
            delete: () => ({
                eq: () => ({
                    eq: deleteEqEqSpy,
                }),
            }),
        }),
    },
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn().mockResolvedValue(undefined),
        getItemSync: vi.fn().mockReturnValue(null),
        setItemSync: vi.fn(),
    },
}));

describe('calendarTombstones', () => {
    beforeEach(async () => {
        upsertSpy.mockClear();
        selectEqSpy.mockClear().mockResolvedValue({ data: [], error: null });
        deleteEqEqSpy.mockClear();
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('hami:calendar:tombstones:v1');
            } catch {
                /* ignore */
            }
        }
        // إفراغ in-memory cache بين الاختبارات
        const { invalidateTombstoneCache, resetCloudTombstoneProbeForTests } = await import('../calendarTombstones');
        invalidateTombstoneCache();
        resetCloudTombstoneProbeForTests();
    });

    it('recordTombstone calls cloud upsert with correct payload', async () => {
        const { recordTombstone } = await import('../calendarTombstones');
        await recordTombstone('user-1', 'event-1');
        expect(upsertSpy).toHaveBeenCalledTimes(1);
        const payload = upsertSpy.mock.calls[0][0];
        expect(payload).toEqual({ user_id: 'user-1', event_id: 'event-1' });
    });

    it('recordTombstone is silent on cloud failure', async () => {
        upsertSpy.mockRejectedValueOnce(new Error('network'));
        const { recordTombstone } = await import('../calendarTombstones');
        await expect(recordTombstone('user-1', 'event-x')).resolves.toBeUndefined();
    });

    it('loadTombstoneIds returns Set merged from cloud (after background sync)', async () => {
        selectEqSpy.mockResolvedValueOnce({
            data: [{ event_id: 'a' }, { event_id: 'b' }],
            error: null,
        });
        const { loadTombstoneIds } = await import('../calendarTombstones');
        // الأول: قراءة local-only (فارغ في beforeEach)
        await loadTombstoneIds('user-1');
        // ننتظر background sync
        await new Promise((r) => setTimeout(r, 30));
        // الثاني: cache يجب أن يحوي cloud data
        const ids = await loadTombstoneIds('user-1');
        expect(ids.has('a')).toBe(true);
        expect(ids.has('b')).toBe(true);
        expect(ids.size).toBe(2);
    });

    it('loadTombstoneIds returns empty Set for empty userId', async () => {
        const { loadTombstoneIds } = await import('../calendarTombstones');
        const ids = await loadTombstoneIds('');
        expect(ids.size).toBe(0);
    });

    it('loadTombstoneIds gracefully handles cloud errors (returns local-only)', async () => {
        selectEqSpy.mockResolvedValueOnce({ data: null, error: { message: 'rls' } });
        const { loadTombstoneIds } = await import('../calendarTombstones');
        const ids = await loadTombstoneIds('user-1');
        // local فارغ → 0
        expect(ids.size).toBe(0);
    });

    it('disables cloud tombstone REST after missing-table error (no repeated calls)', async () => {
        selectEqSpy.mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation does not exist', status: 404 },
        });
        const { loadTombstoneIds, resetCloudTombstoneProbeForTests } = await import('../calendarTombstones');
        resetCloudTombstoneProbeForTests();
        selectEqSpy.mockClear();
        await loadTombstoneIds('user-1');
        await new Promise((r) => setTimeout(r, 30));
        const callsAfterFirst = selectEqSpy.mock.calls.length;
        await loadTombstoneIds('user-1');
        await loadTombstoneIds('user-1');
        expect(selectEqSpy.mock.calls.length).toBe(callsAfterFirst);
    });

    it('clearTombstone calls cloud delete with both filters', async () => {
        const { clearTombstone } = await import('../calendarTombstones');
        await clearTombstone('user-1', 'event-1');
        expect(deleteEqEqSpy).toHaveBeenCalledTimes(1);
    });

    it('do nothing for invalid input', async () => {
        const { recordTombstone, clearTombstone } = await import('../calendarTombstones');
        await recordTombstone('', 'evt');
        await recordTombstone('uid', '');
        await clearTombstone('', 'evt');
        expect(upsertSpy).not.toHaveBeenCalled();
        expect(deleteEqEqSpy).not.toHaveBeenCalled();
    });
});
