import { describe, expect, it, vi } from 'vitest';
import { runSaveThirdPartySeizureForDecision } from '../executionDashboardThirdPartySeizureSave';

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    getExecutorDecisionRowById: vi.fn(() => null),
    patchExecutorDecisionRow: vi.fn(),
}));

describe('executionDashboardThirdPartySeizureSave', () => {
    it('creates third party seizure row and notifies', () => {
        const onSeizuresUpdated = vi.fn();
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();

        runSaveThirdPartySeizureForDecision({
            input: {
                decisionId: 'd1',
                thirdPartyName: 'Bank',
                requestedAmountIqd: 1000,
                notificationDateIso: '2026-01-01',
            },
            decisionsStorageExecutionId: 'ex-1',
            executionDataRef: { current: { thirdPartySeizures: [] } } as never,
            getLocalTodayYmd: () => '2026-01-01',
            nextTimelineId: () => 'tl-1',
            pushTimelineEvent,
            showToast,
            onSeizuresUpdated,
        });

        expect(onSeizuresUpdated).toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'تم إنشاء مسار الحجز لدى الغير بحالة (تم التبليغ).',
            'success',
        );
    });
});
