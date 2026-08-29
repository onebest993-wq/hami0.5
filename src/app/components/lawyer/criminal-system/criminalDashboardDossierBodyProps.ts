import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from 'react';
import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import type {
    CriminalCase,
    CriminalComplainant,
    CriminalDefendant,
    CriminalStoreState,
    OtherEvidenceItem,
    OurRepresentation,
    PhysicalLocation,
    Statement,
} from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import type { CriminalPartiesGridProps } from './CriminalPartiesGrid';
import type { TrialDeposition } from './trialDepositionsEngine';
import type { TrialSession } from './trialSessionsEngine';
import type { VerdictCard } from './verdictCardsEngine';
import type { ProceduralItemLink } from './proceduralItemLink';
import type { ProceduralNavTarget } from './proceduralContainersEngine';
import type { IdentityEditState, ConfirmActionState } from './CriminalDashboardModalsHost';
import {
    LazyCriminalDashboardHeader,
    LazyCriminalDashboardRequestsTab,
    LazyCriminalDashboardStatementsTab,
} from './criminalDashboardLazyRegistry';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type { CriminalDossierMidBannersProps } from './components/CriminalDossierStatusBanners';

type HeaderComponentProps = ComponentProps<typeof LazyCriminalDashboardHeader>;
type RequestsTabComponentProps = ComponentProps<typeof LazyCriminalDashboardRequestsTab>;
type StatementsTabComponentProps = ComponentProps<typeof LazyCriminalDashboardStatementsTab>;

