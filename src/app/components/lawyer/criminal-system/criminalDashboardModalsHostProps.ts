import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
    CassationType,
    ProsecutionInterventionBasis,
    CaseStage,
} from '@/app/types/criminal';
import type {
    CriminalCase,
    CriminalComplainant,
    CriminalDefendant,
    CriminalStoreState,
    LawyerRequest,
    LegalArticleChange,
    OurRepresentation,
    Statement,
    StageConclusion,
    TimelineEvent,
} from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import type { SocialInquiryWorkflowStatus } from './criminalStageUtils';
import type { InvestigationDefendantsPartyMix } from './juvenileInvestigationRules';
import type { CaseSovereignContext } from './caseClassificationEngine';
import type { DecisionPresenceType } from './decisionAppealLifecycleCore';
import type { StageFinalDecisionFormPayload } from './stageFinalDecisionEngine';
import type { TrialDeposition } from './trialDepositionsEngine';
import type { TrialSession } from './trialSessionsEngine';
import type { VerdictCard } from './verdictCardsEngine';
import type { ProceduralNavTarget, ProceduralLinkReference } from './proceduralContainersEngine';
import type { CriminalTrashItem } from './criminalCaseTrash';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type {
    CriminalDecisionsOrchestratorSlice,
    CriminalRequestsOrchestratorSlice,
    CriminalStageCloserOrchestratorSlice,
} from './orchestrators/criminalOrchestratorSliceTypes';
import type { RequestsEntryModalProps } from './components/RequestsEntryModal';
import type { BailForfeitureModalState } from './components/BailForfeitureModal';
import type { StageCloserModalProps } from './components/StageCloserModal';

/** حالة تعديل هوية الطرف/الموقع — نفس شكل الحالة المحلية في ResolvedRuntime. */
export type IdentityEditState =
    | {
          mode: 'party';
          kind: 'complainant' | 'defendant';
          id: string;
          fullName: string;
          phone?: string;
          address: string;
      }
    | { mode: 'venue' };

/** حالة مودال التأكيد العام (نقل للسلة، حذف نهائي، إلخ). */
export type ConfirmActionState = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
};

