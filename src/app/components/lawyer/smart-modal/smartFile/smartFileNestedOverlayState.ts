import type { SmartFileModalsPortalProps } from '../layout/portal/smartFileModalsPortalTypes';

/** هل توجد طبقة متداخلة مفتوحة فوق غلاف الإضبارة؟ — يمنع Escape من إغلاق الإضبارة كاملة */
export function isSmartFileNestedOverlayOpen(portal: SmartFileModalsPortalProps): boolean {
    if (portal.isActionsMenuOpen || portal.isTrashOpen) return true;
    if (portal.showExtraordinaryAppealModal) return true;
    if (portal.showMaterialErrorModal) return true;

    return (
        portal.showEditInfoModal ||
        portal.showTaskModal ||
        portal.showDocModal ||
        portal.showNoteModal ||
        portal.showPaymentModal ||
        portal.showIncidentalModal ||
        portal.showFastTrackModal ||
        portal.showAttachmentModal ||
        portal.showApptModal ||
        portal.showPauseModal ||
        portal.showInterruptionModal ||
        portal.showResumeInterruptionModal ||
        portal.showInterlocutoryModal ||
        portal.showObjectionRegistrationModal ||
        portal.showObjectionJudgmentModal ||
        portal.showAbsentJudgmentNotificationModal ||
        portal.showOpponentAbsentObjectionModal ||
        portal.showJudgmentModal ||
        portal.showAppealModal ||
        portal.showAppealTransitionModal ||
        portal.showCrossAppealModal ||
        portal.showProvisionalOrderModal ||
        portal.showNotificationModal ||
        portal.showJudgeRecusalModal ||
        portal.showTransferJurisdictionModal ||
        portal.showCaseConsolidationModal ||
        portal.showCaseLinkModal ||
        portal.showCorrespondenceModal
    );
}
