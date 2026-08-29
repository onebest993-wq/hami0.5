import { describe, expect, it, vi, beforeEach } from 'vitest';

const prefetchScheduleHubModule = vi.fn();
const prefetchCalendarCloudModule = vi.fn();
const warmCalendarEventsCache = vi.fn(() => Promise.resolve([]));

vi.mock('@/app/runtime/scheduleHubLoader', () => ({
    prefetchScheduleHubModule: (...args: unknown[]) => prefetchScheduleHubModule(...args),
}));

vi.mock('@/app/services/calendar/calendarCloudLoader', () => ({
    prefetchCalendarCloudModule: (...args: unknown[]) => prefetchCalendarCloudModule(...args),
}));

vi.mock('@/app/services/calendar/calendarEventsWarm', () => ({
    warmCalendarEventsCache: (...args: unknown[]) => warmCalendarEventsCache(...args),
}));

describe('scheduleWarmCore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('when-user: cloud + cache فقط عند وجود userId', async () => {
        const { runScheduleWarmCore } = await import('@/app/runtime/scheduleWarmCore');

        runScheduleWarmCore({ userId: 'lawyer-1', prefetchCloud: 'when-user' });

        expect(prefetchScheduleHubModule).toHaveBeenCalledTimes(1);
        expect(prefetchCalendarCloudModule).toHaveBeenCalledTimes(1);
        expect(warmCalendarEventsCache).toHaveBeenCalledWith('lawyer-1');
    });

    it('when-user: hub فقط بلا userId', async () => {
        const { runScheduleWarmCore } = await import('@/app/runtime/scheduleWarmCore');

        runScheduleWarmCore({ prefetchCloud: 'when-user' });

        expect(prefetchScheduleHubModule).toHaveBeenCalledTimes(1);
        expect(prefetchCalendarCloudModule).not.toHaveBeenCalled();
        expect(warmCalendarEventsCache).toHaveBeenCalledWith(null);
    });

    it('always: cloud حتى بلا userId', async () => {
        const { runScheduleWarmCore } = await import('@/app/runtime/scheduleWarmCore');

        runScheduleWarmCore({ prefetchCloud: 'always' });

        expect(prefetchScheduleHubModule).toHaveBeenCalledTimes(1);
        expect(prefetchCalendarCloudModule).toHaveBeenCalledTimes(1);
        expect(warmCalendarEventsCache).toHaveBeenCalledWith(null);
    });
});
