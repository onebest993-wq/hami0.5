import { tryPopCriminalLocalOverlayBack } from './criminalLocalOverlayBackStack';
import type { UseCriminalDashboardNavigationGuardParams } from './useCriminalDashboardNavigationGuard.types';

type OverlayCloseCtx = Omit<
    UseCriminalDashboardNavigationGuardParams,
    never
>;

/**
 * Pure overlay-pop cluster: closes the top open dashboard layer and returns true if handled.
 * Local canvas overlays are tried first via the LIFO stack.
 */
export function tryCloseCriminalDashboardOverlayLayer(ctx: OverlayCloseCtx): boolean {
    if (tryPopCriminalLocalOverlayBack()) return true;
    if (ctx.confirmAction) {
        ctx.setConfirmAction(null);
        return true;
    }
    if (ctx.cassationResultContext) {
        ctx.setCassationResultContext(null);
        return true;
    }
    if (ctx.cassationAppealModal) {
        ctx.setCassationAppealModal(null);
        return true;
    }
    if (ctx.isStageFinalDecisionOpen) {
        ctx.setIsStageFinalDecisionOpen(false);
        return true;
    }
    if (ctx.verdictCassationFilingCard) {
        ctx.setVerdictCassationFilingCard(null);
        return true;
    }
    if (ctx.trialSessionAddModalOpen) {
        ctx.setTrialSessionAddModalOpen(false);
        return true;
    }
    if (ctx.quickFinalizeRequest) {
        ctx.closeQuickFinalizeModal();
        return true;
    }
    if (ctx.requestMarginModalOpen) {
        ctx.setRequestMarginModalOpen(false);
        return true;
    }
    if (ctx.isRequestsModalOpen) {
        ctx.closeRequestsModal();
        return true;
    }
    if (ctx.linkedTimelineFromProcedural) {
        ctx.setLinkedTimelineFromProcedural(null);
        return true;
    }
    if (ctx.isStatementModalOpen) {
        ctx.setIsStatementModalOpen(false);
        ctx.setEditingStatement(null);
        return true;
    }
    if (ctx.isTrialDepositionModalOpen) {
        ctx.setIsTrialDepositionModalOpen(false);
        ctx.setEditingTrialDeposition(null);
        return true;
    }
    if (ctx.isOtherEvidenceFormOpen) {
        ctx.setIsOtherEvidenceFormOpen(false);
        return true;
    }
    if (ctx.isTrashModalOpen) {
        ctx.setIsTrashModalOpen(false);
        return true;
    }
    if (ctx.isReopenCaseOpen) {
        ctx.setIsReopenCaseOpen(false);
        return true;
    }
    if (ctx.isSendToCassationOpen) {
        ctx.setIsSendToCassationOpen(false);
        return true;
    }
    if (ctx.isMergeCasesOpen) {
        ctx.setIsMergeCasesOpen(false);
        return true;
    }
    if (ctx.isStageCloserOpen) {
        ctx.setIsStageCloserOpen(false);
        return true;
    }
    if (ctx.isLegalEditOpen) {
        ctx.setIsLegalEditOpen(false);
        return true;
    }
    if (ctx.isInvestigationDecisionOpen) {
        ctx.setIsInvestigationDecisionOpen(false);
        return true;
    }
    if (ctx.isSeveranceOpen) {
        ctx.setIsSeveranceOpen(false);
        return true;
    }
    if (ctx.isInlineSeveranceFormOpen) {
        ctx.setIsInlineSeveranceFormOpen(false);
        return true;
    }
    if (ctx.identityEdit) {
        ctx.setIdentityEdit(null);
        return true;
    }
    if (ctx.forfeitureModal) {
        ctx.setForfeitureModal(null);
        return true;
    }
    if (ctx.selectedPartyFilterId) {
        ctx.setSelectedPartyFilterId('');
        return true;
    }
    if (ctx.selectedJourneyBranchId) {
        ctx.setSelectedJourneyBranchId('');
        return true;
    }
    if (ctx.selectedNodeFilter) {
        ctx.setSelectedNodeFilter('');
        return true;
    }
    if (ctx.proceduralNavTarget) {
        ctx.setProceduralNavTarget(null);
        return true;
    }
    return false;
}
