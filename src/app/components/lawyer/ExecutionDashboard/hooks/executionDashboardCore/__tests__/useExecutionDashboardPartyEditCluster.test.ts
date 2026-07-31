import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardPartyEditCluster } from '../useExecutionDashboardPartyEditCluster';

const usePartyEditWorkflowMock = vi.fn();

vi.mock('../../usePartyEditWorkflow', () => ({
    usePartyEditWorkflow: (...args: unknown[]) => usePartyEditWorkflowMock(...args),
}));

describe('useExecutionDashboardPartyEditCluster', () => {
    it('re-exports party edit workflow and its surfaced fields', () => {
        const workflow = {
            editPartyTarget: { kind: 'creditor', index: 0 },
            setEditPartyTarget: vi.fn(),
            partyEditDraft: { name: 'أحمد' },
            setPartyEditDraft: vi.fn(),
            partyEditHeirDeleteConfirmIdx: null,
            setPartyEditHeirDeleteConfirmIdx: vi.fn(),
            heirsQuickView: null,
            setHeirsQuickView: vi.fn(),
            openEditParty: vi.fn(),
            buildPartyHeirsRows: vi.fn(() => []),
            openHeirsQuickView: vi.fn(),
            savePartyEditDraft: vi.fn(),
            removeHeirFromPartyEditDraftAtIndex: vi.fn(),
            togglePartyEditHeirClient: vi.fn(),
        };
        usePartyEditWorkflowMock.mockReturnValue(workflow);

        const executionDataRef = { current: null };
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardPartyEditCluster({
                executionData: null,
                viewExecutionData: null,
                executionDataRef: executionDataRef as never,
                decisionsStorageExecutionId: 'ex-1',
                isHistoricalMode: false,
                persistExecutionMerge,
                showToast,
            }),
        );

        expect(usePartyEditWorkflowMock).toHaveBeenCalledWith({
            executionData: null,
            viewExecutionData: null,
            executionDataRef,
            decisionsStorageExecutionId: 'ex-1',
            isHistoricalMode: false,
            persistExecutionMerge,
            showToast,
        });
        expect(result.current.partyEditWorkflow).toBe(workflow);
        expect(result.current.editPartyTarget).toEqual({ kind: 'creditor', index: 0 });
        expect(result.current.buildPartyHeirsRows).toBe(workflow.buildPartyHeirsRows);
    });
});
