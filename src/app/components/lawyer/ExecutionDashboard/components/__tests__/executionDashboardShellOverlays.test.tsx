import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

const capturedEditOverlayProps = vi.fn();
const capturedNotesOverlayProps = vi.fn();
const capturedExecutorWorkflowOverlayProps = vi.fn();
const capturedHeavyModalProps = vi.fn();
const capturedSolidaryOverlayProps = vi.fn();

vi.mock('../ExecutionDashboardEditOverlays', () => ({
    ExecutionDashboardEditOverlays: (props: Record<string, unknown>) => {
        capturedEditOverlayProps(props);
        return <div>edit overlays mounted</div>;
    },
}));

vi.mock('../ExecutionDashboardNotesOverlays', () => ({
    ExecutionDashboardNotesOverlays: (props: Record<string, unknown>) => {
        capturedNotesOverlayProps(props);
        return <div>notes overlays mounted</div>;
    },
}));

vi.mock('../ExecutionDashboardExecutorWorkflowOverlays', () => ({
    ExecutionDashboardExecutorWorkflowOverlays: (props: Record<string, unknown>) => {
        capturedExecutorWorkflowOverlayProps(props);
        return <div>executor workflow overlays mounted</div>;
    },
}));

vi.mock('../ExecutionDashboardHeavyModals', () => ({
    ExecutionDashboardHeavyModals: (props: Record<string, unknown>) => {
        capturedHeavyModalProps(props);
        return <div>heavy modals mounted</div>;
    },
}));

vi.mock('../ExecutionDashboardSolidaryEvictionOverlays', () => ({
    ExecutionDashboardSolidaryEvictionOverlays: (props: Record<string, unknown>) => {
        capturedSolidaryOverlayProps(props);
        return <div>solidary overlays mounted</div>;
    },
}));

vi.mock('../ExecutionFollowupModalHost', () => ({
    ExecutionFollowupModalHost: () => <div>followup host mounted</div>,
}));

vi.mock('../ExecutionDashboardSeizedPropertyPortals', () => ({
    ExecutionDashboardSeizedPropertyPortals: () => <div>seized property portals mounted</div>,
}));

vi.mock('../../hooks/useExecutionFollowupModalSnapshot', () => ({
    useExecutionFollowupModalSnapshot: (_open: boolean, build: () => Record<string, unknown>) => build(),
}));

vi.mock('../../hooks/buildFollowupModalSnapshotInput', () => ({
    buildFollowupModalSnapshotInput: () => ({ unifiedModalTab: 'personal' }),
}));

vi.mock('../../hooks/pickExecutionShellOverlayProps', () => ({
    pickExecutionShellOverlayProps: (scope: Record<string, unknown>) => scope,
}));

vi.mock('../../hooks/pickSeizedPropertyPortalProps', () => ({
    pickSeizedPropertyPortalProps: (scope: Record<string, unknown>) => scope,
}));

vi.mock('../../hooks/executionShellOverlayScope', () => ({
    useExecutionShellOverlayScopeRef: () => ({ current: {} }),
    readExecutionShellOverlayScope: () => ({}),
}));

vi.mock('../../hooks/executionDashboardChunkScope', () => ({
    useExecutionDashboardChunkScopeRef: () => ({ current: {} }),
}));

import { ExecutionDashboardShellOverlays } from '../ExecutionDashboardShellOverlays';

