// @ts-nocheck
/** Shell overlays — chunk منفصل */
import React from 'react';
import { ExecutionDashboardEditOverlays } from './ExecutionDashboardEditOverlays';
import { ExecutionDashboardNotesOverlays } from './ExecutionDashboardNotesOverlays';
import { ExecutionDashboardExecutorWorkflowOverlays } from './ExecutionDashboardExecutorWorkflowOverlays';
import { ExecutionDashboardHeavyModals } from './ExecutionDashboardHeavyModals';
import { ExecutionDashboardSolidaryEvictionOverlays } from './ExecutionDashboardSolidaryEvictionOverlays';
import { ExecutionFollowupModalHost } from './ExecutionFollowupModalHost';
import { ExecutionDashboardSeizedPropertyPortals } from './ExecutionDashboardSeizedPropertyPortals';
import { pickSeizedPropertyPortalProps } from '../hooks/pickSeizedPropertyPortalProps';
import { pickExecutionShellOverlayProps } from '../hooks/pickExecutionShellOverlayProps';
import { buildFollowupModalSnapshotInput } from '../hooks/buildFollowupModalSnapshotInput';
import { useExecutionFollowupModalSnapshot } from '../hooks/useExecutionFollowupModalSnapshot';
import {
    readExecutionShellOverlayScope,
    useExecutionShellOverlayScopeRef,
} from '../hooks/executionShellOverlayScope';

export type ExecutionDashboardShellOverlaysProps = {
    showUnifiedExecutionModal?: boolean;
};

export function ExecutionDashboardShellOverlays({
    showUnifiedExecutionModal = false,
}: ExecutionDashboardShellOverlaysProps) {
    const scopeRef = useExecutionShellOverlayScopeRef();
    const scope = readExecutionShellOverlayScope(scopeRef);
    const props = pickExecutionShellOverlayProps(scope);

    const followupSnapshot = useExecutionFollowupModalSnapshot(
        showUnifiedExecutionModal,
        () => buildFollowupModalSnapshotInput(scope),
    );

    const merged = {
        ...props,
        executionFollowupModalSnapshot: followupSnapshot,
    };

    const showAnySeizedPropertyPortal = Boolean(
        scope.seizedPropertyStepModalOpen ||
            scope.seizedPropertyAuctionResultModalOpen ||
            scope.seizureMarkModalOpen ||
            scope.publicationModalOpen,
    );

    const showAnyOverlay = Boolean(
        showUnifiedExecutionModal ||
            props.showExecutionTrashModal ||
            props.timelineEditDraft ||
            props.showEditDossierMetaModal ||
            props.editPartyTarget ||
            props.heirsQuickView ||
            props.permanentDeleteTimelineId ||
            props.showNotesModal ||
            props.showAppointmentModal ||
            props.executorScheduleModalOpen ||
            props.policeAssistanceModalOpen ||
            props.breakInventoryFurnitureModalOpen ||
            props.judicialCustodianModalOpen ||
            props.executionReportPrompt ||
            props.showDocumentsModal ||
            props.showRealEstateSeizureModal ||
            props.showDecisionsModal ||
            props.showSeizedAssetsModal ||
            props.showPaymentModal ||
            props.showTimelineModal ||
            props.showNotificationModal ||
            props.showCoerciveModal ||
            props.showHeirsNotificationModal ||
            props.showGuarantorDetailsModal ||
            props.showStayOfExecutionModal ||
            props.partyDeathModalParty ||
            props.showPauseModal ||
            props.alimonyBeneficiaryDeathModalOpen ||
            props.showUnifiedSummonsModal ||
            props.showPaymentCalculator ||
            props.showSettlementCalculator ||
            props.showLedgerModal ||
            props.showTransferFileNumberChangeModal ||
            (props.showLinkedDossierTimeline && props.linkedDossierToView) ||
            props.showSolidaryCoerciveTargetModal ||
            props.showEvictionExpenseModal ||
            props.showEvictionLawyerFeeModal ||
            props.showEvictionResidentialGraceModal ||
            showAnySeizedPropertyPortal,
    );

    if (!showAnyOverlay) {
        return null;
    }

    return (
        <>
            <ExecutionDashboardEditOverlays {...merged} />
            <ExecutionDashboardNotesOverlays {...merged} />
            <ExecutionDashboardExecutorWorkflowOverlays {...merged} />
            <ExecutionDashboardHeavyModals {...merged} />
            <ExecutionFollowupModalHost
                open={showUnifiedExecutionModal}
                snapshot={followupSnapshot}
            />
            <ExecutionDashboardSolidaryEvictionOverlays {...merged} />
            {showAnySeizedPropertyPortal ? (
                <ExecutionDashboardSeizedPropertyPortals {...pickSeizedPropertyPortalProps(scope)} />
            ) : null}
        </>
    );
}
