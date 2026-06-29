import type { Dispatch, SetStateAction } from 'react';
import type { LawyerRequest, StageConclusion } from '../criminalStore';
import type { DecisionsScopeFilter } from '../casePhaseFilterEngine';
import type { DecisionsLedgerKindFilter } from '../judicialDecisionsLedgerEngine';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { JudicialCassationAppealModalVariant } from '../components/JudicialCassationAppealModal';
import type { DecisionsPartyScope } from '../juvenileInvestigationRules';
import type { PartyBailDraft, PartyDetentionDraft } from '../components/concernedPartyDecisionPickerDraft';
import type { SeizedAssetDraft } from '../components/RequestModalEntryLanes';
import type { LawyerRequestModalMode } from '../lawyerRequestStatusMachine';

export type CriminalJourneyFilterOrchestratorSlice = {
    selectedNodeFilter: string;
    setSelectedNodeFilter: Dispatch<SetStateAction<string>>;
    selectedPartyFilterId: string;
    setSelectedPartyFilterId: Dispatch<SetStateAction<string>>;
    selectedJourneyBranchId: string;
    setSelectedJourneyBranchId: Dispatch<SetStateAction<string>>;
};

export type CriminalToastOrchestratorSlice = {
    legalToast: string;
    setLegalToast: Dispatch<SetStateAction<string>>;
};

export type CriminalBootOrchestratorSlice = {
    bootReady: boolean;
};

export type CriminalDecisionsOrchestratorSlice = {
    decisionsScopeFilter: DecisionsScopeFilter;
    setDecisionsScopeFilter: Dispatch<SetStateAction<DecisionsScopeFilter>>;
    effectiveDecisionsScope: DecisionsScopeFilter;
    visibleLawyerRequestsCount: number;
    setVisibleLawyerRequestsCount: Dispatch<SetStateAction<number>>;
    visibleJudicialDecisionsCount: number;
    setVisibleJudicialDecisionsCount: Dispatch<SetStateAction<number>>;
    decisionsKindFilter: DecisionsLedgerKindFilter;
    setDecisionsKindFilter: Dispatch<SetStateAction<DecisionsLedgerKindFilter>>;
    trialSessionAddModalOpen: boolean;
    setTrialSessionAddModalOpen: Dispatch<SetStateAction<boolean>>;
    cassationAppealModal: {
        decision: JudicialDecision;
        variant: JudicialCassationAppealModalVariant;
    } | null;
    setCassationAppealModal: Dispatch<
        SetStateAction<{
            decision: JudicialDecision;
            variant: JudicialCassationAppealModalVariant;
        } | null>
    >;
    cassationResultContext: {
        decision: JudicialDecision;
        appeal: JudicialDecisionAppeal;
    } | null;
    setCassationResultContext: Dispatch<
        SetStateAction<{
            decision: JudicialDecision;
            appeal: JudicialDecisionAppeal;
        } | null>
    >;
    openAppealModal: (decision: JudicialDecision, variant: JudicialCassationAppealModalVariant) => void;
    decisionsPageSize: number;
};

