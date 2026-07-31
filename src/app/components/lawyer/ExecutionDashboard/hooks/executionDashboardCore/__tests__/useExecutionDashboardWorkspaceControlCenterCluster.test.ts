import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardWorkspaceControlCenterCluster } from '../useExecutionDashboardWorkspaceControlCenterCluster';

const getPersonalCoerciveSubtypeOutcomeMock = vi.fn();
const useToastSystemMock = vi.fn();
const useExecutionDecisionsOrchestratorMock = vi.fn();
const useExecutionFinancialOrchestratorMock = vi.fn();
const useThirdPartySeizuresUiMock = vi.fn();
const useExecutionDashboardOpenDecisionsModalBridgeMock = vi.fn();
const useSeizureApprovalToastMock = vi.fn();
const useExecutionDashboardPerformanceMonitorMock = vi.fn();
const useExecutionDecisionOutcomeToastBridgeMock = vi.fn();
const useExecutionToastBridgeMock = vi.fn();

vi.mock('@/app/utils/executorDecisionReadQueries', () => ({
    getPersonalCoerciveSubtypeOutcome: (...args: unknown[]) =>
        getPersonalCoerciveSubtypeOutcomeMock(...args),
}));

vi.mock('../../useToastSystem', () => ({
    useToastSystem: (...args: unknown[]) => useToastSystemMock(...args),
}));

vi.mock('../../../orchestrators/useExecutionDecisionsOrchestrator', () => ({
    useExecutionDecisionsOrchestrator: (...args: unknown[]) =>
        useExecutionDecisionsOrchestratorMock(...args),
}));

vi.mock('../../../orchestrators/useExecutionFinancialOrchestrator', () => ({
    useExecutionFinancialOrchestrator: (...args: unknown[]) =>
        useExecutionFinancialOrchestratorMock(...args),
}));

vi.mock('../../useThirdPartySeizuresUi', () => ({
    useThirdPartySeizuresUi: (...args: unknown[]) => useThirdPartySeizuresUiMock(...args),
}));

vi.mock('../useExecutionDashboardOpenDecisionsModalBridge', () => ({
    useExecutionDashboardOpenDecisionsModalBridge: (...args: unknown[]) =>
        useExecutionDashboardOpenDecisionsModalBridgeMock(...args),
}));

vi.mock('../../useSeizureApprovalToast', () => ({
    useSeizureApprovalToast: (...args: unknown[]) => useSeizureApprovalToastMock(...args),
}));

vi.mock('../useExecutionDashboardRuntimeSyncEffects', () => ({
    useExecutionDashboardPerformanceMonitor: (...args: unknown[]) =>
        useExecutionDashboardPerformanceMonitorMock(...args),
}));

vi.mock('../../useExecutionDashboardWindowBridge', () => ({
    useExecutionDecisionOutcomeToastBridge: (...args: unknown[]) =>
        useExecutionDecisionOutcomeToastBridgeMock(...args),
    useExecutionToastBridge: (...args: unknown[]) => useExecutionToastBridgeMock(...args),
}));