export type CriminalDashboardModalsHostProps = {
    /** مشتركة بين معظم المودالات */
    id: string;
    defendants: CriminalDefendant[];
    complainants: CriminalComplainant[];
    criminalCase: CriminalCase;
    activeParties: CriminalActionParty[];
    isMutualComplaint: boolean;
    isInvestigationPhase: boolean;
    activeLegalArticle: string;
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;
    canManageDossier: boolean;
    onOpenCase?: (id: string) => void;
    showLegalToast: (message: string, durationMs?: number) => void;
    showLegalError: (message?: string) => void;

    /** الطعن التمييزي على قرار قضائي */
    cassationAppealModal: CriminalDecisionsOrchestratorSlice['cassationAppealModal'];
    setCassationAppealModal: CriminalDecisionsOrchestratorSlice['setCassationAppealModal'];
    declareJudicialDecisionFinal: CriminalStoreState['declareJudicialDecisionFinal'];
    fileJudicialDecisionAppeal: CriminalStoreState['fileJudicialDecisionAppeal'];

    /** نتيجة الطعن التمييزي */
    cassationResultContext: CriminalDecisionsOrchestratorSlice['cassationResultContext'];
    setCassationResultContext: CriminalDecisionsOrchestratorSlice['setCassationResultContext'];
    recordJudicialAppealResult: CriminalStoreState['recordJudicialAppealResult'];

    /** قرار إحالة التحقيق */
    isInvestigationDecisionOpen: boolean;
    setIsInvestigationDecisionOpen: Dispatch<SetStateAction<boolean>>;
    investigationDecisionError: string;
    setInvestigationDecisionError: Dispatch<SetStateAction<string>>;
    hasUnrevealedUnknown: boolean;
    referInvestigationDefendantToTrial: CriminalStoreState['referInvestigationDefendantToTrial'];
    applyInvestigationReferral: CriminalStoreState['applyInvestigationReferral'];

    /** اختيار متهمين لتفريق الدعوى */
    isSeveranceOpen: boolean;
    setIsSeveranceOpen: Dispatch<SetStateAction<boolean>>;
    severanceError: string;
    setSeveranceError: Dispatch<SetStateAction<string>>;
    investigationDefendantsPartyMix: InvestigationDefendantsPartyMix;
    beginSeveranceFromDossier: CriminalStoreState['beginSeveranceFromDossier'];
    openInlineSeveranceForm: () => void;

    /** القرار الختامي لمرحلة المحاكمة (نظام السيادة) */
    caseSovereignContext: CaseSovereignContext | null;
    isStageFinalDecisionOpen: boolean;
    setIsStageFinalDecisionOpen: Dispatch<SetStateAction<boolean>>;
    trialFinalDecisionSessionIdRef: MutableRefObject<string | null>;
    stageFinalDecisionError: string;
    setStageFinalDecisionError: Dispatch<SetStateAction<string>>;
    inferredStageFinalPresence: DecisionPresenceType;
    submitStageFinalDecision: (
        payload: StageFinalDecisionFormPayload,
        meta: { defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'] },
    ) => void;

    /** الغلق الختامي للمرحلة (تحقيق/غير سيادي) */
    isStageCloserOpen: boolean;
    stageCloserOrchestrator: CriminalStageCloserOrchestratorSlice;
    caseStage: CaseStage;
    isCassationStage: boolean;
    isJuvenileTrial: boolean;
    isTrialCourtStage: boolean;
    isPrivateRightWaived: boolean;
    juvenileAccused: boolean;
    firstJuvenileDefendant: CriminalDefendant | null;
    firstJuvenileSocialWorkflow: SocialInquiryWorkflowStatus;
    patchSocialInquiryReport: StageCloserModalProps['patchSocialInquiryReport'];
    submitStageCloser: () => void;

    /** تعديل الوصف القانوني للمادة */
    isLegalEditOpen: boolean;
    setIsLegalEditOpen: Dispatch<SetStateAction<boolean>>;
    legalArticleNext: string;
    setLegalArticleNext: (value: string) => void;
    legalChangedBy: LegalArticleChange['changedBy'];
    setLegalChangedBy: (value: LegalArticleChange['changedBy']) => void;
    submitLegalEdit: () => void;

    /** سجل الإفادات */
    activeTab: CriminalDashboardTab;
    isStatementModalOpen: boolean;
    setIsStatementModalOpen: Dispatch<SetStateAction<boolean>>;
    editingStatement: Statement | null;
    setEditingStatement: Dispatch<SetStateAction<Statement | null>>;
    statementEligibleDefendants: CriminalDefendant[];
    ourRepresentation: OurRepresentation;
    addStatement: CriminalStoreState['addStatement'];
    updateStatement: CriminalStoreState['updateStatement'];

    /** محاضر المرافعة (محكمة الموضوع) */
    isEffectiveTrialCourtStage: boolean;
    isTrialDepositionModalOpen: boolean;
    setIsTrialDepositionModalOpen: Dispatch<SetStateAction<boolean>>;
    editingTrialDeposition: TrialDeposition | null;
    setEditingTrialDeposition: Dispatch<SetStateAction<TrialDeposition | null>>;
    sortedTrialSessionsForDepositions: TrialSession[];
    addTrialDeposition: CriminalStoreState['addTrialDeposition'];
    updateTrialDeposition: CriminalStoreState['updateTrialDeposition'];

    /** مودال طلبات المحامي/القرارات القضائية — الحالة كاملة عبر useCriminalRequestsOrchestrator */
    isRequestsModalOpen: boolean;
    requestsOrchestrator: CriminalRequestsOrchestratorSlice;
    isRequestModalViewOnly: boolean;
    mixedInvestigationScopedDefendantNames: RequestsEntryModalProps['mixedInvestigationScopedDefendantNames'];
    reqJuvenileDetentionLocked: boolean;
    isAllDefendantsUnknown: boolean;
    reqNeedsDetentionDateRange: boolean;
    reqIsOrderEnforcementEntry: boolean;
    isRequestFinalStatus: boolean;
    reqDecisionBeforeRequest: boolean;
    reqIsJudicialDecisionEntry: boolean;
    reqIsLawyerMotionEntry: boolean;
    reqIsDefendantBailEntry: boolean;
    reqIsComplaintReferralEntry: boolean;
    isCustomJudicialEntry: boolean;
    requestFormBaseValid: boolean;
    requestFormFinalValid: boolean;
    showPurgeDefendantPicker: boolean;
    showRequestPartySection: boolean;
    showPartyPickerFormUi: boolean;
    showJuvenileJudgeConcernedPartyPicker: boolean;
    showUnknownPartyNoticeInRequestModal: boolean;
    showJuvenileArrestLegalHint: boolean;
    allParties: CriminalActionParty[];
    requestEligibleParties: CriminalActionParty[];
    fugitiveDefendants: RequestsEntryModalProps['fugitiveDefendants'];
    customJudicialConcernedPartyOptions: RequestsEntryModalProps['customJudicialConcernedPartyOptions'];
    customJudicialConcernedPartyId: string;
    autoRequestPartyLabel: string;
    autoConcernedPartyLabel: string;
    unknownDefendantsForPartyDisplay: RequestsEntryModalProps['unknownDefendantsForPartyDisplay'];
    modalLinkedRequest: LawyerRequest | null;
    activeRequestProceduralReferences: ProceduralLinkReference[];
    closeRequestsModal: () => void;
    submitRequest: () => void;
    applyJudicialTemplate: RequestsEntryModalProps['onApplyJudicialTemplate'];
    applyLawyerTemplate: RequestsEntryModalProps['onApplyLawyerTemplate'];
    clearRequestEntryLane: RequestsEntryModalProps['onClearEntryLane'];
    onAssetSeizureDraftsChange: RequestsEntryModalProps['onAssetSeizureDraftsChange'];
    patchReqBailForParty: RequestsEntryModalProps['patchReqBailForParty'];
    patchReqDetentionForParty: RequestsEntryModalProps['patchReqDetentionForParty'];
    handleReqBailUnifiedChange: (unified: boolean) => void;
    handleReqDetentionUnifiedChange: (unified: boolean) => void;
    navigateToProceduralItem: (target: ProceduralNavTarget) => void;
    toggleRequestStar: CriminalStoreState['toggleRequestStar'];
    addRequestAttachment: CriminalStoreState['addRequestAttachment'];
    removeRequestAttachment: CriminalStoreState['removeRequestAttachment'];

    /** تنبيه هامش الطلب */
    requestMarginModalOpen: boolean;
    setRequestMarginModalOpen: Dispatch<SetStateAction<boolean>>;
    editingRequestId: string | null;
    addRequestMargin: CriminalStoreState['addRequestMargin'];

    /** إغلاق سريع للطلب */
    quickFinalizeRequest: LawyerRequest | null;
    quickFinalizeStatus: 'approved' | 'rejected';
    quickFinalizeMargin: string;
    quickFinalizeDate: string;
    setQuickFinalizeStatus: (status: 'approved' | 'rejected') => void;
    setQuickFinalizeMargin: (value: string) => void;
    setQuickFinalizeDate: (value: string) => void;
    closeQuickFinalizeModal: () => void;
    submitQuickFinalize: () => void;

    /** التايم لاين المرتبط بمرجع إجرائي */
    linkedTimelineFromProcedural: TimelineEvent | null;
    setLinkedTimelineFromProcedural: Dispatch<SetStateAction<TimelineEvent | null>>;
    linkedTimelineProceduralReferences: ProceduralLinkReference[];

    /** إعادة فتح الدعوى المغلقة */
    isReopenCaseOpen: boolean;
    setIsReopenCaseOpen: Dispatch<SetStateAction<boolean>>;
    reopenCaseReason: string;
    setReopenCaseReason: (value: string) => void;
    submitReopenCase: () => void;

    /** إرسال الأوراق للتمييز */
    isSendToCassationOpen: boolean;
    setIsSendToCassationOpen: Dispatch<SetStateAction<boolean>>;
    availableCassationFilingTypes: CassationType[];
    cassationType: CassationType;
    setCassationType: (value: CassationType) => void;
    cassationInterventionBasis: ProsecutionInterventionBasis;
    setCassationInterventionBasis: (value: ProsecutionInterventionBasis) => void;
    cassationNumber: string;
    setCassationNumber: (value: string) => void;
    cassationPanelName: string;
    setCassationPanelName: (value: string) => void;
    cassationAppellantIds: string[];
    setCassationAppellantIds: (ids: string[]) => void;
    submitSendToCassation: () => void;

    /** تسجيل تقديم طعن على بطاقة حكم */
    verdictCassationFilingCard: VerdictCard | null;
    setVerdictCassationFilingCard: Dispatch<SetStateAction<VerdictCard | null>>;
    effectiveUiStage: CaseStage;
    isDecisionsTabMaterialReadOnly: boolean;
    patchVerdictCardOrdinaryAppeal: CriminalStoreState['patchVerdictCardOrdinaryAppeal'];

    /** تصحيح هوية طرف (مشتكي/متهم) */
    identityEdit: IdentityEditState | null;
    setIdentityEdit: Dispatch<SetStateAction<IdentityEditState | null>>;
    identityEditError: string;
    setIdentityEditError: Dispatch<SetStateAction<string>>;
    correctCasePartyName: CriminalStoreState['correctCasePartyName'];

    /** تصحيح بيانات الموقع/المحكمة */
    showEditInvestigationCourt: boolean;
    showEditTrialCourt: boolean;
    showEditDeposition: boolean;
    depositEntityName: string;
    isTrialPhase: boolean;
    correctCaseLegalArticle: CriminalStoreState['correctCaseLegalArticle'];
    correctCaseCourtName: CriminalStoreState['correctCaseCourtName'];
    correctCaseDepositionLocation: CriminalStoreState['correctCaseDepositionLocation'];
    correctCaseReferenceNumbers: CriminalStoreState['correctCaseReferenceNumbers'];

    /** سلة المهملات */
    isTrashModalOpen: boolean;
    setIsTrashModalOpen: Dispatch<SetStateAction<boolean>>;
    trashItems: CriminalTrashItem[];
    restoreTrashItem: CriminalStoreState['restoreTrashItem'];
    purgeTrashItem: CriminalStoreState['purgeTrashItem'];
    setConfirmAction: Dispatch<SetStateAction<ConfirmActionState | null>>;

    /** دمج قضايا */
    isMergeCasesOpen: boolean;
    setIsMergeCasesOpen: Dispatch<SetStateAction<boolean>>;
    headerTitle: { primary: string };
    mergeTargetCaseId: string;
    setMergeTargetCaseId: (value: string) => void;
    mergeReason: string;
    setMergeReason: (value: string) => void;
    submitMergeCases: () => void;

    /** تأكيد عملية عامة */
    confirmAction: ConfirmActionState | null;
    runConfirmAction: () => void;
    closeConfirmAction: () => void;

    /** مصادرة الكفالة */
    forfeitureModal: BailForfeitureModalState | null;
    setForfeitureModal: Dispatch<SetStateAction<BailForfeitureModalState | null>>;
    updateBailForfeiture: CriminalStoreState['updateBailForfeiture'];
};