export type CriminalRequestsOrchestratorSlice = {
    isRequestsModalOpen: boolean;
    setIsRequestsModalOpen: Dispatch<SetStateAction<boolean>>;
    requestModalLane: 'judicial' | 'lawyer';
    setRequestModalLane: Dispatch<SetStateAction<'judicial' | 'lawyer'>>;
    reqDate: string;
    setReqDate: Dispatch<SetStateAction<string>>;
    reqType: string;
    setReqType: Dispatch<SetStateAction<string>>;
    reqTypeTemplate: string;
    setReqTypeTemplate: Dispatch<SetStateAction<string>>;
    reqEntryLane: 'judicial' | 'lawyer' | '';
    setReqEntryLane: Dispatch<SetStateAction<'judicial' | 'lawyer' | ''>>;
    reqJudicialEntryScope: DecisionsPartyScope | null;
    setReqJudicialEntryScope: Dispatch<SetStateAction<DecisionsPartyScope | null>>;
    reqCustomTypeName: string;
    setReqCustomTypeName: Dispatch<SetStateAction<string>>;
    reqIsAppealable: boolean;
    setReqIsAppealable: Dispatch<SetStateAction<boolean>>;
    reqNote: string;
    setReqNote: Dispatch<SetStateAction<string>>;
    reqInvestigationExpirationReason: StageConclusion['expirationReason'] | '';
    setReqInvestigationExpirationReason: Dispatch<SetStateAction<StageConclusion['expirationReason'] | ''>>;
    reqInvestigationExpirationCustomDetail: string;
    setReqInvestigationExpirationCustomDetail: Dispatch<SetStateAction<string>>;
    reqStatus: LawyerRequest['status'];
    setReqStatus: Dispatch<SetStateAction<LawyerRequest['status']>>;
    reqJudgeMargin: string;
    setReqJudgeMargin: Dispatch<SetStateAction<string>>;
    reqDecisionDate: string;
    setReqDecisionDate: Dispatch<SetStateAction<string>>;
    reqDefendantIds: string[];
    setReqDefendantIds: Dispatch<SetStateAction<string[]>>;
    reqDetentionStartDate: string;
    setReqDetentionStartDate: Dispatch<SetStateAction<string>>;
    reqDetentionEndDate: string;
    setReqDetentionEndDate: Dispatch<SetStateAction<string>>;
    reqDetentionByPartyId: Record<string, PartyDetentionDraft>;
    setReqDetentionByPartyId: Dispatch<SetStateAction<Record<string, PartyDetentionDraft>>>;
    reqLegalArticleBasis: string;
    setReqLegalArticleBasis: Dispatch<SetStateAction<string>>;
    reqReferredCourtName: string;
    setReqReferredCourtName: Dispatch<SetStateAction<string>>;
    reqBailByPartyId: Record<string, PartyBailDraft>;
    setReqBailByPartyId: Dispatch<SetStateAction<Record<string, PartyBailDraft>>>;
    reqBailUnified: boolean;
    setReqBailUnified: Dispatch<SetStateAction<boolean>>;
    reqDetentionUnified: boolean;
    setReqDetentionUnified: Dispatch<SetStateAction<boolean>>;
    reqSeizureSelectedDefendantIds: string[];
    setReqSeizureSelectedDefendantIds: Dispatch<SetStateAction<string[]>>;
    reqSeizureDraftsByDefendant: Record<string, SeizedAssetDraft[]>;
    setReqSeizureDraftsByDefendant: Dispatch<SetStateAction<Record<string, SeizedAssetDraft[]>>>;
    editingRequestId: string | null;
    setEditingRequestId: Dispatch<SetStateAction<string | null>>;
    requestModalMode: LawyerRequestModalMode;
    setRequestModalMode: Dispatch<SetStateAction<LawyerRequestModalMode>>;
    quickFinalizeRequest: LawyerRequest | null;
    setQuickFinalizeRequest: Dispatch<SetStateAction<LawyerRequest | null>>;
    quickFinalizeStatus: 'approved' | 'rejected';
    setQuickFinalizeStatus: Dispatch<SetStateAction<'approved' | 'rejected'>>;
    quickFinalizeMargin: string;
    setQuickFinalizeMargin: Dispatch<SetStateAction<string>>;
    quickFinalizeDate: string;
    setQuickFinalizeDate: Dispatch<SetStateAction<string>>;
    reqIsStarred: boolean;
    setReqIsStarred: Dispatch<SetStateAction<boolean>>;
    reqDraftAttachments: { id: string; name: string }[];
    setReqDraftAttachments: Dispatch<SetStateAction<{ id: string; name: string }[]>>;
    requestMarginModalOpen: boolean;
    setRequestMarginModalOpen: Dispatch<SetStateAction<boolean>>;
};

export type CriminalDomainOrchestratorSlice =
    | CriminalBootOrchestratorSlice
    | CriminalJourneyFilterOrchestratorSlice
    | CriminalToastOrchestratorSlice
    | CriminalDecisionsOrchestratorSlice
    | CriminalRequestsOrchestratorSlice;
