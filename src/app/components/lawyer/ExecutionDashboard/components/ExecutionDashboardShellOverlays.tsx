/** Shell overlays — chunk منفصل */
import React from 'react';
import {
    ExecutionDashboardEditOverlays,
    type ExecutionDashboardEditOverlaysProps,
} from './ExecutionDashboardEditOverlays';
import {
    ExecutionDashboardNotesOverlays,
    type ExecutionDashboardNotesOverlaysProps,
} from './ExecutionDashboardNotesOverlays';
import {
    ExecutionDashboardExecutorWorkflowOverlays,
    type ExecutionDashboardExecutorWorkflowOverlaysProps,
} from './ExecutionDashboardExecutorWorkflowOverlays';
import { ExecutionDashboardHeavyModals } from './ExecutionDashboardHeavyModals';
import {
    ExecutionDashboardSolidaryEvictionOverlays,
    type ExecutionDashboardSolidaryEvictionOverlaysProps,
} from './ExecutionDashboardSolidaryEvictionOverlays';
import {
    ExecutionDashboardSeizedPropertyPortals,
    type ExecutionDashboardSeizedPropertyPortalsProps,
} from './ExecutionDashboardSeizedPropertyPortals';
import { pickSeizedPropertyPortalProps } from '../hooks/pickSeizedPropertyPortalProps';
import { pickExecutionShellOverlayProps } from '../hooks/pickExecutionShellOverlayProps';
import {
    readExecutionShellOverlayScope,
    useExecutionShellOverlayScopeRef,
} from '../hooks/executionShellOverlayScope';
import { withShellOverlayScopeFallback } from './withShellOverlayScopeFallback';
import { buildExecutionDashboardShellOverlayClosers } from './buildExecutionDashboardShellOverlayClosers';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';
import { resolveExecutionShellOverlayInstantPaint } from './resolveExecutionShellOverlayInstantPaint';

export type ExecutionDashboardShellOverlaysProps = {
    showUnifiedExecutionModal?: boolean;
    unifiedModalTab?: string | null;
    scope?: Record<string, unknown>;
    followupSnapshot?: Record<string, unknown>;
};

