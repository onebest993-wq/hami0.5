import type { Dispatch, SetStateAction } from 'react';
import type { LawyerRequest, Statement, TimelineEvent } from './criminalStore';
import type { TrialDeposition } from './trialDepositionsEngine';
import type { ProceduralNavTarget } from './proceduralContainersEngine';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { JudicialCassationAppealModalVariant } from './components/JudicialCassationAppealModal';
import type { VerdictCard } from './verdictCardsEngine';

export type ConfirmActionState = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
} | null;

export type IdentityEditState =
    | null
    | {
          mode: 'party';
          kind: 'complainant' | 'defendant';
          id: string;
          fullName: string;
          phone?: string;
          address: string;
      }
    | { mode: 'venue' };

export type CassationAppealModalState = {
    decision: JudicialDecision;
    variant: JudicialCassationAppealModalVariant;
} | null;

export type CassationResultContextState = {
    decision: JudicialDecision;
    appeal: JudicialDecisionAppeal;
} | null;

export type ForfeitureModalState = { defendantId: string; forfeitureNote: string } | null;

export type UseCriminalDashboardNavigationGuardParams = {
    activeTab: CriminalDashboardTab;
    switchDashboardTab: (tab: CriminalDashboardTab) => void;
    onClose?: () => void;

    confirmAction: ConfirmActionState;
    setConfirmAction: Dispatch<SetStateAction<ConfirmActionState>>;

    cassationResultContext: CassationResultContextState;
    setCassationResultContext: Dispatch<SetStateAction<CassationResultContextState>>;
    cassationAppealModal: CassationAppealModalState;
    setCassationAppealModal: Dispatch<SetStateAction<CassationAppealModalState>>;

    quickFinalizeRequest: LawyerRequest | null;
    closeQuickFinalizeModal: () => void;

    requestMarginModalOpen: boolean;
    setRequestMarginModalOpen: Dispatch<SetStateAction<boolean>>;

    isRequestsModalOpen: boolean;
    closeRequestsModal: () => void;

    linkedTimelineFromProcedural: TimelineEvent | null;
    setLinkedTimelineFromProcedural: Dispatch<SetStateAction<TimelineEvent | null>>;

    isStatementModalOpen: boolean;
    setIsStatementModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditingStatement: Dispatch<SetStateAction<Statement | null>>;

    isTrialDepositionModalOpen: boolean;
    setIsTrialDepositionModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditingTrialDeposition: Dispatch<SetStateAction<TrialDeposition | null>>;

    isOtherEvidenceFormOpen: boolean;
    setIsOtherEvidenceFormOpen: Dispatch<SetStateAction<boolean>>;

    isTrashModalOpen: boolean;
    setIsTrashModalOpen: Dispatch<SetStateAction<boolean>>;

    isReopenCaseOpen: boolean;
    setIsReopenCaseOpen: Dispatch<SetStateAction<boolean>>;

    isSendToCassationOpen: boolean;
    setIsSendToCassationOpen: Dispatch<SetStateAction<boolean>>;

    isMergeCasesOpen: boolean;
    setIsMergeCasesOpen: Dispatch<SetStateAction<boolean>>;

    isStageCloserOpen: boolean;
    setIsStageCloserOpen: Dispatch<SetStateAction<boolean>>;

    isLegalEditOpen: boolean;
    setIsLegalEditOpen: Dispatch<SetStateAction<boolean>>;

    isInvestigationDecisionOpen: boolean;
    setIsInvestigationDecisionOpen: Dispatch<SetStateAction<boolean>>;

    isSeveranceOpen: boolean;
    setIsSeveranceOpen: Dispatch<SetStateAction<boolean>>;

    isInlineSeveranceFormOpen: boolean;
    setIsInlineSeveranceFormOpen: Dispatch<SetStateAction<boolean>>;

    identityEdit: IdentityEditState;
    setIdentityEdit: Dispatch<SetStateAction<IdentityEditState>>;

    forfeitureModal: ForfeitureModalState;
    setForfeitureModal: Dispatch<SetStateAction<ForfeitureModalState>>;

    selectedPartyFilterId: string;
    setSelectedPartyFilterId: Dispatch<SetStateAction<string>>;

    selectedJourneyBranchId: string;
    setSelectedJourneyBranchId: Dispatch<SetStateAction<string>>;

    selectedNodeFilter: string;
    setSelectedNodeFilter: Dispatch<SetStateAction<string>>;

    proceduralNavTarget: ProceduralNavTarget | null;
    setProceduralNavTarget: Dispatch<SetStateAction<ProceduralNavTarget | null>>;

    isStageFinalDecisionOpen: boolean;
    setIsStageFinalDecisionOpen: Dispatch<SetStateAction<boolean>>;
    verdictCassationFilingCard: VerdictCard | null;
    setVerdictCassationFilingCard: Dispatch<SetStateAction<VerdictCard | null>>;
    trialSessionAddModalOpen: boolean;
    setTrialSessionAddModalOpen: Dispatch<SetStateAction<boolean>>;
};
