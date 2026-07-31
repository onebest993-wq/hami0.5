import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ExecutorApprovalActions } from '@/app/utils/executorApprovalWorkflow';
import { useExecutionDashboardPendingExecutorDecisionOpeners } from '../useExecutionDashboardPendingExecutorDecisionOpeners';
import {
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
} from '@/app/utils/executorDecisionReadQueries';

vi.mock('@/app/utils/executorDecisionReadQueries', () => ({
    findApprovedBreakInventoryNeedingLedger: vi.fn(),
    findApprovedCustodianNeedingDetails: vi.fn(),
}));

function buildExecutorApprovalActions(): ExecutorApprovalActions {
    return {
        openScheduledDateModal: vi.fn(),
        showToast: vi.fn(),
        appendDossierTask: vi.fn(),
        getFieldVisitDeadlineIso: vi.fn(() => null),
        promptOpenExecutionReport: vi.fn(),
        pushCalendarAppointment: vi.fn(),
        patchDecision: vi.fn(),
        openBreakInventoryFurnitureModal: vi.fn(),
        openJudicialCustodianModal: vi.fn(),
        appendCaseNote: vi.fn(),
        persistJudicialCustodianDetails: vi.fn(),
    };
}

describe('useExecutionDashboardPendingExecutorDecisionOpeners', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('opens the pending break inventory flow from the primary storage key', () => {
        vi.mocked(findApprovedBreakInventoryNeedingLedger).mockReturnValue({
            decisionId: 'decision-1',
            requestTitle: 'طلب جرد',
        });

        const setShowDecisionsModal = vi.fn();
        const openBreakInventoryCompletion = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPendingExecutorDecisionOpeners({
                executionId: 'fallback-execution',
                decisionsStorageExecutionId: 'primary-execution',
                executorApprovalActions: buildExecutorApprovalActions(),
                setShowDecisionsModal,
                openBreakInventoryCompletion,
                openJudicialCustodianCompletion: vi.fn(),
            }),
        );

        expect(result.current.tryOpenPendingBreakInventoryLedger()).toBe(true);
        expect(findApprovedBreakInventoryNeedingLedger).toHaveBeenCalledWith('primary-execution');
        expect(setShowDecisionsModal).toHaveBeenCalledWith(false);
        expect(openBreakInventoryCompletion).toHaveBeenCalledWith(
            'decision-1',
            expect.objectContaining({
                appendCaseNote: expect.any(Function),
            }),
            'طلب جرد',
        );
    });

    it('falls back to executionId for pending custodian details when the primary key misses', () => {
        vi.mocked(findApprovedCustodianNeedingDetails)
            .mockReturnValueOnce(null)
            .mockReturnValueOnce({
                decisionId: 'decision-2',
                requestTitle: 'طلب حارس قضائي',
            });

        const setShowDecisionsModal = vi.fn();
        const openJudicialCustodianCompletion = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPendingExecutorDecisionOpeners({
                executionId: 'fallback-execution',
                decisionsStorageExecutionId: 'primary-execution',
                executorApprovalActions: buildExecutorApprovalActions(),
                setShowDecisionsModal,
                openBreakInventoryCompletion: vi.fn(),
                openJudicialCustodianCompletion,
            }),
        );

        expect(result.current.tryOpenPendingCustodianDetails()).toBe(true);
        expect(findApprovedCustodianNeedingDetails).toHaveBeenNthCalledWith(1, 'primary-execution');
        expect(findApprovedCustodianNeedingDetails).toHaveBeenNthCalledWith(2, 'fallback-execution');
        expect(setShowDecisionsModal).toHaveBeenCalledWith(false);
        expect(openJudicialCustodianCompletion).toHaveBeenCalledWith(
            'decision-2',
            expect.objectContaining({
                openJudicialCustodianModal: expect.any(Function),
            }),
            'طلب حارس قضائي',
        );
    });

    it('returns false without opening anything when no pending executor decision exists', () => {
        vi.mocked(findApprovedBreakInventoryNeedingLedger).mockReturnValue(null);
        vi.mocked(findApprovedCustodianNeedingDetails).mockReturnValue(null);

        const setShowDecisionsModal = vi.fn();
        const openBreakInventoryCompletion = vi.fn();
        const openJudicialCustodianCompletion = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPendingExecutorDecisionOpeners({
                executionId: 'same-id',
                decisionsStorageExecutionId: 'same-id',
                executorApprovalActions: buildExecutorApprovalActions(),
                setShowDecisionsModal,
                openBreakInventoryCompletion,
                openJudicialCustodianCompletion,
            }),
        );

        expect(result.current.tryOpenPendingBreakInventoryLedger()).toBe(false);
        expect(result.current.tryOpenPendingCustodianDetails()).toBe(false);
        expect(openBreakInventoryCompletion).not.toHaveBeenCalled();
        expect(openJudicialCustodianCompletion).not.toHaveBeenCalled();
        expect(setShowDecisionsModal).not.toHaveBeenCalled();
        expect(findApprovedBreakInventoryNeedingLedger).toHaveBeenCalledTimes(1);
        expect(findApprovedCustodianNeedingDetails).toHaveBeenCalledTimes(1);
    });
});
