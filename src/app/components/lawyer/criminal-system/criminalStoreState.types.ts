/**
 * Criminal Zustand store state surface — extracted from criminalStore.ts.
 */
import type {
    JudicialAppellantType,
    JudicialCassationAppealPath,
    JudicialDecision,
    SeveranceReason,
} from '@/app/types/criminal';
import {
    type GuarantorDetails,
} from './criminalGuarantorModel';
import {
    type SeizedAsset,
} from './criminalSeizedAssetModel';
import type {
    CriminalCase,
    CriminalCaseDraft,
    CriminalCaseLocation,
    CriminalCaseStage,
    DefendantAgeCategory,
    DefendantStatus,
    ExhibitLifecycleStatus,
    InvestigationLog,
    InvestigationPapersAt,
    LawyerRequest,
    LegalArticleChange,
    OtherEvidenceItem,
    PendingSeveranceContext,
    PhysicalLocation,
    SocialInquiryReport,
    StageConclusion,
    Statement,
    TimelineEvent,
    JudicialSeveranceDraft,
} from './criminalCaseModel';
import {
    type AddTrialSessionInput,
    type FinalizeTrialVerdictInput,
    type TrialSessionPreparatoryDecisionInput,
} from './trialSessionsEngine';
import {
    type AddTrialDepositionInput,
    type UpdateTrialDepositionPatch,
} from './trialDepositionsEngine';
import {
    type ModifyTrialChargeInput,
} from './trialChargeEngine';
import type {
    CriminalActionParty,
} from './criminalStageUtils';
import {
    type ProceduralContainer,
    type ProceduralSubItem,
    type ProceduralSubItemPatch,
} from './proceduralContainersEngine';
import {
    type SandboxTemplateId,
} from './proceduralSandboxToolkit';
import {
    type InitiateCassationPayload,
    type RecordCassationResultPayload,
} from './cassationEngine';
import {
    type RevealDefendantIdentityPayload,
} from './criminalUnknownDefendant';
import {
    type InvestigationReferralTargetStage,
} from './juvenileInvestigationRules';
import type {
    CreateLawyerRequestInput,
    CreateLawyerRequestResult,
    FinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import type {
    OrderEnforcementTracking,
} from '@/app/types/criminal';
import {
    type RecordJudicialCassationResultPayload,
} from './cassationJudicialForm';
import {
    type VerdictCorrectionAppealTrack,
    type VerdictInterventionAppealTrack,
    type VerdictOrdinaryAppealTrack,
} from './verdictCardsEngine';
import {
    type VerdictCassationResultSaveInput,
} from './verdictCassationResultEngine';
import {
    type StageFinalDecisionFormPayload,
} from './stageFinalDecisionEngine';
import {
    type MisdemeanorType,
} from './caseClassificationEngine';
import {
    type RegisterStageFinalDecisionMeta,
} from './criminalStageFinalMutations';

export type CriminalStoreState = {
    draft: CriminalCaseDraft;
    casesById: Record<string, CriminalCase>;
    /**
     * محامي الجلسة الحالية — غير مُصرَّح في persist؛ يُستخدم لختم ownerLawyerId عند الإنشاء.
     */
    sessionOwnerLawyerId: string | null;
    /** سياق تفريق الدعوى الجاري — null عند عدم وجود عملية تفريق. */
    pendingSeveranceContext: PendingSeveranceContext | null;
    setSessionOwnerLawyerId: (lawyerId: string | null) => void;
    /** يختم الأضابير التراثية بلا مالك باسم محامي الجلسة. */
    claimUnownedCasesForSession: (lawyerId: string) => number;
    /** تملّك إضبارة تراثية بلا مالك — بإجراء صريح من المحامي. */
    claimCriminalCaseOwnership: (caseId: string) => string | null;
    setBasicField: <K extends keyof CriminalCaseDraft['basics']>(
        key: K,
        value: CriminalCaseDraft['basics'][K],
    ) => void;
    setLocationField: <K extends keyof CriminalCaseLocation>(key: K, value: CriminalCaseLocation[K]) => void;
    addComplainant: () => void;
    deleteComplainant: (id: string) => void;
    setComplainantField: (
        id: string,
        key:
            | 'fullName'
            | 'address'
            | 'phone'
            | 'isJuvenile'
            | 'isUnderSeven'
            | 'birthDate'
            | 'guardianName'
            | 'guardianRelationship',
        value: string | boolean,
    ) => void;
    toggleDraftComplainantOfficeClient: (id: string, next: boolean) => void;
    /** ربط يدوي: شكوى المشتكي ضد متهمين محددين (أو الجميع عند `[]`). `undefined` = بدون توجيه متقابل. */
    setDraftComplainantCounterComplaintTargets: (
        complainantId: string,
        targetDefendantIds: string[] | undefined,
    ) => void;
    updateCaseComplainantJuvenile: (
        caseId: string,
        complainantId: string,
        data: { isJuvenile?: boolean; birthDate?: string; guardianName?: string; guardianRelationship?: string },
    ) => void;
    setUnknownDefendant: (value: boolean) => void;
    addUnknownDefendant: () => void;
    toggleDraftDefendantIdentityUnknown: (defendantId: string, unknown: boolean) => void;
    revealDefendantIdentity: (
        caseId: string,
        defendantId: string,
        payload: RevealDefendantIdentityPayload,
    ) => string | null;
    addDefendant: () => void;
    deleteDefendant: (id: string) => void;
    setDefendantField: (
        id: string,
        key:
            | 'fullName'
            | 'address'
            | 'birthYear'
            | 'status'
            | 'detentionAuthority'
            | 'detentionExpiryDate'
            | 'isJuvenile'
            | 'isUnderSeven'
            | 'birthDate'
            | 'guardianName'
            | 'guardianRelationship',
        value: string | boolean,
    ) => void;
    setDraftDefendantGuarantor: (
        defendantId: string,
        patch: Partial<GuarantorDetails> | null,
    ) => void;
    toggleDraftDefendantOfficeClient: (id: string, next: boolean) => void;
    updateCaseDefendantGuarantor: (caseId: string, defendantId: string, patch: Partial<GuarantorDetails>) => void;
    updateCaseDefendantJuvenile: (
        caseId: string,
        defendantId: string,
        data: { isJuvenile?: boolean; birthDate?: string; guardianName?: string; guardianRelationship?: string },
    ) => void;
    updateCaseDefendantAgeCategory: (
        caseId: string,
        defendantId: string,
        category: DefendantAgeCategory,
    ) => void;
    updateJuvenileSocialInquiryReport: (caseId: string, defendantId: string, report: SocialInquiryReport) => void;
    addStatement: (caseId: string, statement: Statement) => string | null;
    addOtherEvidenceItem: (caseId: string, item: OtherEvidenceItem) => string | null;
    removeOtherEvidenceItem: (caseId: string, itemId: string) => string | null;
    moveOtherEvidenceToTrash: (caseId: string, itemId: string) => string | null;
    updateStatement: (caseId: string, statementId: string, updatedData: Partial<Omit<Statement, 'id'>>) => void;
    addTimelineEvent: (caseId: string, event: TimelineEvent) => void;
    deleteTimelineEvent: (caseId: string, eventId: string) => void;
    deleteStatement: (caseId: string, statementId: string) => void;
    moveStatementToTrash: (caseId: string, statementId: string) => string | null;
    addInvestigationLog: (caseId: string, log: InvestigationLog) => void;
    updateInvestigationLog: (caseId: string, logId: string, updatedData: Partial<Omit<InvestigationLog, 'id'>>) => void;
    /** إكمال كتاب/تقرير — لا تعديل رجعي للحالة. */
    completeInvestigationLetter: (
        caseId: string,
        logId: string,
        payload: { responseNotes?: string; receivedDate?: string },
    ) => string | null;
    /** تحديث دورة حياة مبرز فقط. */
    updateInvestigationLogExhibitLifecycle: (
        caseId: string,
        logId: string,
        lifecycle: ExhibitLifecycleStatus,
    ) => string | null;
    deleteInvestigationLog: (caseId: string, logId: string) => void;
    moveInvestigationLogToTrash: (caseId: string, logId: string) => string | null;
    setProceduralContainers: (caseId: string, containers: ProceduralContainer[]) => void;
    addRootProceduralContainer: (
        caseId: string,
        input: { title: string; color: string; icon: string },
    ) => void;
    updateProceduralContainer: (
        caseId: string,
        containerId: string,
        patch: Partial<
            Pick<ProceduralContainer, 'title' | 'color' | 'icon' | 'collapsed' | 'pathStatus' | 'pathEndedAt'>
        >,
    ) => void;
    deleteProceduralContainer: (caseId: string, containerId: string) => void;
    moveProceduralContainerToTrash: (caseId: string, containerId: string) => string | null;
    reorderRootProceduralContainers: (caseId: string, fromId: string, toId: string) => void;
    addProceduralSubItem: (caseId: string, parentId: string, item: ProceduralSubItem) => void;
    updateProceduralSubItem: (
        caseId: string,
        parentId: string,
        itemId: string,
        patch: ProceduralSubItemPatch,
    ) => void;
    deleteProceduralSubItem: (caseId: string, parentId: string, itemId: string) => void;
    moveProceduralSubItemToTrash: (caseId: string, parentId: string, itemId: string) => string | null;
    duplicateProceduralSubItem: (caseId: string, parentId: string, itemId: string) => void;
    moveProceduralSubItem: (
        caseId: string,
        fromParentId: string,
        toParentId: string,
        itemId: string,
        toIndex: number,
    ) => void;
    moveProceduralContainer: (
        caseId: string,
        containerId: string,
        newParentId: string | null,
        toIndex: number,
    ) => void;
    advanceProceduralActionPhase: (
        caseId: string,
        parentId: string,
        actionId: string,
        opts?: { spawnChildTitle?: string; spawnChildColor?: string; spawnChildIcon?: string },
    ) => void;
    recordProceduralCanvasAudit: (caseId: string, summary: string) => void;
    applyProceduralSandboxTemplate: (caseId: string, templateId: SandboxTemplateId) => void;
    duplicateProceduralContainer: (caseId: string, containerId: string) => void;
    addOrUpdateRequest: (caseId: string, request: LawyerRequest) => void;
    /** إنشاء طلب جديد — حالة قيد النظر فقط (منفصل زمنياً عن هامش القاضي). */
    createLawyerRequest: (caseId: string, input: CreateLawyerRequestInput) => CreateLawyerRequestResult;
    /** تدوين هامش القاضي وقفل الطلب — بعد صدور القرار لاحقاً. */
    finalizeLawyerRequest: (caseId: string, requestId: string, input: FinalizeLawyerRequestInput) => string | null;
    /** إغلاق التوقيف النشط — إطلاق سراح بكفالة (وكيل المتهم). */
    releaseDefendantsFromDetention: (caseId: string, defendantIds: string[]) => string | null;
    /** تمديد توقيف على نفس البطاقة — تحديث تاريخ الانتهاء دون إنشاء قرار جديد. */
    extendDetentionOnDecision: (caseId: string, decisionId: string, newEndDate: string) => string | null;
    /** توثيق إطلاق سراح على البطاقة — إغلاق العداد وتحديث حالة المتهم. */
    documentDetentionReleaseOnDecision: (caseId: string, decisionId: string) => string | null;
    updateOrderEnforcementOnDecision: (
        caseId: string,
        decisionId: string,
        patch: Partial<OrderEnforcementTracking>,
    ) => string | null;
    updateLawyerRequest: (caseId: string, requestId: string, updatedData: Partial<Omit<LawyerRequest, 'id'>>) => void;
    deleteLawyerRequest: (caseId: string, requestId: string) => void;
    moveLawyerRequestToTrash: (caseId: string, requestId: string) => string | null;
    moveJudicialDecisionToTrash: (caseId: string, decisionRef: string) => string | null;
    restoreTrashItem: (caseId: string, trashItemId: string) => string | null;
    purgeTrashItem: (caseId: string, trashItemId: string) => string | null;
    addTrialSession: (caseId: string, sessionData: AddTrialSessionInput) => string | null;
    updateTrialSession: (caseId: string, sessionId: string, sessionData: AddTrialSessionInput) => string | null;
    documentTrialSessionPreparatoryDecision: (
        caseId: string,
        input: {
            sessionId?: string;
            session: AddTrialSessionInput;
            preparatory: TrialSessionPreparatoryDecisionInput;
        },
    ) => string | null;
    postponeTrialSession: (
        caseId: string,
        sessionId: string,
        nextDate: string,
        reason: string,
        prepNote: string,
    ) => string | null;
    /** تسجيل موعد المحاكمة (location.nextHearingDate) دون إنشاء جلسة مرافعة */
    registerInitialTrialHearingDate: (caseId: string, nextHearingDate: string) => string | null;
    prunePhantomScheduledTrialSessions: (caseId: string) => void;
    finalizeTrialVerdict: (caseId: string, sessionId: string, verdictData: FinalizeTrialVerdictInput) => string | null;
    /** ربط جلسة المرافعة بقرار ختامي صادر عبر StageFinalDecisionModal — دون إعادة إصدار القرار. */
    syncTrialSessionVerdictFromStageFinal: (
        caseId: string,
        sessionId: string,
        input: { kind: string; issuedAt: string; presenceType?: string },
    ) => string | null;
    updateVerdictCardDraft: (caseId: string, cardId: string, draft: string) => void;
    patchVerdictCardOrdinaryAppeal: (
        caseId: string,
        cardId: string,
        patch: Partial<VerdictOrdinaryAppealTrack>,
    ) => void;
    recordVerdictCardCassationResult: (
        caseId: string,
        cardId: string,
        input: import('./verdictCassationResultEngine').VerdictCassationResultSaveInput,
    ) => string | null;
    patchVerdictCardInterventionAppeal: (
        caseId: string,
        cardId: string,
        patch: Partial<VerdictInterventionAppealTrack>,
    ) => void;
    patchVerdictCardCorrectionAppeal: (
        caseId: string,
        cardId: string,
        patch: Partial<VerdictCorrectionAppealTrack>,
    ) => void;
    /** منظومة إصدار القرار الختامي — نموذج ديناميكي + بطاقة ذكية. */
    registerStageFinalDecision: (
        caseId: string,
        payload: StageFinalDecisionFormPayload,
        meta: RegisterStageFinalDecisionMeta,
    ) => string | null;
    recordVerdictAbsentiaPublication: (caseId: string, cardId: string, publicationDate: string) => string | null;
    recordVerdictAbsentiaObjection: (caseId: string, cardId: string) => string | null;
    refreshVerdictCardLifecycles: (caseId: string) => void;
    ensureCaseSovereignContext: (caseId: string) => void;
    addTrialDeposition: (caseId: string, input: AddTrialDepositionInput) => string | null;
    updateTrialDeposition: (caseId: string, depositionId: string, patch: UpdateTrialDepositionPatch) => string | null;
    deleteTrialDeposition: (caseId: string, depositionId: string) => string | null;
    modifyTrialChargeDescription: (caseId: string, input: ModifyTrialChargeInput) => string | null;
    addRequestMargin: (caseId: string, requestId: string, text: string) => void;
    toggleRequestStar: (caseId: string, requestId: string) => void;
    addRequestAttachment: (caseId: string, requestId: string, name: string) => void;
    removeRequestAttachment: (caseId: string, requestId: string, attachmentId: string) => void;
    fileJudicialDecisionAppeal: (
        caseId: string,
        decisionId: string,
        payload: {
            appellantType: JudicialAppellantType;
            appellantIds: string[];
            targetDefendantIds: string[];
            filedAt?: string;
            appellantManualLabel?: string;
            appealPath?: JudicialCassationAppealPath;
        },
    ) => string | null;
    declareJudicialDecisionFinal: (
        caseId: string,
        decisionId: string,
        payload: {
            declarerType: JudicialAppellantType;
            declarerIds: string[];
            declarerManualLabel?: string;
            declaredAt?: string;
        },
    ) => string | null;
    patchJudicialDecisionLifecycle: (
        caseId: string,
        decisionId: string,
        patch: Partial<
            Pick<
                JudicialDecision,
                | 'decisionPresenceType'
                | 'decisionCaseType'
                | 'decisionAppealability'
                | 'isAppealed'
                | 'appealResult'
                | 'isJudgmentFinalDeclared'
                | 'judgmentFinalDeclaredAt'
                | 'judgmentFinalDeclaredByLabel'
                | 'judgmentFinalDeclaredByIds'
                | 'cassationPapersReceivedAt'
                | 'interventionCassationPending'
                | 'cassationCorrectionPending'
            >
        >,
    ) => string | null;
    recordJudicialAppealResult: (
        caseId: string,
        decisionId: string,
        appealId: string,
        payload: RecordJudicialCassationResultPayload,
    ) => string | null;
    updateCaseDefendantStatus: (caseId: string, defendantId: string, status: DefendantStatus) => void;
    /**
     * ⚖️ شكوى متقابلة — يُحدّث الحالة الإجرائية لمشتكٍ يَكتسب صفة المتهم،
     * مع الحفاظ على بقاء سجله داخل مصفوفة `complainants` (لا نقل/تخريب للداتا).
     * يُحدّث `accusedStatus` و`accusedDetentionHistoryLog` بصورة منفصلة عن سجله كمشتكي.
     */
    updateCrossComplainantAccusedStatus: (
        caseId: string,
        complainantId: string,
        status: DefendantStatus,
    ) => void;
    /**
     * 💀 تسجيل وفاة المشتكي المتقابل بصفته متهماً — يَقفل سجله الفرعي
     * (accusedIsPartyRecordLocked + accusedPersonalStage='lawsuit_dropped_death')
     * مع توثيق الحدث على السجل الزمني. لا يَنقل الكائن من مصفوفة المشتكين.
     */
    registerCrossComplainantAccusedDeath: (
        caseId: string,
        complainantId: string,
        date?: string,
    ) => void;
    /**
     * 📦 حجز الأموال على مشتكٍ متقابل «هارب» — مقابل addDefendantSeizedAssets.
     * يُخزَّن على حقل `accusedSeizedAssets` ضمن سجل المشتكي نفسه.
     */
    addCrossComplainantSeizedAssets: (
        caseId: string,
        complainantId: string,
        assets: Array<Omit<SeizedAsset, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>,
        sourceRequestId?: string,
    ) => void;
    updateCrossComplainantSeizedAsset: (
        caseId: string,
        complainantId: string,
        assetId: string,
        patch: Partial<Pick<SeizedAsset, 'description' | 'referenceNumber' | 'seizureDate' | 'notes'>>,
    ) => void;
    releaseCrossComplainantSeizedAssets: (
        caseId: string,
        complainantId: string,
        assetIds?: string[],
    ) => void;
    confirmBailAfterAppeal: (caseId: string, defendantIds?: string[]) => void;
    fileInAbsentiaObjection: (caseId: string, defendantId: string) => void;
    /**
     * يضيف صنفاً (أو أكثر) من الأموال المحجوزة على متهم هارب.
     * يُستخدم داخل قرار «حجز الأموال» (إجراء قاضٍ منفّذ).
     * كل صنف يلتقط `sourceRequestId` لربطه بقرار القاضي.
     */
    addDefendantSeizedAssets: (
        caseId: string,
        defendantId: string,
        assets: Array<Omit<SeizedAsset, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>,
        sourceRequestId?: string,
    ) => void;
    /** يُعدّل صنف حجز واحد (تصحيح خطأ — قبل/بعد فك الحجز لا يهم). */
    updateDefendantSeizedAsset: (
        caseId: string,
        defendantId: string,
        assetId: string,
        patch: Partial<Pick<SeizedAsset, 'description' | 'referenceNumber' | 'seizureDate' | 'notes'>>,
    ) => void;
    /** يفكّ الحجز عن صنف واحد أو عدة أصناف (أو جميعها إذا تُرك `assetIds` فارغاً). */
    releaseDefendantSeizedAssets: (caseId: string, defendantId: string, assetIds?: string[]) => void;
    updateBailForfeiture: (caseId: string, defendantId: string, data: { forfeitureNote?: string }) => void;
    updateCasePhysicalLocation: (caseId: string, location: PhysicalLocation, customName?: string) => void;
    setDraftArticle3Offense: (value: boolean) => void;
    setDraftMutualComplaint: (value: boolean) => void;
    setDraftPublicProsecutionComplainant: (value: boolean) => void;
    setDraftArticleIncludesPublicRight: (value: boolean) => void;
    setDraftCrimeDiscoveryDate: (value: string) => void;
    applyInvestigationReferral: (
        caseId: string,
        payload: {
            targetCaseStage: InvestigationReferralTargetStage;
            courtName: string;
            courtCaseNumber: string;
            publicProsecutionNumber?: string;
            referralLegalArticle?: string;
            decisionDate: string;
            decisionDetails: string;
            defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
            defendantIds: string[];
            defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
            /** إلزامي عند الإحالة إلى محكمة الجنح. */
            referralMisdemeanorType?: MisdemeanorType;
        },
    ) => void;
    /** إحالة المتهمين النشطين إلى إضبارة محكمة موضوع جديدة. */
    referInvestigationDefendantToTrial: (
        caseId: string,
        payload: {
            defendantIds: string[];
            targetCaseStage: InvestigationReferralTargetStage;
            courtName: string;
            courtCaseNumber: string;
            decisionDate: string;
            decisionDetails: string;
            defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
            publicProsecutionNumber?: string;
            referralLegalArticle?: string;
            referralMisdemeanorType?: MisdemeanorType;
        },
    ) => string | null;
    registerPartyDeath: (caseId: string, defendantId: string, date?: string) => void;
    /** @alias registerPartyDeath */
    recordPartyDeath: (caseId: string, defendantId: string, date?: string) => void;
    /** تفريق الدعاوى — إنشاء إضبارة ابنة ونقل المتهمين المحددين من الأم. */
    severCase: (
        parentCaseId: string,
        payload: {
            defendantIds: string[];
            severanceReason: SeveranceReason;
            date: string;
            details: string;
        },
    ) => string | null;
    referAndGenerateCase: (
        currentCaseId: string,
        targetCourt: string,
        decisionDetails: StageConclusion,
        referralMeta?: { courtName: string; caseNumber: string },
    ) => string | null;
    reopenClosedCase: (caseId: string, reopenReason: string) => void;
    /** إنهاء الغلق المؤقت وإعادة تفعيل الإضبارة التحقيقية. */
    endInvestigationTemporaryClosure: (caseId: string) => string | null;
    /** @deprecated — استخدم initiateCassationProceeding */
    sendCaseToCassation: (
        caseId: string,
        data: { cassationNumber: string; sentDate: string; panelName: string },
    ) => void;
    initiateCassationProceeding: (caseId: string, payload: InitiateCassationPayload) => void;
    updateCaseLocation: (
        caseId: string,
        newLocationType: 'police' | 'court',
        newLocationName: string,
        reason: string,
    ) => void;
    correctCasePartyName: (
        caseId: string,
        payload: {
            partyKind: 'complainant' | 'defendant';
            partyId: string;
            newFullName: string;
            newPhone?: string;
            newAddress?: string;
            reason: string;
        },
    ) => string | null;
    correctCaseCourtName: (
        caseId: string,
        payload: { newCourtName: string; reason: string; scope: 'investigation' | 'trial' },
    ) => string | null;
    correctCaseDepositionLocation: (
        caseId: string,
        payload: { papersAt: InvestigationPapersAt; entityName: string; reason: string },
    ) => string | null;
    correctCaseLegalArticle: (caseId: string, payload: { newArticle: string; reason: string }) => string | null;
    correctCaseReferenceNumbers: (
        caseId: string,
        payload: { courtCaseNumber?: string; publicProsecutionNumber?: string; reason: string },
    ) => string | null;
    updateCaseStage: (caseId: string, stage: CriminalCaseStage) => void;
    updateLegalArticle: (caseId: string, change: LegalArticleChange) => void;
    waivePrivateRight: (caseId: string, waiverDate: string) => void;
    /** ضم الإضبارة التابعة (child) في الإضبارة الأم النشطة (parent) */
    mergeCases: (parentCaseId: string, childCaseId: string, mergeReason: string) => void;
    severJuvenileDefendantToJuvenileCourt: (caseId: string, defendantId: string, date: string, details: string) => string | null;
    /** قرار ختامي مع نطاق متهمين — يحدّث personalStage للمستهدفين فقط. */
    issueStageDecision: (
        caseId: string,
        conclusion: StageConclusion,
        referral?: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    /** مزامنة مسار الرأس مع قرار إحالة/انتقال مسجّل ولم يُطبَّق بعد. */
    applyPendingJourneyOrder: (caseId: string) => string | null;
    recordCassationResult: (caseId: string, payload: RecordCassationResultPayload) => string | null;
    /** عرض مشتق للإضبارة (وراثة الأم للتابعة). */
    getCaseForDisplay: (caseId: string) => CriminalCase | null;
    /** أطراف أحياء فقط — إفادات، طلبات، توقيف، كفالة. */
    getActiveParties: (caseId: string) => CriminalActionParty[];
    /** جميع الأطراف مع علامة المتوفى — أدلة، طب عدلي، مبرزات. */
    getAllParties: (caseId: string) => CriminalActionParty[];
    concludeStage: (
        caseId: string,
        conclusion: StageConclusion,
        referral?: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    referCaseToTrial: (
        caseId: string,
        referralData: { decisionNumber: string; decisionDate: string },
        newCourtData: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    createCaseFromDraft: () => string;
    deleteCase: (id: string) => void;
    resetDraft: () => void;
    /**
     * يفتح عملية تفريق الدعوى: يلتقط لقطة المتهمين، يضع السياق في الحالة،
     * ويُعيد تهيئة المسودّة لإحضار شاشة «إضبارة جديدة» فارغة مع المتهمين فقط.
     * يُعيد `true` عند النجاح و`false` إذا تعذّر الإجراء (الأم غير موجودة / لم يُحدَّد متهمون).
     */
    beginSeveranceFromDossier: (
        parentCaseId: string,
        defendantIds: string[],
        options?: {
            judicialSeveranceDraft?: JudicialSeveranceDraft;
            severanceReason?: SeveranceReason;
            severanceReasonDetail?: string;
        },
    ) => boolean;
    /**
     * يُنفّذ تفريق الدعوى الكامل:
     *   أ) ينشئ الإضبارة الجديدة من المسودّة الحالية.
     *   ب) يحذف المتهمين المنقولين من الإضبارة الأم نهائياً.
     *   ج) يُرحّل (يُغيّر caseId) أي طلب/قرار/إفادة/حدث تايم‑لاين/سجل تحقيق
     *      كان مرتبطاً حصرياً بهؤلاء المتهمين فقط.
     * يُعيد معرّف الإضبارة الجديدة عند النجاح، أو `null` عند فشل التحقق.
     */
    commitSeveranceFromDossier: () => string | null;
    /** يحفظ مسودّة التفريق ويُفرّغ مسودّة الإضبارة العادية (عند الخروج دون إتمام الشطر). */
    stashPendingSeveranceForm: () => void;
    /** يستأنف تعبئة الإضبارة المفرّقة في المسودّة النشطة. */
    resumePendingSeveranceForm: () => boolean;
    /**
     * يُجهّز مسودّة «إضبارة جديدة» العادية فقط — لا يمسّ formDraft المعلّقة للتفريق.
     * يُستدعى قبل فتح النموذج العام (أرشيف / زر إضافة ملف).
     */
    prepareNormalCriminalCaseForm: () => void;
    /** يلغي عملية التفريق المعلّقة ويُصفّر المسودّة. */
    cancelPendingSeverance: () => void;
    /** يحدّث سبب التفريق في السياق المعلّق (اختياري). */
    setPendingSeveranceReason: (reason?: SeveranceReason, detail?: string) => void;
};
