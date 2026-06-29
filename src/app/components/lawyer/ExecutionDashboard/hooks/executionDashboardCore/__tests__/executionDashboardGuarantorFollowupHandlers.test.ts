import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardGuarantorFollowupHandlers } from '../useExecutionDashboardGuarantorFollowupHandlers';

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    readExecutorDecisionsArray: vi.fn(() => []),
    appendPendingExecutorSeizureDecision: vi.fn(() => 'dec-new'),
    appendGuarantorFollowupRequest: vi.fn(() => ({ ok: true, decisionId: 'g-dec-1' })),
    supersedeGuarantorRequestDecisionsForExecution: vi.fn(),
}));

vi.mock('@/app/types/execution', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/types/execution')>();
    return {
        ...actual,
        guarantorFollowupAwaitingDetailsSave: vi.fn(() => false),
    };
});

describe('useExecutionDashboardGuarantorFollowupHandlers', () => {
    const baseParams = () => ({
        decisionsStorageExecutionId: 'dossier-1',
        executionData: { id: 'exec-1', guarantor_followup: { executor_approved: true, details_saved: true } } as any,
        executionId: 'exec-1',
        assignmentWorkspaceCtx: { activeDebtorKey: 'd1' },
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        pushTimelineEvent: vi.fn(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        openGuarantorDetailsModal: vi.fn(),
        openSeizureRequestsTabRef: { current: vi.fn() },
        setTimelineEvents: vi.fn((fn) => (typeof fn === 'function' ? fn([]) : fn)),
        setShowCoerciveActionForm: vi.fn(),
        setSeizureDetailCompletion: vi.fn(),
        setShowUnifiedExecutionModal: vi.fn(),
        setUnifiedModalTab: vi.fn(),
        executionDataRef: { current: { id: 'exec-1', guarantor_followup: { executor_approved: true } } },
        persistExecutionMergeRef: { current: vi.fn() },
        guarantorDetailsDecisionId: null,
        setGuarantorDetailsDecisionId: vi.fn(),
    });

    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('requestFollowupSeizureDecision appends decision and toast success', async () => {
        const showToast = vi.fn();
        const pushTimelineEvent = vi.fn();
        const { appendPendingExecutorSeizureDecision } = await import('@/app/utils/executorSeizureDecisionQueue');

        const { result } = renderHook(() =>
            useExecutionDashboardGuarantorFollowupHandlers({
                ...baseParams(),
                showToast,
                pushTimelineEvent,
            }),
        );

        act(() => {
            result.current.requestFollowupSeizureDecision('notice', 'طلب إخبار', 'نص الطلب');
        });

        expect(appendPendingExecutorSeizureDecision).toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'تم إرسال الطلب إلى القرارات والطعون.',
            'success',
            expect.objectContaining({ decisionId: 'dec-new' }),
        );
    });

    it('requestGuarantorSeizure warns when guarantor not approved', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardGuarantorFollowupHandlers({
                ...baseParams(),
                executionData: { guarantor_followup: { executor_approved: false } } as any,
                showToast,
            }),
        );

        act(() => {
            result.current.requestGuarantorSeizure('salary');
        });

        expect(showToast).toHaveBeenCalledWith('لا يوجد كفيل معتمد من المنفذ.', 'warning');
    });

    it('archiveAndClearGuarantor persists archive patch', () => {
        const persistExecutionMerge = vi.fn();
        const pushTimelineEvent = vi.fn();
        const gf = { guarantor_name: 'كفيل', executor_approved: true };

        const { result } = renderHook(() =>
            useExecutionDashboardGuarantorFollowupHandlers({
                ...baseParams(),
                executionData: { guarantor_followup: gf, guarantor_followup_history: [] } as any,
                persistExecutionMerge,
                pushTimelineEvent,
            }),
        );

        act(() => {
            result.current.archiveAndClearGuarantor('unlink');
        });

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                guarantor_followup: null,
                hasGuarantor: false,
            }),
        );
        expect(pushTimelineEvent).toHaveBeenCalled();
    });
});