export function ExecutionDashboardShellOverlays({
    showUnifiedExecutionModal: _showUnifiedExecutionModal = false,
    unifiedModalTab: _unifiedModalTab = null,
    scope: scopeProp,
    followupSnapshot: _followupSnapshot,
}: ExecutionDashboardShellOverlaysProps) {
    const scopeRef = useExecutionShellOverlayScopeRef();
    const scope = withShellOverlayScopeFallback(
        scopeProp ?? readExecutionShellOverlayScope(scopeRef),
    );
    const props = pickExecutionShellOverlayProps(scope);
    const extraScope = scope as Record<string, unknown>;
    const evictionExpenseModalOpen = Boolean(extraScope.showEvictionExpenseModal);
    const setShowEvictionExpenseModal =
        typeof extraScope.setShowEvictionExpenseModal === 'function'
            ? (extraScope.setShowEvictionExpenseModal as (open: boolean) => void)
            : null;

    const merged = props;
    const closers = React.useMemo(
        () =>
            buildExecutionDashboardShellOverlayClosers(
                props as Record<string, unknown>,
                setShowEvictionExpenseModal,
            ),
        [props, setShowEvictionExpenseModal],
    );

    const showAnySeizedPropertyPortal = Boolean(
        scope.seizedPropertyStepModalOpen ||
            scope.seizedPropertyAuctionResultModalOpen ||
            scope.seizureMarkModalOpen ||
            scope.publicationModalOpen,
    );

    const showAnyOverlay = Boolean(
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
            evictionExpenseModalOpen ||
            props.showEvictionLawyerFeeModal ||
            props.showEvictionResidentialGraceModal ||
            showAnySeizedPropertyPortal,
    );

    const dismissOpenOverlay = resolveExecutionShellOverlayInstantPaint(
        scope as Record<string, unknown>,
    ).onClose;
    useExecutionOverlayDismiss(showAnyOverlay, dismissOpenOverlay);

    if (!showAnyOverlay) {
        return null;
    }

    return (
        <>
            <ExecutionDashboardEditOverlays
                {...(merged as ExecutionDashboardEditOverlaysProps)}
                onCloseExecutionTrashModal={closers.closeExecutionTrashModal}
                onCloseTimelineEditModal={closers.closeTimelineEditModal}
                onCloseEditDossierMetaModal={closers.closeEditDossierMetaModal}
                onCloseEditPartyModal={closers.closeEditPartyModal}
                onCloseHeirsQuickViewModal={closers.closeHeirsQuickViewModal}
                onClosePermanentDeleteTimelineConfirm={closers.closePermanentDeleteTimelineConfirm}
            />
            <ExecutionDashboardNotesOverlays
                {...(merged as unknown as ExecutionDashboardNotesOverlaysProps)}
                onCloseNotesModal={closers.closeNotesModal}
                onCloseAppointmentModal={closers.closeAppointmentModal}
            />
            <ExecutionDashboardExecutorWorkflowOverlays
                {...(merged as unknown as ExecutionDashboardExecutorWorkflowOverlaysProps)}
                onCloseDecisionsModal={closers.closeDecisionsModal}
            />
            <ExecutionDashboardHeavyModals
                {...merged}
                onCloseDocumentsModal={closers.closeDocumentsModal}
                onCloseRealEstateSeizureModal={closers.closeRealEstateSeizureModal}
                onCloseDecisionsModal={closers.closeDecisionsModal}
                onCloseTimelineModal={closers.closeTimelineModal}
                onCloseSeizedAssetsModal={closers.closeSeizedAssetsModal}
                onClosePaymentModal={closers.closePaymentModal}
                onCloseNotificationModal={closers.closeNotificationModal}
                onCloseCoerciveModal={closers.closeCoerciveModal}
                onCloseHeirsNotificationModal={closers.closeHeirsNotificationModal}
                onCloseGuarantorDetailsModal={closers.closeGuarantorDetailsModal}
                onCloseStayOfExecutionModal={closers.closeStayOfExecutionModal}
                onClosePartyDeathModal={closers.closePartyDeathModal}
                onClosePauseModal={closers.closePauseModal}
                onClosePaymentCalculator={closers.closePaymentCalculator}
                onCloseSettlementCalculator={closers.closeSettlementCalculator}
                onCloseLedgerModal={closers.closeLedgerModal}
                onCloseUnifiedSummonsModal={closers.closeUnifiedSummonsModal}
                onCloseAlimonyBeneficiaryDeathModal={closers.closeAlimonyBeneficiaryDeathModal}
                onCloseTransferFileNumberChangeModal={closers.closeTransferFileNumberChangeModal}
                onCloseLinkedDossierTimeline={closers.closeLinkedDossierTimeline}
            />
            <ExecutionDashboardSolidaryEvictionOverlays
                {...(merged as unknown as ExecutionDashboardSolidaryEvictionOverlaysProps)}
                onCloseSolidaryCoerciveTargetModal={closers.closeSolidaryCoerciveTargetModal}
                onCloseEvictionExpenseModal={closers.closeEvictionExpenseModal}
                onCloseEvictionLawyerFeeModal={closers.closeEvictionLawyerFeeModal}
                onCloseEvictionResidentialGraceModal={closers.closeEvictionResidentialGraceModal}
            />
            {showAnySeizedPropertyPortal ? (
                <ExecutionDashboardSeizedPropertyPortals
                    {...(pickSeizedPropertyPortalProps(
                        scope,
                    ) as unknown as ExecutionDashboardSeizedPropertyPortalsProps)}
                />
            ) : null}
        </>
    );
}
