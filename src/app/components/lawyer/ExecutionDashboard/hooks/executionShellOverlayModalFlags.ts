/** أعلام نوافذ shell overlays — النوع المشترك لبوابات الـ lazy chunks. */
export type ExecutionShellOverlayModalFlags = {
    showUnifiedExecutionModal?: boolean;
    showDecisionsModal?: boolean;
    showDocumentsModal?: boolean;
    showTimelineModal?: boolean;
    showCoerciveModal?: boolean;
    showNotificationModal?: boolean;
    showUnifiedSummonsModal?: boolean;
    showPaymentModal?: boolean;
    showSeizedAssetsModal?: boolean;
    showNotesModal?: boolean;
    showAppointmentModal?: boolean;
    showEditDossierMetaModal?: boolean;
    showLedgerModal?: boolean;
    showPauseModal?: boolean;
    showPaymentCalculator?: boolean;
    showSettlementCalculator?: boolean;
    showExecutionTrashModal?: boolean;
    showGuarantorDetailsModal?: boolean;
    showHeirsNotificationModal?: boolean;
    showTransferFileNumberChangeModal?: boolean;
    showRealEstateSeizureModal?: boolean;
    showEvictionExpenseModal?: boolean;
    showEvictionLawyerFeeModal?: boolean;
    showEvictionResidentialGraceModal?: boolean;
    showSolidaryCoerciveTargetModal?: boolean;
    showStayOfExecutionModal?: boolean;
    showLinkedDossierTimeline?: boolean;
};

export function isExecutionFollowupOverlayUrgent(
    modals: ExecutionShellOverlayModalFlags,
): boolean {
    return Boolean(modals.showUnifiedExecutionModal);
}

/** نوافذ البرميل السمين — بلا محضر المتابعة (مساره مستقل). */
export function isExecutionOtherShellOverlayUrgent(
    modals: ExecutionShellOverlayModalFlags,
): boolean {
    return Boolean(
        modals.showDecisionsModal ||
            modals.showDocumentsModal ||
            modals.showTimelineModal ||
            modals.showCoerciveModal ||
            modals.showNotificationModal ||
            modals.showUnifiedSummonsModal ||
            modals.showPaymentModal ||
            modals.showSeizedAssetsModal ||
            modals.showNotesModal ||
            modals.showAppointmentModal ||
            modals.showEditDossierMetaModal ||
            modals.showLedgerModal ||
            modals.showPauseModal ||
            modals.showPaymentCalculator ||
            modals.showSettlementCalculator ||
            modals.showExecutionTrashModal ||
            modals.showGuarantorDetailsModal ||
            modals.showHeirsNotificationModal ||
            modals.showTransferFileNumberChangeModal ||
            modals.showRealEstateSeizureModal ||
            modals.showEvictionExpenseModal ||
            modals.showEvictionLawyerFeeModal ||
            modals.showEvictionResidentialGraceModal ||
            modals.showSolidaryCoerciveTargetModal ||
            modals.showStayOfExecutionModal ||
            modals.showLinkedDossierTimeline,
    );
}

export function isExecutionAnyOverlayUrgent(
    modals: ExecutionShellOverlayModalFlags,
): boolean {
    return isExecutionFollowupOverlayUrgent(modals) || isExecutionOtherShellOverlayUrgent(modals);
}
