import type { VerdictCard } from './verdictCardsEngine';
import type { ConfirmActionState } from './criminalDashboardModalsHostProps';
import type { BailForfeitureModalState } from './components/BailForfeitureModal';
import type { CriminalDecisionsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';
import type { CriminalStageCloserOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';

export function computeCriminalDashboardForceModalsHost(input: {
    isInvestigationDecisionOpen: boolean;
    isSeveranceOpen: boolean;
    isInlineSeveranceFormOpen: boolean;
    isStatementModalOpen: boolean;
    isOtherEvidenceFormOpen: boolean;
    isTrialDepositionModalOpen: boolean;
    isTrashModalOpen: boolean;
    isReopenCaseOpen: boolean;
    isSendToCassationOpen: boolean;
    isMergeCasesOpen: boolean;
    isStageFinalDecisionOpen: boolean;
    isLegalEditOpen: boolean;
    isRequestsModalOpen: boolean;
    requestMarginModalOpen: boolean;
    stageCloserOrchestrator: CriminalStageCloserOrchestratorSlice;
    confirmAction: ConfirmActionState | null;
    forfeitureModal: BailForfeitureModalState | null;
    cassationAppealModal: CriminalDecisionsOrchestratorSlice['cassationAppealModal'];
    identityEdit: unknown;
    quickFinalizeRequest: unknown;
    verdictCassationFilingCard: VerdictCard | null;
}): boolean {
    return (
        input.isInvestigationDecisionOpen ||
        input.isSeveranceOpen ||
        input.isInlineSeveranceFormOpen ||
        input.isStatementModalOpen ||
        input.isOtherEvidenceFormOpen ||
        input.isTrialDepositionModalOpen ||
        input.isTrashModalOpen ||
        input.isReopenCaseOpen ||
        input.isSendToCassationOpen ||
        input.isMergeCasesOpen ||
        input.isStageFinalDecisionOpen ||
        input.isLegalEditOpen ||
        input.isRequestsModalOpen ||
        input.requestMarginModalOpen ||
        input.stageCloserOrchestrator.isStageCloserOpen ||
        Boolean(input.confirmAction) ||
        Boolean(input.forfeitureModal) ||
        Boolean(input.cassationAppealModal) ||
        Boolean(input.identityEdit) ||
        Boolean(input.quickFinalizeRequest) ||
        Boolean(input.verdictCassationFilingCard)
    );
}
