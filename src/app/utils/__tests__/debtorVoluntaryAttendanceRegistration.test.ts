import { describe, expect, it, vi } from 'vitest';
import { registerDebtorVoluntaryAttendanceForDebtor } from '../debtorVoluntaryAttendanceRegistration';

describe('registerDebtorVoluntaryAttendanceForDebtor', () => {
    it('يحفظ حضور المدين ذرياً عبر setTimelineEvents و persistExecutionMerge', () => {
        let timeline: import('@/app/types/execution').TimelineEvent[] = [];
        const setTimelineEvents = vi.fn((updater) => {
            timeline =
                typeof updater === 'function'
                    ? updater(timeline)
                    : updater;
        });
        const persistExecutionMerge = vi.fn(() => true);
        const showToast = vi.fn();

        const ok = registerDebtorVoluntaryAttendanceForDebtor({
            executionData: { id: 'ex-1' } as never,
            debtorKey: 'debtor-1',
            primaryDebtorKeyResolved: 'debtor-1',
            notificationDateYmd: '2026-07-31',
            nextTimelineId: () => 'tl-1',
            setTimelineEvents,
            persistExecutionMerge,
            showToast,
        });

        expect(ok).toBe(true);
        expect(timeline).toHaveLength(1);
        expect(timeline[0]?.type).toBe('summons');
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                debtorAttendedVoluntarily: true,
                timelineEvents: timeline,
            }),
        );
        expect(showToast).toHaveBeenCalled();
    });

    it('يفشل بصدق عند غياب مسارات الحفظ', () => {
        const showToast = vi.fn();
        const ok = registerDebtorVoluntaryAttendanceForDebtor({
            executionData: { id: 'ex-1' } as never,
            debtorKey: 'debtor-1',
            primaryDebtorKeyResolved: 'debtor-1',
            nextTimelineId: () => 'tl-1',
            showToast,
        });
        expect(ok).toBe(false);
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('تعذر'),
            expect.anything(),
        );
    });
});