export type CriminalDashboardDossierBodyProps = {
    id: string;
    onClose?: () => void;
    onExitToHome?: () => void;
    onOpenCase?: (id: string) => void;
    criminalCase: CriminalCase;
    caseStage: CaseStage;

    /** لافتات أعلى الهيدر */
    shouldShowMandatoryCassationBanner: boolean;
    shouldShowArticle3DeadlineBanner: boolean;
    article3ElapsedDays: number | null;
    isOwnerAccessDenied?: boolean;
    isOrphanLegacyCase?: boolean;
    onClaimCaseOwnership?: () => void;
    pendingSeveranceContext: CriminalStoreState['pendingSeveranceContext'];
    isInlineSeveranceFormOpen: boolean;
    openInlineSeveranceForm: () => void;
    isPrejudicialFrozen: boolean;
    isInterventionReview: boolean;
    isCassationFilterReadOnly: boolean;
    selectedJourneyNode: JourneyNode | null;

    /** ترويسة الإضبارة */
    headerTitle: HeaderComponentProps['headerTitle'];
    stage: string;
    activeLegalArticle: string;
    isMutualComplaint: boolean;
    isFrozen: boolean;
    hasPendingBail: boolean;
    confirmBailAfterAppeal: CriminalStoreState['confirmBailAfterAppeal'];
    pendingBailDefendantIds: string[];
    finalDecision: HeaderComponentProps['finalDecision'];
    isArchived: boolean;
    openReopenCase: () => void;
    canManageDossier: boolean;
    canShowMergeMenuItem: boolean;
    isMergeMenuItemDisabled: boolean;
    openMergeCases: () => void;
    mergedCaseDisplayLinks: HeaderComponentProps['mergedCaseDisplayLinks'];
    mergedCaseIds: string[];
    canEditIdentity?: boolean;
    showEditVenueIdentity: boolean;
    isTimelineArchiveReadOnly: boolean;
    setIdentityEditError: Dispatch<SetStateAction<string>>;
    setIdentityEdit: Dispatch<SetStateAction<IdentityEditState | null>>;
    isEffectivelyArchived: boolean;
    isInvestigationDossierSealed: boolean;
    allowSeveranceOrDossierStrike: boolean;
    allowDefendantSeverance: boolean;
    setSeveranceError: Dispatch<SetStateAction<string>>;
    setIsSeveranceOpen: Dispatch<SetStateAction<boolean>>;
    physicalLocation: PhysicalLocation;
    physicalLocationCustomName?: string;
    updateCasePhysicalLocation: CriminalStoreState['updateCasePhysicalLocation'];
    showLegalError: (message?: string) => void;
    showFinalDecisionInCriminalHeader: boolean;
    finalDecisionActionLabel: string;
    openDefaultJudgmentOpposition: (() => void) | null;
    isTemporaryClosingFollowUpStage: boolean;
    showInvestigationFinalDecisionAction: boolean;
    openFinalDecisionEntry: () => void;
    investigationDossierSealLabel: HeaderComponentProps['investigationDossierSealLabel'];
    investigationDossierClosure: CriminalCase['investigationDossierClosure'];
    setIsTrashModalOpen: Dispatch<SetStateAction<boolean>>;
    trashCount: HeaderComponentProps['trashCount'];
    isInvestigationPhase: boolean;
    showEndTemporaryClosureAction: boolean;
    endInvestigationTemporaryClosure: CriminalStoreState['endInvestigationTemporaryClosure'];
    showLegalToast: (message: string, durationMs?: number) => void;

    /** مسار القضية (شريط المراحل) */
    stageJourney: JourneyNode[];
    defendants: CriminalDefendant[];
    selectedNodeFilter: string;
    selectedPartyFilterId: string;
    selectedJourneyBranchId: string;
    setSelectedNodeFilter: Dispatch<SetStateAction<string>>;
    setSelectedPartyFilterId: Dispatch<SetStateAction<string>>;
    setSelectedJourneyBranchId: Dispatch<SetStateAction<string>>;
    showInvestigationReferralInJourney: boolean;
    showJourneyReferralButton: boolean;
    openInvestigationDecisionModal: () => void;
    openTrialReferralOrders: () => void;
    isDashboardReadOnly: boolean;

    /** لافتات وسطى (ضم، تمييز، غياب) */
    mergedIntoCaseId: string;
    mergedIntoCaseNumber: string;
    isSentToCassation: boolean;
    cassationCaseDetails: CriminalCase['cassationCaseDetails'];
    inAbsentiaBanners: CriminalDossierMidBannersProps['inAbsentiaBanners'];
    isDefense: boolean;
    fileInAbsentiaObjection: CriminalStoreState['fileInAbsentiaObjection'];

    /** شبكة الأطراف */
    displayComplainants: CriminalComplainant[];
    visibleDefendants: CriminalDefendant[];
    crimeType: CriminalPartiesGridProps['crimeType'];
    hasUnrevealedUnknown: boolean;
    isPrivateRightWaived: boolean;
    waiverDate: string;
    ourRepresentation: OurRepresentation | '';
    isStageCloserOpen: boolean;
    isStatementModalOpen: boolean;
    isTrialDepositionModalOpen: boolean;
    isRequestsModalOpen: boolean;
    confirmAction: ConfirmActionState | null;
    openForfeitureUpdate: (defendantId: string) => void;

    /** أزرار التبويبات + رجوع */
    switchDashboardTab: (tab: CriminalDashboardTab) => void;
    activeTab: CriminalDashboardTab;
    handleDashboardBack: () => void;
    dossierNestedNav?: boolean;

    /** لوحة الإفادات وأدلة الإثبات الأخرى */
    setIsOtherEvidenceFormOpen: Dispatch<SetStateAction<boolean>>;
    isOtherEvidenceReadOnly: boolean;
    isEffectiveTrialCourtStage: boolean;
    setEditingTrialDeposition: Dispatch<SetStateAction<TrialDeposition | null>>;
    setIsTrialDepositionModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditingStatement: Dispatch<SetStateAction<Statement | null>>;
    setIsStatementModalOpen: Dispatch<SetStateAction<boolean>>;
    isStatementsTabReadOnly: boolean;
    isOtherEvidenceFormOpen: boolean;
    addOtherEvidenceItem: CriminalStoreState['addOtherEvidenceItem'];
    statementsTabActive: boolean;
    statements: Statement[];
    otherEvidenceItems: OtherEvidenceItem[];
    trialDepositions: TrialDeposition[];
    trialSessions: TrialSession[];
    isHistoricalNodeView: boolean;
    activeJourneyBranch: StatementsTabComponentProps['activeJourneyBranch'];
    updateTrialDeposition: CriminalStoreState['updateTrialDeposition'];
    deleteTrialDeposition: CriminalStoreState['deleteTrialDeposition'];
    renderStatementCard: (statement: Statement) => ReactNode;
    renderOtherEvidenceCard: (item: OtherEvidenceItem) => ReactNode;

    /** تبويب القوانين */
    hasJuvenileInCase: boolean;

    /** تبويب المتابعة الإجرائية */
    isInvestigationMaterialReadOnly: boolean;
    openProceduralLinkedRecord: (link: ProceduralItemLink) => void;
    proceduralNavTarget: ProceduralNavTarget | null;
    setProceduralNavTarget: Dispatch<SetStateAction<ProceduralNavTarget | null>>;

    /** تبويب الطلبات/القرارات — تمرير مباشر لخصائص LazyCriminalDashboardRequestsTab */
    decisionsKindFilter: RequestsTabComponentProps['decisionsKindFilter'];
    setDecisionsKindFilter: RequestsTabComponentProps['setDecisionsKindFilter'];
    showTrialsTab: boolean;
    trialSessionsTabLabel: string;
    setTrialSessionAddModalOpen: RequestsTabComponentProps['setTrialSessionAddModalOpen'];
    openAdultJudicialDecisionModal: () => void;
    openJuvenileJudicialDecisionModal: () => void;
    openLawyerMotionModal: () => void;
    canCreateDecisionsOrRequests: boolean;
    decisionsScopeFilter: RequestsTabComponentProps['decisionsScopeFilter'];
    setDecisionsScopeFilter: RequestsTabComponentProps['setDecisionsScopeFilter'];
    effectiveDecisionsScope: RequestsTabComponentProps['effectiveDecisionsScope'];
    effectiveUiStage: RequestsTabComponentProps['effectiveUiStage'];
    isDecisionsTabMaterialReadOnly: boolean;
    criminalCaseUserRole: RequestsTabComponentProps['criminalCaseUserRole'];
    sendToCassationOnVerdictCard: RequestsTabComponentProps['sendToCassationOnVerdictCard'];
    updateVerdictCardDraft: RequestsTabComponentProps['updateVerdictCardDraft'];
    patchVerdictCardOrdinaryAppeal: RequestsTabComponentProps['patchVerdictCardOrdinaryAppeal'];
    recordVerdictCardCassationResult: RequestsTabComponentProps['recordVerdictCardCassationResult'];
    patchVerdictCardCorrectionAppeal: RequestsTabComponentProps['patchVerdictCardCorrectionAppeal'];
    recordVerdictAbsentiaPublication: RequestsTabComponentProps['recordVerdictAbsentiaPublication'];
    recordVerdictAbsentiaObjection: RequestsTabComponentProps['recordVerdictAbsentiaObjection'];
    setVerdictCassationFilingCard: Dispatch<SetStateAction<VerdictCard | null>>;
    sortedLawyerRequestsForNode: RequestsTabComponentProps['sortedLawyerRequestsForNode'];
    verdictCards: VerdictCard[];
    trialSessionAddModalOpen: RequestsTabComponentProps['trialSessionAddModalOpen'];
    addTrialSession: RequestsTabComponentProps['addTrialSession'];
    updateTrialSession: RequestsTabComponentProps['updateTrialSession'];
    documentTrialSessionPreparatoryDecision: RequestsTabComponentProps['documentTrialSessionPreparatoryDecision'];
    postponeTrialSession: RequestsTabComponentProps['postponeTrialSession'];
    registerInitialTrialHearingDate: RequestsTabComponentProps['registerInitialTrialHearingDate'];
    openStageFinalDecisionFromTrialSession?: RequestsTabComponentProps['openStageFinalDecisionFromTrialSession'];
    openAppealModal: RequestsTabComponentProps['openAppealModal'];
    handleInterventionCassation?: RequestsTabComponentProps['handleInterventionCassation'];
    handleCassationCorrection?: RequestsTabComponentProps['handleCassationCorrection'];
    handleDeclareJudgmentFinal?: RequestsTabComponentProps['handleDeclareJudgmentFinal'];
    currentAccusationArticle: string;
    allParties: CriminalActionParty[];
    setCassationResultContext: RequestsTabComponentProps['setCassationResultContext'];
    handleRequestOrderProceedingsBlockChange?: RequestsTabComponentProps['handleRequestOrderProceedingsBlockChange'];
    addRequestMargin: RequestsTabComponentProps['addRequestMargin'];
    toggleRequestStar: RequestsTabComponentProps['toggleRequestStar'];
    getProceduralRefsForRequest: RequestsTabComponentProps['getProceduralRefsForRequest'];
    navigateToProceduralItem: (target: ProceduralNavTarget) => void;
    handleMoveDecisionToTrash?: RequestsTabComponentProps['handleMoveDecisionToTrash'];
    handleMoveRequestToTrash?: RequestsTabComponentProps['handleMoveRequestToTrash'];
    openRequestQuickFinalizeModal?: RequestsTabComponentProps['openRequestQuickFinalizeModal'];
    primaryDefendant?: RequestsTabComponentProps['primaryDefendant'];
    autoConcernedPartyId?: RequestsTabComponentProps['autoConcernedPartyId'];
    openQuickBailFromDecision?: RequestsTabComponentProps['openQuickBailFromDecision'];
    extendDetentionOnDecision: RequestsTabComponentProps['extendDetentionOnDecision'];
    documentDetentionReleaseOnDecision: RequestsTabComponentProps['documentDetentionReleaseOnDecision'];
    updateOrderEnforcementOnDecision: RequestsTabComponentProps['updateOrderEnforcementOnDecision'];
    visibleLawyerRequestsCount: RequestsTabComponentProps['visibleLawyerRequestsCount'];
    visibleJudicialDecisionsCount: RequestsTabComponentProps['visibleJudicialDecisionsCount'];
    setVisibleJudicialDecisionsCount: RequestsTabComponentProps['setVisibleJudicialDecisionsCount'];
    decisionsPageSize: RequestsTabComponentProps['decisionsPageSize'];
};
