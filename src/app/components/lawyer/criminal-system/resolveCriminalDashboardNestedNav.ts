import type { CriminalDashboardTab } from './criminalDashboardTabChrome';

/** هل زر الرجوع سيُغلق طبقة داخلية قبل مغادرة الإضبارة؟ */
export function resolveCriminalDashboardNestedNav(input: {
    confirmAction: unknown;
    cassationResultContext: unknown;
    cassationAppealModal: unknown;
    isStageFinalDecisionOpen: boolean;
    verdictCassationFilingCard: unknown;
    trialSessionAddModalOpen: boolean;
    quickFinalizeRequest: unknown;
    requestMarginModalOpen: boolean;
    isRequestsModalOpen: boolean;
    linkedTimelineFromProcedural: unknown;
    isStatementModalOpen: boolean;
    isTrialDepositionModalOpen: boolean;
    isOtherEvidenceFormOpen: boolean;
    isTrashModalOpen: boolean;
    isReopenCaseOpen: boolean;
    isSendToCassationOpen: boolean;
    isMergeCasesOpen: boolean;
    isStageCloserOpen: boolean;
    isLegalEditOpen: boolean;
    isInvestigationDecisionOpen: boolean;
    isSeveranceOpen: boolean;
    isInlineSeveranceFormOpen: boolean;
    identityEdit: unknown;
    forfeitureModal: unknown;
    selectedPartyFilterId: string;
    selectedJourneyBranchId: string;
    selectedNodeFilter: string;
    proceduralNavTarget: unknown;
    activeTab: CriminalDashboardTab;
}): boolean {
    return Boolean(
        input.confirmAction ||
            input.cassationResultContext ||
            input.cassationAppealModal ||
            input.isStageFinalDecisionOpen ||
            input.verdictCassationFilingCard ||
            input.trialSessionAddModalOpen ||
            input.quickFinalizeRequest ||
            input.requestMarginModalOpen ||
            input.isRequestsModalOpen ||
            input.linkedTimelineFromProcedural ||
            input.isStatementModalOpen ||
            input.isTrialDepositionModalOpen ||
            input.isOtherEvidenceFormOpen ||
            input.isTrashModalOpen ||
            input.isReopenCaseOpen ||
            input.isSendToCassationOpen ||
            input.isMergeCasesOpen ||
            input.isStageCloserOpen ||
            input.isLegalEditOpen ||
            input.isInvestigationDecisionOpen ||
            input.isSeveranceOpen ||
            input.isInlineSeveranceFormOpen ||
            input.identityEdit ||
            input.forfeitureModal ||
            input.selectedPartyFilterId ||
            input.selectedJourneyBranchId ||
            input.selectedNodeFilter ||
            input.proceduralNavTarget ||
            input.activeTab !== 'requests',
    );
}
