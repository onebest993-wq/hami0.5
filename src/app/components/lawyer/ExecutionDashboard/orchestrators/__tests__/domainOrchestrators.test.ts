import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionFinancialOrchestrator } from '../useExecutionFinancialOrchestrator';
import { useExecutionPartiesOrchestrator } from '../useExecutionPartiesOrchestrator';
import { useExecutionDossierTabOrchestrator } from '../useExecutionDossierTabOrchestrator';
import { useExecutionDossierLifecyclePanelOrchestrator } from '../useExecutionDossierLifecyclePanelOrchestrator';
import { useExecutionDossierLifecycleActionsOrchestrator } from '../useExecutionDossierLifecycleActionsOrchestrator';
import { mergeOrchestratorSlices } from '../executionOrchestratorTypes';

describe('domain orchestrators', () => {
    it('useExecutionFinancialOrchestrator opens hub and closes followup modal', () => {
        let followupOpen = true;
        const { result } = renderHook(() =>
            useExecutionFinancialOrchestrator({
                setShowUnifiedExecutionModal: (show) => {
                    followupOpen = show;
                },
            }),
        );

        act(() => {
            result.current.openFinancialHubLedger();
        });

        expect(followupOpen).toBe(false);
        expect(result.current.isFinancialCenterExpanded).toBe(true);
        expect(result.current.showExecutionFinancialHub).toBe(true);
    });

    it('useExecutionPartiesOrchestrator resets on file key change', () => {
        const { result, rerender } = renderHook(
            ({ key }) => useExecutionPartiesOrchestrator(key),
            { initialProps: { key: 'file-a' } },
        );

        act(() => {
            result.current.setShowExtraCreditors(true);
            result.current.setShowExtraDebtors(true);
        });
        expect(result.current.showExtraCreditors).toBe(true);

        rerender({ key: 'file-b' });
        expect(result.current.showExtraCreditors).toBe(false);
        expect(result.current.showExtraDebtors).toBe(false);
    });

    it('useExecutionDossierTabOrchestrator syncs activeTabId with currentFileId', () => {
        const { result, rerender } = renderHook(
            ({ id }) => useExecutionDossierTabOrchestrator(id),
            { initialProps: { id: 'parent-1' } },
        );
        expect(result.current.activeTabId).toBe('parent-1');

        rerender({ id: 'parent-2' });
        expect(result.current.activeTabId).toBe('parent-2');
    });

    it('useExecutionDossierLifecyclePanelOrchestrator closes panel', () => {
        const { result } = renderHook(() => useExecutionDossierLifecyclePanelOrchestrator());

        act(() => {
            result.current.setDossierLifecyclePanelOpen(true);
            result.current.setDossierLifecyclePanelPhase('details');
            result.current.setDossierPendingStatus('archived');
        });

        act(() => {
            result.current.closeDossierLifecyclePanel();
        });

        expect(result.current.dossierLifecyclePanelOpen).toBe(false);
        expect(result.current.dossierLifecyclePanelPhase).toBe('menu');
        expect(result.current.dossierPendingStatus).toBeNull();
    });

    it('useExecutionDossierLifecycleActionsOrchestrator routes pick to details phase', () => {
        const { result } = renderHook(() => {
            const panel = useExecutionDossierLifecyclePanelOrchestrator(null);
            const actions = useExecutionDossierLifecycleActionsOrchestrator({
                executionData: { id: 'ex-1', dossier_lifecycle_status: 'active' } as never,
                executionId: 'ex-1',
                executionDataRef: { current: { id: 'ex-1' } as never },
                dossierFileKey: 'ex-1',
                financialLedgerRef: { current: [] },
                seizedAssetsSnapshotRef: { current: [] },
                setTimelineEvents: () => {},
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge: vi.fn(),
                reconcileDossierLifecycle: vi.fn(),
                showToast: vi.fn(),
                dossierPendingStatus: panel.dossierPendingStatus,
                dossierReasonDraft: panel.dossierReasonDraft,
                dossierDateDraft: panel.dossierDateDraft,
                setDossierReasonDraft: panel.setDossierReasonDraft,
                setDossierDateDraft: panel.setDossierDateDraft,
                setDossierPendingStatus: panel.setDossierPendingStatus,
                setDossierLifecyclePanelPhase: panel.setDossierLifecyclePanelPhase,
                closeDossierLifecyclePanel: panel.closeDossierLifecyclePanel,
            });
            return { panel, actions };
        });

        act(() => {
            result.current.actions.handleDossierLifecyclePick('archived');
        });

        expect(result.current.panel.dossierLifecyclePanelPhase).toBe('details');
        expect(result.current.panel.dossierPendingStatus).toBe('archived');
    });

    it('mergeOrchestratorSlices preserves typed domain fields', () => {
        const financial = {
            isFinancialCenterExpanded: true,
            setIsFinancialCenterExpanded: () => {},
            activeFinancialTab: 2,
            setActiveFinancialTab: () => {},
            showExecutionFinancialHub: false,
            setShowExecutionFinancialHub: () => {},
            financialHubAutoOpenMode: null,
            setFinancialHubAutoOpenMode: () => {},
            financialHubSeizedMovableId: null,
            setFinancialHubSeizedMovableId: () => {},
            financialHubSeizedPropertyId: null,
            setFinancialHubSeizedPropertyId: () => {},
            openFinancialHubLedger: () => {},
        };
        const parties = {
            showExtraCreditors: false,
            setShowExtraCreditors: () => {},
            showExtraDebtors: false,
            setShowExtraDebtors: () => {},
        };
        const merged = mergeOrchestratorSlices(financial, parties);
        expect(merged.isFinancialCenterExpanded).toBe(true);
        expect(merged.showExtraDebtors).toBe(false);
    });
});
