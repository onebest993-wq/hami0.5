import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCriminalJourneyFilterOrchestrator } from '../useCriminalJourneyFilterOrchestrator';
import { useCriminalToastOrchestrator } from '../useCriminalToastOrchestrator';
import { useCriminalDecisionsOrchestrator } from '../useCriminalDecisionsOrchestrator';
import { useCriminalRequestsOrchestrator } from '../useCriminalRequestsOrchestrator';
import { mergeCriminalOrchestratorSlices } from '../criminalOrchestratorTypes';

describe('criminal domain orchestrators', () => {
    it('useCriminalJourneyFilterOrchestrator tracks filters', () => {
        const { result } = renderHook(() => useCriminalJourneyFilterOrchestrator());
        act(() => result.current.setSelectedNodeFilter('node-1'));
        expect(result.current.selectedNodeFilter).toBe('node-1');
        act(() => result.current.setSelectedPartyFilterId('party-a'));
        expect(result.current.selectedPartyFilterId).toBe('party-a');
    });

    it('useCriminalToastOrchestrator exposes legal toast', () => {
        const { result } = renderHook(() => useCriminalToastOrchestrator());
        act(() => result.current.setLegalToast('✓ تم الحفظ'));
        expect(result.current.legalToast).toBe('✓ تم الحفظ');
    });

    it('useCriminalDecisionsOrchestrator resets pagination on filter change', () => {
        const { result, rerender } = renderHook(
            (props: { node: string }) =>
                useCriminalDecisionsOrchestrator({
                    effectiveUiStage: 'investigation',
                    caseId: 'case-1',
                    selectedNodeFilter: props.node,
                    selectedJourneyBranchId: '',
                }),
            { initialProps: { node: 'n1' } },
        );
        act(() => result.current.setVisibleJudicialDecisionsCount(99));
        rerender({ node: 'n2' });
        expect(result.current.visibleJudicialDecisionsCount).toBe(result.current.decisionsPageSize);
    });

    it('useCriminalRequestsOrchestrator opens modal lane', () => {
        const { result } = renderHook(() => useCriminalRequestsOrchestrator());
        act(() => {
            result.current.setRequestModalLane('lawyer');
            result.current.setIsRequestsModalOpen(true);
        });
        expect(result.current.requestModalLane).toBe('lawyer');
        expect(result.current.isRequestsModalOpen).toBe(true);
    });

    it('mergeCriminalOrchestratorSlices merges typed slices', () => {
        const merged = mergeCriminalOrchestratorSlices(
            { bootReady: true },
            { selectedNodeFilter: '', setSelectedNodeFilter: () => {}, selectedPartyFilterId: '', setSelectedPartyFilterId: () => {}, selectedJourneyBranchId: '', setSelectedJourneyBranchId: () => {} },
            { legalToast: '', setLegalToast: () => {} },
        );
        expect(merged.bootReady).toBe(true);
        expect(merged.legalToast).toBe('');
    });
});