describe('useExecutionDashboardWorkspaceControlCenterCluster', () => {
    it('wires decisions, toasts, and financial hub bridges through the control center cluster', () => {
        const showToast = vi.fn();
        const hideToast = vi.fn();
        const showToastRef = { current: showToast };
        useToastSystemMock.mockReturnValue({
            toastVisible: true,
            toastMessage: 'saved',
            toastType: 'success',
            toastEpoch: 3,
            showToast,
            hideToast,
            showToastRef,
        });

        const decisionsOrchestrator = {
            decisionsReloadEpoch: 4,
            setDecisionsReloadEpoch: vi.fn(),
            decisionsModalBootHubTab: 'hub',
            setDecisionsModalBootHubTab: vi.fn(),
            decisionsModalBootListTab: 'list',
            setDecisionsModalBootListTab: vi.fn(),
            decisionsModalScrollToDecisionId: 'd-1',
            setDecisionsModalScrollToDecisionId: vi.fn(),
            appealsModalScrollToDecisionId: 'a-1',
            setAppealsModalScrollToDecisionId: vi.fn(),
            clearDecisionsModalBootState: vi.fn(),
            openDecisionsModalWithBoot: vi.fn(),
        };
        const financialOrchestrator = {
            isFinancialCenterExpanded: true,
            setIsFinancialCenterExpanded: vi.fn(),
            activeFinancialTab: 'ledger',
            setActiveFinancialTab: vi.fn(),
            showExecutionFinancialHub: true,
            setShowExecutionFinancialHub: vi.fn(),
            financialHubAutoOpenMode: 'ledger',
            setFinancialHubAutoOpenMode: vi.fn(),
            financialHubSeizedMovableId: 'mov-1',
            setFinancialHubSeizedMovableId: vi.fn(),
            financialHubSeizedPropertyId: 'prop-1',
            setFinancialHubSeizedPropertyId: vi.fn(),
            openFinancialHubLedger: vi.fn(),
        };
        const thirdPartySeizuresUi = {
            rows: [{ id: 'tp-1' }],
        };

        useExecutionDecisionsOrchestratorMock.mockReturnValue(decisionsOrchestrator);
        useExecutionFinancialOrchestratorMock.mockReturnValue(financialOrchestrator);
        useThirdPartySeizuresUiMock.mockReturnValue({
            thirdPartySeizuresUi,
            setThirdPartySeizuresUi: vi.fn(),
            applyThirdPartySeizuresFromPatch: vi.fn(),
        });
        getPersonalCoerciveSubtypeOutcomeMock.mockReturnValue({
            approved: true,
        });

        const followupOrchestrator = {
            showUnifiedExecutionModalRef: { current: false },
            setShowUnifiedExecutionModal: vi.fn(),
        };
        const setShowUnifiedSummonsModal = vi.fn();

        const executionData = {
            id: 'exec-1',
            forced_bring_in_personal_outcome: 'pending',
            executionFeeAdded: true,
            executionFeeInjected: true,
            isPaused: true,
            pauseReason: 'reason',
        };

        const { result } = renderHook(() =>
            useExecutionDashboardWorkspaceControlCenterCluster({
                p: {
                    modals: {
                        showUnifiedExecutionModal: false,
                        showUnifiedSummonsModal: false,
                        showLedgerModal: false,
                    },
                    executionData: executionData as never,
                    executionDataRef: { current: executionData } as never,
                    executionFileKey: 'file-key',
                    executionDashboardFileId: 'dashboard-file-1',
                    executionId: 'exec-1',
                    decisionsStorageExecutionId: 'decisions-1',
                    executionStorageTick: 0,
                    setExecutionModal: vi.fn(),
                    showDecisionsModal: false,
                    setShowDecisionsModal: vi.fn(),
                    setShowNotesModal: vi.fn(),
                    setShowDocumentsModal: vi.fn(),
                    setShowAppointmentModal: vi.fn(),
                    setShowTimelineModal: vi.fn(),
                    setShowNotificationModal: vi.fn(),
                    setShowCoerciveModal: vi.fn(),
                    subFiles: [],
                    activeSubFileId: null,
                    isInabaActive: false,
                    parentDossierId: 'parent-1',
                } as never,
                followupOrchestrator,
                setShowUnifiedSummonsModal,
            }),
        );

        expect(useExecutionFinancialOrchestratorMock).toHaveBeenCalledWith({
            setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        });
        expect(useExecutionDecisionOutcomeToastBridgeMock).toHaveBeenCalledWith({
            executionDataId: 'exec-1',
            executionId: 'exec-1',
            decisionsStorageExecutionId: 'decisions-1',
            showUnifiedExecutionModalRef: followupOrchestrator.showUnifiedExecutionModalRef,
            showToastRef,
        });
        expect(useExecutionDashboardOpenDecisionsModalBridgeMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionDataId: 'exec-1',
                executionId: 'exec-1',
                setShowUnifiedSummonsModal,
                openDecisionsModalWithBoot: decisionsOrchestrator.openDecisionsModalWithBoot,
            }),
        );
        expect(useSeizureApprovalToastMock).toHaveBeenCalledWith({
            executionDataId: 'exec-1',
            executionId: 'exec-1',
            showToast,
        });
        expect(result.current.decisionsOrchestrator).toBe(decisionsOrchestrator);
        expect(result.current.financialOrchestrator).toBe(financialOrchestrator);
        expect(result.current.showToast).toBe(showToast);
        expect(result.current.employeeForcedBringAwaitingPersonalOutcome).toBe(true);
        expect(result.current.thirdPartySeizuresUi).toBe(thirdPartySeizuresUi);
    });
});
