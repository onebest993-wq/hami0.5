import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecureSpy = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecureSpy(...args),
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
        fetchSecureSpy.mockClear().mockResolvedValue({ ok: true });
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('hami:calendar:tombstones:v1');
                localStorage.removeItem('hami:calendar:tombstones:cloud-disabled:v1');
            } catch {
                /* ignore */
            }
        }
        const { invalidateTombstoneCache, resetCloudTombstoneProbeForTests } = await import('../calendarTombstones');
        invalidateTombstoneCache();
        resetCloudTombstoneProbeForTests();
    });

    it('recordTombstone calls cloud API with correct payload', async () => {
        const { recordTombstone } = await import('../calendarTombstones');
        await recordTombstone('user-1', 'event-1');
        expect(fetchSecureSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSecureSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/calendar/tombstones');
        expect(init?.method).toBe('POST');
        expect(JSON.parse(String(init?.body))).toEqual({ action: 'mark', eventId: 'event-1' });
    });

    it('recordTombstone is silent on cloud failure', async () => {
        fetchSecureSpy.mockRejectedValueOnce(new Error('network'));
        const { recordTombstone } = await import('../calendarTombstones');
        await expect(recordTombstone('user-1', 'event-x')).resolves.toBeUndefined();
    });

    it('loadTombstoneIds returns Set merged from cloud (after background sync)', async () => {
        fetchSecureSpy.mockResolvedValueOnce({ ok: true, eventIds: ['a', 'b'] });
        const { loadTombstoneIds } = await import('../calendarTombstones');
        await loadTombstoneIds('user-1');
        await new Promise((r) => setTimeout(r, 30));
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
        fetchSecureSpy.mockRejectedValueOnce({ code: '42P01', message: 'relation does not exist', status: 404 });
        const { loadTombstoneIds } = await import('../calendarTombstones');
        const ids = await loadTombstoneIds('user-1');
        expect(ids.size).toBe(0);
    });

    it('disables cloud tombstone REST after missing-table error (no repeated calls)', async () => {
        fetchSecureSpy.mockRejectedValue({ code: '42P01', message: 'relation does not exist', status: 404 });
        const { loadTombstoneIds, resetCloudTombstoneProbeForTests } = await import('../calendarTombstones');
        resetCloudTombstoneProbeForTests();
        fetchSecureSpy.mockClear();
        fetchSecureSpy.mockRejectedValue({ code: '42P01', message: 'relation does not exist', status: 404 });
        await loadTombstoneIds('user-1');
        await new Promise((r) => setTimeout(r, 30));
        const callsAfterFirst = fetchSecureSpy.mock.calls.length;
        await loadTombstoneIds('user-1');
        await loadTombstoneIds('user-1');
        expect(fetchSecureSpy.mock.calls.length).toBe(callsAfterFirst);
    });

    it('clearTombstone calls cloud delete API', async () => {
        const { clearTombstone } = await import('../calendarTombstones');
        await clearTombstone('user-1', 'event-1');
        expect(fetchSecureSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSecureSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/calendar/tombstones');
        expect(JSON.parse(String(init?.body))).toEqual({ action: 'clear', eventId: 'event-1' });
    });

    it('do nothing for invalid input', async () => {
        const { recordTombstone, clearTombstone } = await import('../calendarTombstones');
        await recordTombstone('', 'evt');
        await recordTombstone('uid', '');
        await clearTombstone('', 'evt');
        expect(fetchSecureSpy).not.toHaveBeenCalled();
    });
});
