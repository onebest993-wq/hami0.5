import type { Dispatch, SetStateAction } from 'react';
import type { LawyerRequest, StageConclusion } from '../criminalStore';
import type { DecisionsScopeFilter } from '../casePhaseFilterEngine';
import type { DecisionsLedgerKindFilter } from '../judicialDecisionsLedgerEngine';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { JudicialCassationAppealModalVariant } from '../components/JudicialCassationAppealModal';
import type { DecisionsPartyScope } from '../juvenileInvestigationRules';
import type { PartyBailDraft, PartyDetentionDraft } from '../components/concernedPartyDecisionPickerDraft';
import type { SeizedAssetDraft } from '../components/requestModalEntryLanes.types';
import type { LawyerRequestModalMode } from '../lawyerRequestStatusMachine';
import type { PRIVATE_RIGHT_WAIVER_DECISION_VALUE } from '../criminalStageUtils';

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
    handleInterventionCassation: (decision: JudicialDecision) => void;
    handleDeclareJudgmentFinal: (decision: JudicialDecision) => void;
    handleCassationCorrection: (decision: JudicialDecision) => void;
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

/** نوع قرار الغلق الختامي — يشمل التنازل عن الحق الشخصي كقيمة خاصة */
export type StageCloserDecisionType =
    | StageConclusion['decisionType']
    | typeof PRIVATE_RIGHT_WAIVER_DECISION_VALUE
    | '';

export type CriminalStageCloserOrchestratorSlice = {
    isStageCloserOpen: boolean;
    setIsStageCloserOpen: Dispatch<SetStateAction<boolean>>;
    stageCloserReferralOnly: boolean;
    setStageCloserReferralOnly: Dispatch<SetStateAction<boolean>>;
    stageCloserError: string;
    setStageCloserError: Dispatch<SetStateAction<string>>;
    closureDecisionType: StageCloserDecisionType;
    setClosureDecisionType: Dispatch<SetStateAction<StageCloserDecisionType>>;
    closureDate: string;
    setClosureDate: Dispatch<SetStateAction<string>>;
    closureDetails: string;
    setClosureDetails: Dispatch<SetStateAction<string>>;
    closureDefendantStatus: StageConclusion['defendantStatusAtDecision'];
    setClosureDefendantStatus: Dispatch<SetStateAction<StageConclusion['defendantStatusAtDecision']>>;
    closureExpirationReason: StageConclusion['expirationReason'] | '';
    setClosureExpirationReason: Dispatch<SetStateAction<StageConclusion['expirationReason'] | ''>>;
    closureExpirationCustomDetail: string;
    setClosureExpirationCustomDetail: Dispatch<SetStateAction<string>>;
    closureExpirationDefendantIds: string[];
    setClosureExpirationDefendantIds: Dispatch<SetStateAction<string[]>>;
    closureReferralStage: 'محكمة الجنح' | 'محكمة الجنايات' | '';
    setClosureReferralStage: Dispatch<SetStateAction<'محكمة الجنح' | 'محكمة الجنايات' | ''>>;
    closureReferralCourtName: string;
    setClosureReferralCourtName: Dispatch<SetStateAction<string>>;
    closureReferralCaseNumber: string;
    setClosureReferralCaseNumber: Dispatch<SetStateAction<string>>;
    closureSuspendedExecution: boolean;
    setClosureSuspendedExecution: Dispatch<SetStateAction<boolean>>;
    closurePunishmentType: 'death' | 'life' | 'other';
    setClosurePunishmentType: Dispatch<SetStateAction<'death' | 'life' | 'other'>>;
    closureJuvenileSeverDefendantId: string;
    setClosureJuvenileSeverDefendantId: Dispatch<SetStateAction<string>>;
    closureScopedDefendantIds: string[];
    setClosureScopedDefendantIds: Dispatch<SetStateAction<string[]>>;
    closureSharedObjective269b: boolean;
    setClosureSharedObjective269b: Dispatch<SetStateAction<boolean>>;
};

export type CriminalDomainOrchestratorSlice =
    | CriminalBootOrchestratorSlice
    | CriminalJourneyFilterOrchestratorSlice
    | CriminalToastOrchestratorSlice
    | CriminalDecisionsOrchestratorSlice
    | CriminalRequestsOrchestratorSlice
    | CriminalStageCloserOrchestratorSlice;
