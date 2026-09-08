import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmartLegalRadarLifecycle } from '@/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarLifecycle';

const perf = vi.hoisted(() => ({
    mark: vi.fn(),
    report: vi.fn(),
}));

vi.mock('@/app/services/calendar/calendarPerfMetrics', () => ({
    markCalendarPerfPhase: perf.mark,
    reportCalendarPerf: perf.report,
}));

vi.mock('@/app/services/calendar/calendarLocalSnapshot', () => ({
    readLocalCalendarSnapshotSync: vi.fn(() => []),
    peekLocalCalendarSnapshotSync: vi.fn(() => []),
}));

vi.mock('@/app/services/calendar/calendarEventsCache', () => ({
    getCachedCalendarEvents: vi.fn(() => null),
}));

vi.mock('@/app/services/calendar/bridge/core', () => ({
    resolveCalendarUserId: vi.fn((id: string | null) => id ?? 'guest'),
}));

describe('useSmartLegalRadarLifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('لا يعلن interactive عندما يكون التبويب مخفياً', () => {
        renderHook(() => useSmartLegalRadarLifecycle('user-1', 0, false));
        expect(perf.mark).not.toHaveBeenCalled();
        expect(perf.report).not.toHaveBeenCalled();
    });

    it('يعلن interactive عند التحويل من مخفي إلى ظاهر', () => {
        const { rerender } = renderHook(
            ({ active }) => useSmartLegalRadarLifecycle('user-1', 2, active),
            { initialProps: { active: false } },
        );
        expect(perf.mark).not.toHaveBeenCalled();

        rerender({ active: true });

        expect(perf.mark).toHaveBeenCalledWith('first-paint');
        expect(perf.mark).toHaveBeenCalledWith('interactive');
        expect(perf.report).toHaveBeenCalledWith({
            userId: 'user-1',
            eventCount: 2,
            hadLocalCache: false,
        });
    });

    it('يرفض استدعاءات stale عند تبديل الجلسات بسرعة — آخر مستخدم فقط يُعلن', () => {
        const { rerender } = renderHook(
            ({ uid, count, active }) => useSmartLegalRadarLifecycle(uid, count, active),
            { initialProps: { uid: 'user-1', count: 1, active: true } },
        );

        expect(perf.report).toHaveBeenCalledTimes(1);
        expect(perf.report).toHaveBeenLastCalledWith({
            userId: 'user-1',
            eventCount: 1,
            hadLocalCache: false,
        });

        perf.report.mockClear();
        perf.mark.mockClear();

        rerender({ uid: 'user-1', count: 1, active: true });
        expect(perf.report).toHaveBeenCalledTimes(0);

        rerender({ uid: 'user-2', count: 5, active: true });
        expect(perf.report).toHaveBeenCalledTimes(1);
        expect(perf.report).toHaveBeenLastCalledWith({
            userId: 'user-2',
            eventCount: 5,
            hadLocalCache: false,
        });

        perf.report.mockClear();

        rerender({ uid: 'user-3', count: 0, active: true });
        expect(perf.report).toHaveBeenCalledTimes(1);
        expect(perf.report).toHaveBeenLastCalledWith({
            userId: 'user-3',
            eventCount: 0,
            hadLocalCache: false,
        });
    });
});
