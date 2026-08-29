import type React from 'react';
import type { CaseStage, JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalActionParty } from './criminalPartyLabelCore';
import type { CriminalCase, CriminalDefendant, LawyerRequest } from './criminalStore';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { JourneyNode } from '@/app/types/criminal';
import type { DecisionsScopeFilter } from './casePhaseFilterEngine';
import type {
    DecisionsLedgerKindFilter,
    JudicialDecisionsLedgerProps,
} from './components/JudicialDecisionsLedger';
import type { VerdictCardsPanelProps } from './components/VerdictCardsPanel';
import type { AddTrialSessionInput, TrialSession } from './trialSessionsDisplay';
import type { JourneyBranchTrack } from './stageJourney';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type { VerdictCard } from './verdictCardsEngine';
import type { TrialsTabProps } from './components/TrialsTab';

type VerdictDraft = Parameters<VerdictCardsPanelProps['onUpdateDraft']>[1];
type VerdictOrdinaryAppealPatch = Parameters<VerdictCardsPanelProps['onSaveOrdinaryAppeal']>[1];
type VerdictCassationResultInput = Parameters<VerdictCardsPanelProps['onSaveVerdictCassationResult']>[1];
type VerdictCorrectionAppealPatch = Parameters<VerdictCardsPanelProps['onSaveCorrectionAppeal']>[1];
type EnforcementPatch = Record<string, unknown>;

export type CriminalDashboardRequestsTabProps = {
    id: string;
    decisionsKindFilter: DecisionsLedgerKindFilter;
    setDecisionsKindFilter: (value: DecisionsLedgerKindFilter) => void;
    isInvestigationPhase: boolean;
    showTrialsTab: boolean;
    trialSessionsTabLabel: string;
    switchDashboardTab: (tab: CriminalDashboardTab) => void;
    setTrialSessionAddModalOpen: (open: boolean) => void;
    openAdultJudicialDecisionModal: () => void;
    openJuvenileJudicialDecisionModal: () => void;
    openLawyerMotionModal: () => void;
    canCreateDecisionsOrRequests: boolean;
    decisionsScopeFilter: DecisionsScopeFilter;
    setDecisionsScopeFilter: (value: DecisionsScopeFilter) => void;
    effectiveDecisionsScope: DecisionsScopeFilter;
    defendants: CriminalDefendant[];
    effectiveUiStage: CaseStage;
    caseStage: CaseStage;
    criminalCase: CriminalCase;
    isDecisionsTabMaterialReadOnly: boolean;
    criminalCaseUserRole?: CriminalCaseUserRole;
    sendToCassationOnVerdictCard?: VerdictCardsPanelProps['sendToCassation'];
    updateVerdictCardDraft: (caseId: string, cardId: string, draft: VerdictDraft) => void;
    patchVerdictCardOrdinaryAppeal: (
        caseId: string,
        cardId: string,
        patch: VerdictOrdinaryAppealPatch,
    ) => void;
    recordVerdictCardCassationResult: (
        caseId: string,
        cardId: string,
        input: VerdictCassationResultInput,
    ) => string | null | void;
    patchVerdictCardCorrectionAppeal: (
        caseId: string,
        cardId: string,
        patch: VerdictCorrectionAppealPatch,
    ) => void;
    recordVerdictAbsentiaPublication: (caseId: string, cardId: string, publicationDate: string) => string | null | void;
    recordVerdictAbsentiaObjection: (caseId: string, cardId: string) => string | null | void;
    openVerdictCassationFilingCard: (card: VerdictCard) => void;
    sortedLawyerRequestsForNode: LawyerRequest[];
    trialSessions: TrialSession[];
    activeJourneyBranch: JourneyBranchTrack | null;
    isHistoricalNodeView: boolean;
    selectedJourneyNode: JourneyNode | null;
    verdictCards: VerdictCard[];
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;
    isFrozen: boolean;
    trialSessionAddModalOpen: boolean;
    addTrialSession: (caseId: string, payload: AddTrialSessionInput) => string | null;
    updateTrialSession: (caseId: string, sessionId: string, payload: AddTrialSessionInput) => string | null;
    documentTrialSessionPreparatoryDecision: (
        caseId: string,
        input: Parameters<NonNullable<TrialsTabProps['onDocumentPreparatoryDecision']>>[0],
    ) => string | null;
    postponeTrialSession: (
        caseId: string,
        sessionId: string,
        nextDate: string,
        reason: string,
        prepNote?: string,
    ) => string | null;
    registerInitialTrialHearingDate: (caseId: string, nextHearingDate: string) => string | null;
    openStageFinalDecisionFromTrialSession?: (sessionId: string) => void;
    currentAccusationArticle: string;
    showLegalToast: (message: string, duration?: number) => void;
    allParties: CriminalActionParty[];
    stageJourney: JourneyNode[];
    isInvestigationDossierSealed: boolean;
    crimeType?: string;
    activeLegalArticle?: string;
    openAppealModal: (decision: JudicialDecision, kind: 'ordinary') => void;
    setCassationResultContext: (value: { decision: JudicialDecision; appeal: JudicialDecisionAppeal }) => void;
    handleRequestOrderProceedingsBlockChange?: NonNullable<
        JudicialDecisionsLedgerProps['onRequestOrderProceedingsBlockChange']
    >;
    addRequestMargin: (caseId: string, requestId: string, text: string) => void;
    toggleRequestStar: (caseId: string, requestId: string) => void;
    getProceduralRefsForRequest: NonNullable<JudicialDecisionsLedgerProps['proceduralRefsForRequest']>;
    navigateToProceduralItem: NonNullable<JudicialDecisionsLedgerProps['onNavigateProcedural']>;
    handleMoveDecisionToTrash?: NonNullable<JudicialDecisionsLedgerProps['onMoveToTrash']>;
    handleMoveRequestToTrash?: NonNullable<JudicialDecisionsLedgerProps['onMoveRequestToTrash']>;
    openRequestQuickFinalizeModal?: NonNullable<JudicialDecisionsLedgerProps['onRecordJudgeMargin']>;
    criminalCaseForInvestigationPurge?: CriminalCase;
    primaryDefendant?: CriminalDefendant | null;
    autoConcernedPartyId?: string | null;
    openQuickBailFromDecision?: (decision: JudicialDecision) => string | null | void;
    extendDetentionOnDecision: (caseId: string, decisionId: string, newEndDate: string) => string | null | void;
    documentDetentionReleaseOnDecision: (caseId: string, decisionId: string) => string | null | void;
    updateOrderEnforcementOnDecision: (
        caseId: string,
        decisionId: string,
        patch: EnforcementPatch,
    ) => string | null | void;
    handleInterventionCassation?: NonNullable<JudicialDecisionsLedgerProps['onInterventionCassation']>;
    handleCassationCorrection?: NonNullable<JudicialDecisionsLedgerProps['onCassationCorrection']>;
    handleDeclareJudgmentFinal?: NonNullable<JudicialDecisionsLedgerProps['onDeclareJudgmentFinal']>;
    getPendingCassationAppealForResult: (decision: JudicialDecision) => JudicialDecisionAppeal | undefined;
    visibleLawyerRequestsCount: number;
    visibleJudicialDecisionsCount: number;
    setVisibleJudicialDecisionsCount: React.Dispatch<React.SetStateAction<number>>;
    decisionsPageSize: number;
};
