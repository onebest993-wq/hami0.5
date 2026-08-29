import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fetchCalendarEvents } from '@/app/services/calendar/calendarCloudRuntime';
import {
    invalidateHomeHubRadarCache,
    isHomeHubRadarWarmInFlight,
    peekHomeHubRadarCache,
    peekHomeHubRadarSnapshot,
    resetHomeHubRadarCacheForTests,
    setHomeHubRadarCacheForTests,
    subscribeHomeHubRadarWarm,
    warmHomeHubRadarCache,
} from '@/app/services/alerts/homeHubRadarWarmCache';
import {
    resetCalendarEventsCacheForTests,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';

vi.mock('@/app/services/calendar/calendarCloudRuntime', () => ({
    fetchCalendarEvents: vi.fn().mockResolvedValue([{ id: 'ev-1', title: 'موعد' }]),
}));

describe('homeHubRadarWarmCache', () => {
    beforeEach(() => {
        resetHomeHubRadarCacheForTests();
        resetCalendarEventsCacheForTests();
        vi.clearAllMocks();
        vi.mocked(fetchCalendarEvents).mockResolvedValue([{ id: 'ev-1', title: 'موعد' } as never]);
    });

    it('يُحمّي أحداث التقويم للمحامي', async () => {
        warmHomeHubRadarCache('lawyer-1');
        await vi.waitFor(() => expect(peekHomeHubRadarCache('lawyer-1')).not.toBeNull());
        expect(peekHomeHubRadarCache('lawyer-1')?.[0]?.id).toBe('ev-1');
    });

    it('لا يُرجع كاش محامٍ لمحامٍ آخر', () => {
        setHomeHubRadarCacheForTests('lawyer-1', [{ id: 'ev-1' } as never]);
        expect(peekHomeHubRadarCache('lawyer-1')?.[0]?.id).toBe('ev-1');
        expect(peekHomeHubRadarCache('lawyer-2')).toBeNull();
        expect(peekHomeHubRadarCache(null)).toBeNull();
    });

    it('الإبطال يمسّ محامي اللقطة فقط', () => {
        setHomeHubRadarCacheForTests('lawyer-1', [{ id: 'ev-1' } as never]);
        invalidateHomeHubRadarCache('lawyer-2');
        expect(peekHomeHubRadarCache('lawyer-1')?.[0]?.id).toBe('ev-1');
        invalidateHomeHubRadarCache('lawyer-1');
        expect(peekHomeHubRadarCache('lawyer-1')).toBeNull();
        invalidateHomeHubRadarCache(null);
        expect(peekHomeHubRadarCache('lawyer-1')).toBeNull();
    });

    it('الإبطال يمنع السقوط إلى تقويم فارغ قديم حتى يُعاد الاكتشاف', () => {
        setCachedCalendarEvents('lawyer-1', []);
        expect(peekHomeHubRadarSnapshot('lawyer-1')).toEqual([]);
        invalidateHomeHubRadarCache('lawyer-1');
        expect(peekHomeHubRadarSnapshot('lawyer-1')).toBeNull();
        expect(peekHomeHubRadarCache('lawyer-1')).toBeNull();
        setCachedCalendarEvents('lawyer-1', [{ id: 'stale' } as never]);
        expect(peekHomeHubRadarSnapshot('lawyer-1')).toBeNull();
    });

    it('إبطال أثناء التسخين يتجاهل الرد القديم', async () => {
        let resolveWarm: (value: { id: string }[]) => void = () => undefined;
        vi.mocked(fetchCalendarEvents).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveWarm = (value) => resolve(value as never);
                }),
        );
        warmHomeHubRadarCache('lawyer-1');
        expect(isHomeHubRadarWarmInFlight('lawyer-1')).toBe(true);
        invalidateHomeHubRadarCache('lawyer-1');
        expect(isHomeHubRadarWarmInFlight('lawyer-1')).toBe(false);
        resolveWarm([{ id: 'stale-after-update' }]);
        await Promise.resolve();
        await Promise.resolve();
        expect(peekHomeHubRadarCache('lawyer-1')).toBeNull();
        expect(peekHomeHubRadarSnapshot('lawyer-1')).toBeNull();
    });

    it('اللقطة تسقط إلى ذاكرة التقويم إن لم يُحمَّ الهاب', () => {
        expect(peekHomeHubRadarSnapshot('lawyer-1')).toBeNull();
        setCachedCalendarEvents('lawyer-1', []);
        expect(peekHomeHubRadarSnapshot('lawyer-1')).toEqual([]);
        setCachedCalendarEvents('lawyer-1', [{ id: 'cal-1' } as never]);
        expect(peekHomeHubRadarSnapshot('lawyer-1')?.[0]).toEqual(
            expect.objectContaining({ id: 'cal-1' }),
        );
        setHomeHubRadarCacheForTests('lawyer-1', [{ id: 'hub-1' } as never]);
        expect(peekHomeHubRadarSnapshot('lawyer-1')?.[0]).toEqual(
            expect.objectContaining({ id: 'hub-1' }),
        );
    });

    it('التسخين الجاري يُعلن عند الاكتمال', async () => {
        let resolveWarm: (value: { id: string }[]) => void = () => undefined;
        vi.mocked(fetchCalendarEvents).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveWarm = (value) => resolve(value as never);
                }),
        );
        const seen: boolean[] = [];
        const unsub = subscribeHomeHubRadarWarm(() => seen.push(true));
        warmHomeHubRadarCache('lawyer-1');
        expect(isHomeHubRadarWarmInFlight('lawyer-1')).toBe(true);
        expect(peekHomeHubRadarCache('lawyer-1')).toBeNull();
        resolveWarm([{ id: 'ev-1' }]);
        await vi.waitFor(() => expect(peekHomeHubRadarCache('lawyer-1')).not.toBeNull());
        expect(isHomeHubRadarWarmInFlight('lawyer-1')).toBe(false);
        expect(seen.length).toBeGreaterThan(0);
        unsub();
    });

    it('يتجاهل اكتمال جلب قديم بعد تبديل المحامي', async () => {
        let finishFirst: (value: { id: string }[]) => void = () => undefined;
        vi.mocked(fetchCalendarEvents)
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        finishFirst = (value) => resolve(value as never);
                    }),
            )
            .mockResolvedValueOnce([{ id: 'ev-b', title: 'ب' } as never]);

        warmHomeHubRadarCache('lawyer-a');
        warmHomeHubRadarCache('lawyer-b');
        await vi.waitFor(() => expect(peekHomeHubRadarCache('lawyer-b')?.[0]?.id).toBe('ev-b'));
        finishFirst([{ id: 'ev-a' }]);
        await Promise.resolve();
        await Promise.resolve();
        expect(peekHomeHubRadarCache('lawyer-b')?.[0]?.id).toBe('ev-b');
        expect(peekHomeHubRadarCache('lawyer-a')).toBeNull();
    });
});
