/** Close handlers injected by ExecutionDashboardShellOverlays — not chunk-scope registry keys */
export const EXECUTION_SHELL_EXPLICIT_CLOSE_PROPS = new Set([
    'onCloseAlimonyBeneficiaryDeathModal',
    'onCloseAppointmentModal',
    'onCloseCoerciveModal',
    'onCloseDecisionsModal',
    'onCloseDocumentsModal',
    'onCloseEditDossierMetaModal',
    'onCloseEditPartyModal',
    'onCloseEvictionExpenseModal',
    'onCloseEvictionLawyerFeeModal',
    'onCloseEvictionResidentialGraceModal',
    'onCloseExecutionTrashModal',
    'onCloseGuarantorDetailsModal',
    'onCloseHeirsNotificationModal',
    'onCloseHeirsQuickViewModal',
    'onCloseLedgerModal',
    'onCloseLinkedDossierTimeline',
    'onCloseNotesModal',
    'onCloseNotificationModal',
    'onClosePartyDeathModal',
    'onClosePauseModal',
    'onClosePaymentCalculator',
    'onClosePaymentModal',
    'onClosePermanentDeleteTimelineConfirm',
    'onCloseRealEstateSeizureModal',
    'onCloseSeizedAssetsModal',
    'onCloseSettlementCalculator',
    'onCloseSolidaryCoerciveTargetModal',
    'onCloseStayOfExecutionModal',
    'onCloseTimelineEditModal',
    'onCloseTimelineModal',
    'onCloseTransferFileNumberChangeModal',
    'onCloseUnifiedSummonsModal',
]);

export function isExecutionShellExplicitCloseProp(key) {
    return EXECUTION_SHELL_EXPLICIT_CLOSE_PROPS.has(key);
}
