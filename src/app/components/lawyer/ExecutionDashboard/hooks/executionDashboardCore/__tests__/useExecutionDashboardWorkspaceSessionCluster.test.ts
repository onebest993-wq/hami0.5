import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExecutionDashboardWorkspaceSessionCluster } from '../useExecutionDashboardWorkspaceSessionCluster';

const useTodayYmdMock = vi.fn();
const useExecutionFollowupOrchestratorMock = vi.fn();
const useExecutionCoercionOrchestratorMock = vi.fn();
const useExecutionDossierLifecyclePanelOrchestratorMock = vi.fn();
const useExecutionDashboardDebtorTabResetOnFileChangeMock = vi.fn();
const useExecutionDashboardSummonsPopoverEscapeCloseMock = vi.fn();
const useExecutionDashboardExecutionPausedSyncMock = vi.fn();
const useExecutionDashboardSpecialRequestTemplateMenuDismissMock = vi.fn();
const useExecutionDashboardPaidClientFeesSyncMock = vi.fn();
const useExecutionDashboardDossierLifecycleDraftSyncMock = vi.fn();

vi.mock('../../useTodayYmd', () => ({
    useTodayYmd: (...args: unknown[]) => useTodayYmdMock(...args),
}));

vi.mock('../../../orchestrators/useExecutionFollowupOrchestrator', () => ({
    useExecutionFollowupOrchestrator: (...args: unknown[]) =>
        useExecutionFollowupOrchestratorMock(...args),
}));

vi.mock('../../../orchestrators/useExecutionCoercionOrchestrator', () => ({
    useExecutionCoercionOrchestrator: (...args: unknown[]) =>
        useExecutionCoercionOrchestratorMock(...args),
}));

vi.mock('../../../orchestrators/useExecutionDossierLifecyclePanelOrchestrator', () => ({
    useExecutionDossierLifecyclePanelOrchestrator: (...args: unknown[]) =>
        useExecutionDossierLifecyclePanelOrchestratorMock(...args),
}));

vi.mock('../useExecutionDashboardRuntimeSyncEffects', () => ({
    useExecutionDashboardDebtorTabResetOnFileChange: (...args: unknown[]) =>
        useExecutionDashboardDebtorTabResetOnFileChangeMock(...args),
    useExecutionDashboardSummonsPopoverEscapeClose: (...args: unknown[]) =>
        useExecutionDashboardSummonsPopoverEscapeCloseMock(...args),
    useExecutionDashboardExecutionPausedSync: (...args: unknown[]) =>
        useExecutionDashboardExecutionPausedSyncMock(...args),
    useExecutionDashboardSpecialRequestTemplateMenuDismiss: (...args: unknown[]) =>
        useExecutionDashboardSpecialRequestTemplateMenuDismissMock(...args),
    useExecutionDashboardPaidClientFeesSync: (...args: unknown[]) =>
        useExecutionDashboardPaidClientFeesSyncMock(...args),
    useExecutionDashboardDossierLifecycleDraftSync: (...args: unknown[]) =>
        useExecutionDashboardDossierLifecycleDraftSyncMock(...args),
}));

describe('useExecutionDashboardWorkspaceSessionCluster', () => {
    it('wires followup, coercion, and unified summons controls through the session cluster', () => {
        useTodayYmdMock.mockReturnValue('2026-07-11');

        const setExecutionDebtorTabIndex = vi.fn();
        const followupOrchestrator = {
            setExecutionDebtorTabIndex,
            specialRequestTemplateMenuOpen: true,
            specialRequestTemplateMenuRef: { current: null },
            setSpecialRequestTemplateMenuOpen: vi.fn(),
            showUnifiedExecutionModalRef: { current: false },
            setShowUnifiedExecutionModal: vi.fn(),
        };
        const coercionOrchestrator = {
            setActiveNoticeState: vi.fn(),
        };
        const dossierLifecyclePanel = {
            setDossierStatusDraft: vi.fn(),
            setDossierReasonDraft: vi.fn(),
            setDossierDateDraft: vi.fn(),
        };

        useExecutionFollowupOrchestratorMock.mockReturnValue(followupOrchestrator);
        useExecutionCoercionOrchestratorMock.mockReturnValue(coercionOrchestrator);
        useExecutionDossierLifecyclePanelOrchestratorMock.mockReturnValue(dossierLifecyclePanel);

        const setExecutionModal = vi.fn();
        const executionData = {
            id: 'exec-file-1',
            forcedAttendanceIssued: true,
            debtorEvaded: true,
            arrestWarrantUnlocked: true,
            creditorAttended: false,
            executionPaused: true,
            gracePeriodActive: false,
            gracePeriodEnded: true,
            notificationCount: 2,
            lastActionDate: '2026-07-01',
            paidClientFees: 12,
        };

        const { result } = renderHook(() =>
            useExecutionDashboardWorkspaceSessionCluster({
                modals: {
                    showUnifiedExecutionModal: true,
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
                setExecutionModal,
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
            } as never),
        );

        act(() => {
            result.current.setShowUnifiedSummonsModal(true);
        });

        expect(useTodayYmdMock).toHaveBeenCalled();
        expect(useExecutionFollowupOrchestratorMock).toHaveBeenCalledWith({
            showUnifiedExecutionModal: true,
            executionData,
            setExecutionModal,
            executionDashboardFileId: 'dashboard-file-1',
        });
        expect(useExecutionCoercionOrchestratorMock).toHaveBeenCalledWith('file-key', executionData);
        expect(useExecutionDashboardDebtorTabResetOnFileChangeMock).toHaveBeenCalledWith(
            'exec-file-1',
            setExecutionDebtorTabIndex,
        );
        expect(useExecutionDashboardSpecialRequestTemplateMenuDismissMock).toHaveBeenCalledWith(
            true,
            followupOrchestrator.specialRequestTemplateMenuRef,
            followupOrchestrator.setSpecialRequestTemplateMenuOpen,
        );
        expect(useExecutionDashboardDossierLifecycleDraftSyncMock).toHaveBeenCalledWith({
            executionData,
            setDossierStatusDraft: dossierLifecyclePanel.setDossierStatusDraft,
            setDossierReasonDraft: dossierLifecyclePanel.setDossierReasonDraft,
            setDossierDateDraft: dossierLifecyclePanel.setDossierDateDraft,
        });
        expect(setExecutionModal).toHaveBeenCalledWith('showUnifiedSummonsModal', true);
        expect(result.current.todayYmd).toBe('2026-07-11');
        expect(result.current.followupOrchestrator).toBe(followupOrchestrator);
        expect(result.current.coercionOrchestrator).toBe(coercionOrchestrator);
        expect(result.current.creditorAttended).toBe(false);
        // انحدار setPaidDebt is not a function — يجب أن يمرّ المُعدِّل عبر حقيبة الجلسة
        expect(typeof result.current.setPaidDebt).toBe('function');
    });
});