describe('ExecutionDashboardShellOverlays', () => {
    beforeEach(() => {
        useExecutionDashboardStore.getState().closeAllModals();
        capturedEditOverlayProps.mockClear();
        capturedNotesOverlayProps.mockClear();
        capturedExecutorWorkflowOverlayProps.mockClear();
        capturedHeavyModalProps.mockClear();
        capturedSolidaryOverlayProps.mockClear();
    });

    it('does not render when there are no overlays to show', () => {
        render(
            <ExecutionDashboardShellOverlays
                scope={{}}
                showUnifiedExecutionModal={false}
                followupSnapshot={{}}
            />,
        );

        expect(screen.queryByText('edit overlays mounted')).toBeNull();
    });

    it('keeps store-backed modal fallbacks active even when stale scope flags are false', () => {
        useExecutionDashboardStore.getState().openModal('showNotesModal');

        render(
            <ExecutionDashboardShellOverlays
                scope={{
                    showNotesModal: false,
                    showAppointmentModal: false,
                }}
                showUnifiedExecutionModal={false}
                followupSnapshot={{}}
            />,
        );

        expect(screen.getByText('notes overlays mounted')).toBeTruthy();

        const notesProps =
            capturedNotesOverlayProps.mock.calls[capturedNotesOverlayProps.mock.calls.length - 1]?.[0] as
                | Record<string, unknown>
                | undefined;

        expect(notesProps?.showNotesModal).toBe(true);
        expect(notesProps?.showAppointmentModal).toBe(false);
    });

    it('builds explicit close intents for edit, notes, executor workflow, and heavy overlays', () => {
        const setShowExecutionTrashModal = vi.fn();
        const setTimelineEditDraft = vi.fn();
        const setShowEditDossierMetaModal = vi.fn();
        const setEditPartyTarget = vi.fn();
        const setPartyEditDraft = vi.fn();
        const setHeirsQuickView = vi.fn();
        const setPermanentDeleteTimelineId = vi.fn();
        const setShowNotesModal = vi.fn();
        const setShowAppointmentModal = vi.fn();
        const setShowRealEstateSeizureModal = vi.fn();
        const setRealEstateSeizureModalDecisionId = vi.fn();
        const setShowDecisionsModal = vi.fn();
        const setShowDocumentsModal = vi.fn();
        const setShowTimelineModal = vi.fn();
        const setShowSeizedAssetsModal = vi.fn();
        const setShowPaymentModal = vi.fn();
        const setShowNotificationModal = vi.fn();
        const setShowCoerciveModal = vi.fn();
        const setShowHeirsNotificationModal = vi.fn();
        const setShowPaymentCalculator = vi.fn();
        const setShowSettlementCalculator = vi.fn();
        const setShowLedgerModal = vi.fn();
        const setShowUnifiedSummonsModal = vi.fn();
        const setSummonsHubInitialMainTab = vi.fn();
        const setSummonsContextDebtorKey = vi.fn();
        const setShowSolidaryCoerciveTargetModal = vi.fn();
        const setSolidaryCoerciveActionPending = vi.fn();
        const setShowEvictionExpenseModal = vi.fn();
        const setShowEvictionLawyerFeeModal = vi.fn();
        const setShowEvictionResidentialGraceModal = vi.fn();
        const setShowGuarantorDetailsModal = vi.fn();
        const setGuarantorDetailsDecisionId = vi.fn();
        const setShowStayOfExecutionModal = vi.fn();
        const setPartyDeathModalParty = vi.fn();
        const setPartyDeathModalDecisionId = vi.fn();
        const setShowPauseModal = vi.fn();
        const setAlimonyBeneficiaryDeathModalOpen = vi.fn();
        const setAlimonyBeneficiaryDeathModalProfile = vi.fn();
        const setShowTransferFileNumberChangeModal = vi.fn();
        const setShowLinkedDossierTimeline = vi.fn();
        const setLinkedDossierToView = vi.fn();

        render(
            <ExecutionDashboardShellOverlays
                showUnifiedExecutionModal={false}
                followupSnapshot={{}}
                scope={{
                    showExecutionTrashModal: true,
                    setShowExecutionTrashModal,
                    timelineEditDraft: { id: 't-1' },
                    setTimelineEditDraft,
                    showEditDossierMetaModal: true,
                    setShowEditDossierMetaModal,
                    editPartyTarget: { id: 'p-1' },
                    setEditPartyTarget,
                    setPartyEditDraft,
                    heirsQuickView: { id: 'h-1' },
                    setHeirsQuickView,
                    permanentDeleteTimelineId: 't-1',
                    setPermanentDeleteTimelineId,
                    showNotesModal: true,
                    setShowNotesModal,
                    showAppointmentModal: true,
                    setShowAppointmentModal,
                    executionReportPrompt: { onConfirm: vi.fn() },
                    showRealEstateSeizureModal: true,
                    setShowRealEstateSeizureModal,
                    setRealEstateSeizureModalDecisionId,
                    showDecisionsModal: true,
                    setShowDecisionsModal,
                    showDocumentsModal: true,
                    setShowDocumentsModal,
                    showTimelineModal: true,
                    setShowTimelineModal,
                    showSeizedAssetsModal: true,
                    setShowSeizedAssetsModal,
                    showPaymentModal: true,
                    setShowPaymentModal,
                    showNotificationModal: true,
                    setShowNotificationModal,
                    showCoerciveModal: true,
                    setShowCoerciveModal,
                    showHeirsNotificationModal: true,
                    setShowHeirsNotificationModal,
                    showPaymentCalculator: true,
                    setShowPaymentCalculator,
                    showSettlementCalculator: true,
                    setShowSettlementCalculator,
                    showGuarantorDetailsModal: true,
                    setShowGuarantorDetailsModal,
                    setGuarantorDetailsDecisionId,
                    showStayOfExecutionModal: true,
                    setShowStayOfExecutionModal,
                    showLedgerModal: true,
                    setShowLedgerModal,
                    showUnifiedSummonsModal: true,
                    setShowUnifiedSummonsModal,
                    setSummonsHubInitialMainTab,
                    setSummonsContextDebtorKey,
                    showSolidaryCoerciveTargetModal: true,
                    setShowSolidaryCoerciveTargetModal,
                    setSolidaryCoerciveActionPending,
                    showEvictionExpenseModal: true,
                    setShowEvictionExpenseModal,
                    showEvictionLawyerFeeModal: true,
                    setShowEvictionLawyerFeeModal,
                    showEvictionResidentialGraceModal: true,
                    setShowEvictionResidentialGraceModal,
                    partyDeathModalParty: 'debtor',
                    setPartyDeathModalParty,
                    setPartyDeathModalDecisionId,
                    showPauseModal: true,
                    setShowPauseModal,
                    alimonyBeneficiaryDeathModalOpen: true,
                    setAlimonyBeneficiaryDeathModalOpen,
                    setAlimonyBeneficiaryDeathModalProfile,
                    showTransferFileNumberChangeModal: true,
                    setShowTransferFileNumberChangeModal,
                    showLinkedDossierTimeline: true,
                    linkedDossierToView: { id: 'ld-1' },
                    setShowLinkedDossierTimeline,
                    setLinkedDossierToView,
                }}
            />,
        );

        expect(screen.getByText('edit overlays mounted')).toBeTruthy();
        expect(screen.getByText('notes overlays mounted')).toBeTruthy();
        expect(screen.getByText('executor workflow overlays mounted')).toBeTruthy();
        expect(screen.getByText('heavy modals mounted')).toBeTruthy();

        const editProps = capturedEditOverlayProps.mock.calls[capturedEditOverlayProps.mock.calls.length - 1]?.[0] as Record<string, unknown>;
        const notesProps = capturedNotesOverlayProps.mock.calls[capturedNotesOverlayProps.mock.calls.length - 1]?.[0] as Record<string, unknown>;
        const executorProps =
            capturedExecutorWorkflowOverlayProps.mock.calls[capturedExecutorWorkflowOverlayProps.mock.calls.length - 1]?.[0] as Record<string, unknown>;
        const heavyProps = capturedHeavyModalProps.mock.calls[capturedHeavyModalProps.mock.calls.length - 1]?.[0] as Record<string, unknown>;
        const solidaryProps =
            capturedSolidaryOverlayProps.mock.calls[capturedSolidaryOverlayProps.mock.calls.length - 1]?.[0] as Record<string, unknown>;

        (editProps.onCloseExecutionTrashModal as () => void)();
        (editProps.onCloseTimelineEditModal as () => void)();
        (editProps.onCloseEditDossierMetaModal as () => void)();
        (editProps.onCloseEditPartyModal as () => void)();
        (editProps.onCloseHeirsQuickViewModal as () => void)();
        (editProps.onClosePermanentDeleteTimelineConfirm as () => void)();
        (notesProps.onCloseNotesModal as () => void)();
        (notesProps.onCloseAppointmentModal as () => void)();
        (executorProps.onCloseDecisionsModal as () => void)();
        (heavyProps.onCloseDocumentsModal as () => void)();
        (heavyProps.onCloseRealEstateSeizureModal as () => void)();
        (heavyProps.onCloseTimelineModal as () => void)();
        (heavyProps.onCloseSeizedAssetsModal as () => void)();
        (heavyProps.onClosePaymentModal as () => void)();
        (heavyProps.onCloseNotificationModal as () => void)();
        (heavyProps.onCloseCoerciveModal as () => void)();
        (heavyProps.onCloseHeirsNotificationModal as () => void)();
        (heavyProps.onCloseGuarantorDetailsModal as () => void)();
        (heavyProps.onCloseStayOfExecutionModal as () => void)();
        (heavyProps.onClosePartyDeathModal as () => void)();
        (heavyProps.onClosePauseModal as () => void)();
        (heavyProps.onClosePaymentCalculator as () => void)();
        (heavyProps.onCloseSettlementCalculator as () => void)();
        (heavyProps.onCloseLedgerModal as () => void)();
        (heavyProps.onCloseUnifiedSummonsModal as () => void)();
        (heavyProps.onCloseAlimonyBeneficiaryDeathModal as () => void)();
        (heavyProps.onCloseTransferFileNumberChangeModal as () => void)();
        (heavyProps.onCloseLinkedDossierTimeline as () => void)();
        (solidaryProps.onCloseSolidaryCoerciveTargetModal as () => void)();
        (solidaryProps.onCloseEvictionExpenseModal as () => void)();
        (solidaryProps.onCloseEvictionLawyerFeeModal as () => void)();
        (solidaryProps.onCloseEvictionResidentialGraceModal as () => void)();

        expect(setShowExecutionTrashModal).toHaveBeenCalledWith(false);
        expect(setTimelineEditDraft).toHaveBeenCalledWith(null);
        expect(setShowEditDossierMetaModal).toHaveBeenCalledWith(false);
        expect(setEditPartyTarget).toHaveBeenCalledWith(null);
        expect(setPartyEditDraft).toHaveBeenCalledWith(null);
        expect(setHeirsQuickView).toHaveBeenCalledWith(null);
        expect(setPermanentDeleteTimelineId).toHaveBeenCalledWith(null);
        expect(setShowNotesModal).toHaveBeenCalledWith(false);
        expect(setShowAppointmentModal).toHaveBeenCalledWith(false);
        expect(setShowDecisionsModal).toHaveBeenCalledWith(false);
        expect(setShowDocumentsModal).toHaveBeenCalledWith(false);
        expect(setShowRealEstateSeizureModal).toHaveBeenCalledWith(false);
        expect(setRealEstateSeizureModalDecisionId).toHaveBeenCalledWith(null);
        expect(setShowTimelineModal).toHaveBeenCalledWith(false);
        expect(setShowSeizedAssetsModal).toHaveBeenCalledWith(false);
        expect(setShowPaymentModal).toHaveBeenCalledWith(false);
        expect(setShowNotificationModal).toHaveBeenCalledWith(false);
        expect(setShowCoerciveModal).toHaveBeenCalledWith(false);
        expect(setShowHeirsNotificationModal).toHaveBeenCalledWith(false);
        expect(setShowGuarantorDetailsModal).toHaveBeenCalledWith(false);
        expect(setGuarantorDetailsDecisionId).toHaveBeenCalledWith(null);
        expect(setShowStayOfExecutionModal).toHaveBeenCalledWith(false);
        expect(setShowPaymentCalculator).toHaveBeenCalledWith(false);
        expect(setShowSettlementCalculator).toHaveBeenCalledWith(false);
        expect(setShowLedgerModal).toHaveBeenCalledWith(false);
        expect(setSummonsHubInitialMainTab).toHaveBeenCalledWith(null);
        expect(setSummonsContextDebtorKey).toHaveBeenCalledWith(null);
        expect(setShowUnifiedSummonsModal).toHaveBeenCalledWith(false);
        expect(setShowSolidaryCoerciveTargetModal).toHaveBeenCalledWith(false);
        expect(setSolidaryCoerciveActionPending).toHaveBeenCalledWith(null);
        expect(setShowEvictionExpenseModal).toHaveBeenCalledWith(false);
        expect(setShowEvictionLawyerFeeModal).toHaveBeenCalledWith(false);
        expect(setShowEvictionResidentialGraceModal).toHaveBeenCalledWith(false);
        expect(setPartyDeathModalParty).toHaveBeenCalledWith(null);
        expect(setPartyDeathModalDecisionId).toHaveBeenCalledWith(null);
        expect(setShowPauseModal).toHaveBeenCalledWith(false);
        expect(setAlimonyBeneficiaryDeathModalOpen).toHaveBeenCalledWith(false);
        expect(setAlimonyBeneficiaryDeathModalProfile).toHaveBeenCalledWith(null);
        expect(setShowTransferFileNumberChangeModal).toHaveBeenCalledWith(false);
        expect(setShowLinkedDossierTimeline).toHaveBeenCalledWith(false);
        expect(setLinkedDossierToView).toHaveBeenCalledWith(null);
    });
});
