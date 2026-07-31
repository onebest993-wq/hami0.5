import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prefetchCriminalDashboardTab } from './criminalDashboardLazyRegistry';
import { type CriminalDashboardTab } from './criminalDashboardTabChrome';
import { isTrialCaseStage, resolveCaseStageFromRecord } from './criminalStageRuntimeCore';
import { useCriminalDashboardStoreBindings } from './useCriminalDashboardStoreBindings';
import { useCriminalDashboardCaseFacts } from './useCriminalDashboardCaseFacts';
import { resolveCriminalDashboardHeaderTitle } from './criminalDashboardHeaderTitle';
import { useCriminalDashboardCaseBanners } from './useCriminalDashboardCaseBanners';
import { useCriminalDashboardCassationMergeActions } from './useCriminalDashboardCassationMergeActions';
import { useCriminalDashboardCaseCollections } from './useCriminalDashboardCaseCollections';
import { useCriminalDashboardIntentWarmup } from './useCriminalDashboardIntentWarmup';
import { useCriminalDashboardFinalDecisionEntry } from './useCriminalDashboardFinalDecisionEntry';
import { useCriminalDashboardTrashProceduralHandlers } from './useCriminalDashboardTrashProceduralHandlers';
import { useCriminalDashboardEvidenceCardRenderers } from './criminalDashboardEvidenceCardRenderers';
import { useCriminalDashboardNavigationGuard } from './useCriminalDashboardNavigationGuard';
import { useCriminalRequestQuickFinalizeController } from './orchestrators/useCriminalRequestQuickFinalizeController';
import { useCriminalBootOrchestrator } from './orchestrators/useCriminalBootOrchestrator';
import { useCriminalJourneyFilterOrchestrator } from './orchestrators/useCriminalJourneyFilterOrchestrator';
import { useCriminalJourneyStageAccessOrchestrator } from './orchestrators/useCriminalJourneyStageAccessOrchestrator';
import { useCriminalToastOrchestrator } from './orchestrators/useCriminalToastOrchestrator';
import { useCriminalDecisionsOrchestrator } from './orchestrators/useCriminalDecisionsOrchestrator';
import { useCriminalStageCloserOrchestrator } from './orchestrators/useCriminalStageCloserOrchestrator';
import { useCriminalStageCloserSubmit } from './orchestrators/useCriminalStageCloserSubmit';
import { useCriminalRequestsOrchestrator } from './orchestrators/useCriminalRequestsOrchestrator';
import { useCriminalRequestsModalController } from './useCriminalRequestsModalController';
import { useCriminalDashboardModalUiState } from './useCriminalDashboardModalUiState';
import { useCriminalDashboardDossierBodyProps } from './useCriminalDashboardDossierBodyProps';
import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import { assembleCriminalDashboardModalsHostProps } from './assembleCriminalDashboardModalsHostProps';
import { useCriminalMissingCaseRecovery } from './useCriminalMissingCaseRecovery';
import { useCriminalDashboardShellPrefetch } from './useCriminalDashboardShellPrefetch';
import { computeCriminalDashboardForceModalsHost } from './computeCriminalDashboardForceModalsHost';
import type { CriminalDashboardDossierBodyProps } from './CriminalDashboardDossierBody';
import type { CriminalCase, CriminalStoreState } from './criminalStore';

export type CriminalDashboardOrchestrationInput = {
    id: string;
    onClose?: () => void;
    onExitToHome?: () => void;
    onOpenCase?: (id: string) => void;
};

export type CriminalDashboardOrchestrationResult = {
    isCaseHydrating: boolean;
    isMissingCase: boolean;
    missingRecoveryDone: boolean;
    criminalCase: CriminalCase | undefined;
    legalToast: string;
    dossierBodyProps: CriminalDashboardDossierBodyProps;
    modalsHostProps: CriminalDashboardModalsHostProps;
    modalsHostMounted: boolean;
    forceModalsHost: boolean;
    isInlineSeveranceFormOpen: boolean;
    pendingSeveranceContext: CriminalStoreState['pendingSeveranceContext'];
    closeInlineSeveranceForm: () => void;
    setIsInlineSeveranceFormOpen: (open: boolean) => void;
};

export function useCriminalDashboardResolvedOrchestration({
    id,
    onClose,
    onExitToHome,
    onOpenCase,
}: CriminalDashboardOrchestrationInput): CriminalDashboardOrchestrationResult {
    // Prefetch lazy modals + engines أثناء idle — orchestrator منفصل
    useCriminalBootOrchestrator();

    const {
        rawCase,
        displayCasesById,
        isCaseHydrating,
        isMissingCase,
        isAccessDenied,
        isOrphanLegacyCase,
        criminalCase,
        pendingSeveranceContext,
        resumePendingSeveranceForm,
        stashPendingSeveranceForm,
        addStatement,
        addOtherEvidenceItem,
        updateStatement,
        moveStatementToTrash,
        moveLawyerRequestToTrash,
        moveJudicialDecisionToTrash,
        moveOtherEvidenceToTrash,
        restoreTrashItem,
        purgeTrashItem,
        addTrialSession,
        updateTrialSession,
        postponeTrialSession,
        registerInitialTrialHearingDate,
        documentTrialSessionPreparatoryDecision,
        addTrialDeposition,
        updateTrialDeposition,
        deleteTrialDeposition,
        correctCasePartyName,
        correctCaseCourtName,
        correctCaseLegalArticle,
        correctCaseReferenceNumbers,
        correctCaseDepositionLocation,
        extendDetentionOnDecision,
        documentDetentionReleaseOnDecision,
        updateOrderEnforcementOnDecision,
        addRequestMargin,
        toggleRequestStar,
        addRequestAttachment,
        removeRequestAttachment,
        fileJudicialDecisionAppeal,
        recordJudicialAppealResult,
        declareJudicialDecisionFinal,
        patchJudicialDecisionLifecycle,
        updateVerdictCardDraft,
        patchVerdictCardOrdinaryAppeal,
        recordVerdictCardCassationResult,
        patchVerdictCardCorrectionAppeal,
        registerStageFinalDecision,
        syncTrialSessionVerdictFromStageFinal,
        recordVerdictAbsentiaPublication,
        recordVerdictAbsentiaObjection,
        refreshVerdictCardLifecycles,
        ensureCaseSovereignContext,
        confirmBailAfterAppeal,
        fileInAbsentiaObjection,
        updateBailForfeiture,
        updateCasePhysicalLocation,
        updateLegalArticle,
        waivePrivateRight,
        issueStageDecision,
        applyInvestigationReferral,
        referInvestigationDefendantToTrial,
        beginSeveranceFromDossier,
        referAndGenerateCase,
        reopenClosedCase,
        endInvestigationTemporaryClosure,
        initiateCassationProceeding,
        updateJuvenileSocialInquiryReport,
        mergeCases,
        severJuvenileDefendantToJuvenileCourt,
        claimCriminalCaseOwnership,
    } = useCriminalDashboardStoreBindings(id);

    const { missingRecoveryDone } = useCriminalMissingCaseRecovery(id, isMissingCase);

    const stage = criminalCase?.basics.stage ?? '';
    const caseStage = criminalCase ? resolveCaseStageFromRecord(criminalCase) : 'investigation';
    const isInvestigationPhase = caseStage === 'investigation';
    const isTrialPhase = isTrialCaseStage(caseStage);
    const isCassationStage = stage === 'cassation_court';
    const isTrialCourtStage = caseStage === 'misdemeanor' || caseStage === 'felony';
    const isInvestigationLocked = Boolean(criminalCase?.isInvestigationLocked);

    const headerTitle = useMemo(
        () => resolveCriminalDashboardHeaderTitle(criminalCase, stage, caseStage, isInvestigationPhase, isTrialCourtStage),
        [caseStage, criminalCase, isInvestigationPhase, isTrialCourtStage, stage],
    );

    /** حقائق/مشتقّات القضية الأساسية (الهوية، الأطراف، صلاحيات التحرير...) — hook منفصل. */
    const {
        crimeType,
        legalArticleHistory,
        activeLegalArticle,
        complainants,
        displayComplainants,
        defendants,
        hasUnrevealedUnknown,
        isAllDefendantsUnknown,
        unknownDefendantsForPartyDisplay,
        isFrozen,
        isPrejudicialPostponed,
        isDefaultJudgmentArchived,
        mergedIntoCaseId,
        mergedIntoCaseNumber,
        isMergedDossier:_isMergedDossier,
        isArchived,
        isEffectivelyArchived,
        isDashboardReadOnly,
        canManageDossier,
        canEditIdentity,
        depositEntityName,
        showEditDeposition,
        showEditInvestigationCourt,
        showEditTrialCourt,
        showEditVenueIdentity,
        trashItems,
        trashCount,
        isSentToCassation,
        physicalLocation,
        physicalLocationCustomName,
        isArticle3Offense:_isArticle3Offense,
        article3ElapsedDays,
        shouldShowArticle3DeadlineBanner,
        cassationCaseDetails,
        finalDecision,
        shouldShowMandatoryCassationBanner,
        isPrivateRightWaived,
        investigationDossierClosure,
        isInvestigationDossierSealed,
        investigationDossierSealLabel,
        showEndTemporaryClosureAction,
        waiverDate,
        visibleDefendants,
        isMutualComplaint,
        partyScopeDefendants,
        statementEligibleDefendants,
        allParties,
        activeParties,
        primaryDefendant,
        juvenileDefendants,
        firstJuvenileDefendant,
        juvenileAccused,
        hasJuvenileInCase,
        isJuvenileTrial,
        allowSeveranceOrDossierStrike,
        allowDefendantSeverance,
        ourRepresentation,
        isDefense,
        criminalCaseUserRole,
        autoConcernedPartyId,
        autoConcernedPartyLabel,
        pendingBailDefendantIds,
        hasPendingBail,
        investigationDefendantsPartyMix,
        investigationHasMixedUnknownAndIdentified,
        firstJuvenileSocialWorkflow,
    } = useCriminalDashboardCaseFacts({
        id,
        criminalCase,
        stage,
        caseStage,
        isInvestigationPhase,
        pendingSeveranceContext,
    });

    const effectiveDashboardReadOnly = isDashboardReadOnly || isAccessDenied;
    const effectiveCanManageDossier = canManageDossier && !isAccessDenied;

    // فلاتر رحلة القضية — orchestrator منفصل (بداية تفكيك الـ runtime)
    const {
        selectedNodeFilter,
        setSelectedNodeFilter,
        selectedPartyFilterId,
        setSelectedPartyFilterId,
        selectedJourneyBranchId,
        setSelectedJourneyBranchId,
    } = useCriminalJourneyFilterOrchestrator();

    /**
     * رحلة القضية (stageJourney) + إصلاحها الذاتي + كل أعلام القراءة-فقط/الصلاحية المشتقة منها — orchestrator منفصل.
     */
    const {
        stageJourney,
        activeJourneyBranch,
        selectedJourneyNode,
        effectiveUiStage,
        showTrialsTab,
        isEffectiveTrialCourtStage,
        showJourneyReferralButton,
        isHistoricalNodeView,
        isInterventionReview,
        isCassationFilterReadOnly,
        isTimelineArchiveReadOnly,
        isPrejudicialFrozen,
        isInvestigationMaterialReadOnly,
        canCreateDecisionsOrRequests,
        isStatementsTabReadOnly,
        isOtherEvidenceReadOnly,
        isDecisionsTabMaterialReadOnly,
    } = useCriminalJourneyStageAccessOrchestrator({
        id,
        rawCase,
        criminalCase,
        stage,
        caseStage,
        isInvestigationPhase,
        isInvestigationDossierSealed,
        isInvestigationLocked,
        isDashboardReadOnly: effectiveDashboardReadOnly,
        isTrialCourtStage,
        isJuvenileTrial,
        isPrejudicialPostponed,
        selectedJourneyBranchId,
        setSelectedNodeFilter,
        setSelectedPartyFilterId,
        setSelectedJourneyBranchId,
    });

    /**
     * حالة مودالات/واجهات فرعية عديدة (state + setters فقط) — orchestrator منفصل.
     * مُعالِجات التمييز/الضم في useCriminalDashboardCassationMergeActions؛ غيرها تبقى هنا.
     */
    const modalUiState = useCriminalDashboardModalUiState({ id });
    const {
        isInvestigationDecisionOpen,
        setIsInvestigationDecisionOpen,
        investigationDecisionError,
        setInvestigationDecisionError,
        isSeveranceOpen,
        setIsSeveranceOpen,
        severanceError,
        setSeveranceError,
        isInlineSeveranceFormOpen,
        setIsInlineSeveranceFormOpen,
        linkedTimelineFromProcedural,
        setLinkedTimelineFromProcedural,
        proceduralNavTarget,
        setProceduralNavTarget,
        isStatementModalOpen,
        setIsStatementModalOpen,
        editingStatement,
        setEditingStatement,
        isOtherEvidenceFormOpen,
        setIsOtherEvidenceFormOpen,
        isTrialDepositionModalOpen,
        setIsTrialDepositionModalOpen,
        editingTrialDeposition,
        setEditingTrialDeposition,
        identityEditError,
        setIdentityEditError,
        identityEdit,
        setIdentityEdit,
        isTrashModalOpen,
        setIsTrashModalOpen,
        confirmAction,
        setConfirmAction,
        isReopenCaseOpen,
        setIsReopenCaseOpen,
        reopenCaseReason,
        setReopenCaseReason,
        isSendToCassationOpen,
        setIsSendToCassationOpen,
        cassationNumber,
        setCassationNumber,
        cassationSentDate,
        setCassationSentDate,
        cassationPanelName,
        setCassationPanelName,
        cassationType,
        setCassationType,
        cassationInterventionBasis,
        setCassationInterventionBasis,
        cassationAppellantIds,
        setCassationAppellantIds,
        cassationFilingDetails,
        setCassationFilingDetails,
        verdictCassationFilingCard,
        setVerdictCassationFilingCard,
        isMergeCasesOpen,
        setIsMergeCasesOpen,
        mergeTargetCaseId,
        setMergeTargetCaseId,
        mergeReason,
        setMergeReason,
        isStageFinalDecisionOpen,
        setIsStageFinalDecisionOpen,
        trialFinalDecisionSessionIdRef,
        stageFinalDecisionError,
        setStageFinalDecisionError,
        isLegalEditOpen,
        setIsLegalEditOpen,
        legalArticleNext,
        setLegalArticleNext,
        legalChangedBy,
        setLegalChangedBy,
        forfeitureModal,
        setForfeitureModal,
    } = modalUiState;

    const openInlineSeveranceForm = useCallback(() => {
        if (!resumePendingSeveranceForm()) return;
        setIsInlineSeveranceFormOpen(true);
    }, [resumePendingSeveranceForm]);

    const closeInlineSeveranceForm = useCallback(() => {
        stashPendingSeveranceForm();
        setIsInlineSeveranceFormOpen(false);
    }, [stashPendingSeveranceForm]);

    const [activeTab, setActiveTab] = useState<CriminalDashboardTab>('requests');
    // مزامنة فورية — startTransition كان يؤجّل التمييز فيبدو أن التبويب «لا يعمل»
    const switchDashboardTab = useCallback((tab: CriminalDashboardTab) => {
        setActiveTab(tab);
        prefetchCriminalDashboardTab(tab);
    }, []);
    const statementsTabActive = activeTab === 'statements';
    const requestsTabActive = activeTab === 'requests';

    /** مجموعات/قوائم القضية المشتقّة (إفادات، أدلة أخرى، طلبات مرتّبة، جلسات، بطاقات حكم) — hook منفصل. */
    const {
        statements,
        otherEvidenceItems,
        lawyerRequests,
        trialSessions,
        inferredStageFinalPresence,
        trialDepositions,
        currentAccusationArticle,
        sortedLawyerRequestsForNode,
        verdictCards,
        sortedTrialSessionsForDepositions,
        trialSessionsTabLabel,
    } = useCriminalDashboardCaseCollections({
        id,
        criminalCase,
        rawCase,
        requestsTabActive,
        statementsTabActive,
        stageJourney,
        selectedJourneyNode,
        isHistoricalNodeView,
        activeJourneyBranch,
        legalArticleHistory,
        effectiveUiStage,
        refreshVerdictCardLifecycles,
    });

    /**
     * سِجلّ القرارات: الفلاتر + الترقيم + مودالات الطعن التمييزي — orchestrator منفصل
     * (يضم أثر إعادة ضبط الترقيم عند تغيّر الفلاتر وإغلاق مودال الجلسات تلقائياً).
     */
    const {
        decisionsScopeFilter,
        setDecisionsScopeFilter,
        effectiveDecisionsScope,
        visibleLawyerRequestsCount,
        visibleJudicialDecisionsCount,
        setVisibleJudicialDecisionsCount,
        decisionsKindFilter,
        setDecisionsKindFilter,
        trialSessionAddModalOpen,
        setTrialSessionAddModalOpen,
        cassationAppealModal,
        setCassationAppealModal,
        cassationResultContext,
        setCassationResultContext,
        openAppealModal,
        handleInterventionCassation,
        handleDeclareJudgmentFinal,
        handleCassationCorrection,
        decisionsPageSize: DECISIONS_PAGE_SIZE,
    } = useCriminalDecisionsOrchestrator({
        effectiveUiStage,
        caseId: id,
        selectedNodeFilter,
        selectedJourneyBranchId,
    });

    /** تسخين استباقي (prefetch) + مزامنة فلتر نوع القرارات مع مرحلة/تبويب القضية — hook منفصل. */
    useCriminalDashboardIntentWarmup({
        id,
        requestsTabActive,
        hasJuvenileInCase,
        effectiveUiStage,
        showTrialsTab,
        decisionsKindFilter,
        setDecisionsKindFilter,
        setDecisionsScopeFilter,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
    });

    const { legalToast, setLegalToast } = useCriminalToastOrchestrator();
    const legalToastTimerRef = useRef<number | null>(null);

    const clearLegalToastTimer = useCallback(() => {
        if (legalToastTimerRef.current === null) return;
        window.clearTimeout(legalToastTimerRef.current);
        legalToastTimerRef.current = null;
    }, []);

    const showLegalToast = useCallback(
        (message: string, durationMs = 5000) => {
            setLegalToast(message);
            clearLegalToastTimer();
            if (!message || durationMs <= 0) return;
            legalToastTimerRef.current = window.setTimeout(() => {
                legalToastTimerRef.current = null;
                setLegalToast('');
            }, durationMs);
        },
        [clearLegalToastTimer, setLegalToast],
    );

    const handleClaimCaseOwnership = useCallback(() => {
        const err = claimCriminalCaseOwnership(id);
        if (err) showLegalToast(err);
        else showLegalToast('تم تملّك الإضبارة — يمكنك التعديل الآن.');
    }, [claimCriminalCaseOwnership, id, showLegalToast]);

    useEffect(() => () => clearLegalToastTimer(), [clearLegalToastTimer]);

    /**
     * حالة مودال الطلبات (قضائية + محامي) — orchestrator منفصل.
     * المسار النشط requestModalLane:
     *  - `'judicial'`: مودال «تقديم طلب إلى قرارات القاضي» (الزر الذهبي الأصلي).
     *  - `'lawyer'`: مودال «طلبات المحامي» (الزر الجديد بجانبه).
     * (quickFinalize* تُدار عبر useCriminalRequestQuickFinalizeController أدناه.)
     */
    const requestsOrchestrator = useCriminalRequestsOrchestrator();
    const { isRequestsModalOpen, requestMarginModalOpen, setRequestMarginModalOpen, editingRequestId } =
        requestsOrchestrator;
    const {
        quickFinalizeRequest,
        quickFinalizeStatus,
        quickFinalizeMargin,
        quickFinalizeDate,
        setQuickFinalizeStatus,
        setQuickFinalizeMargin,
        setQuickFinalizeDate,
        closeQuickFinalizeModal,
        openRequestQuickFinalizeModal: openRequestQuickFinalizeModalController,
        submitQuickFinalize: submitQuickFinalizeController,
    } = useCriminalRequestQuickFinalizeController();
    /** حالة مودال الغلق الختامي للمرحلة — orchestrator منفصل، تُمرَّر كاملة إلى StageCloserModal */
    const stageCloserOrchestrator = useCriminalStageCloserOrchestrator();
    const { setIsStageCloserOpen, setStageCloserError } = stageCloserOrchestrator;

    useEffect(() => {
        setIsStageCloserOpen(false);
        setStageCloserError('');
    }, [id, setIsStageCloserOpen, setStageCloserError]);

    /**
     * منطق مودال «الطلبات» المشتق + المُعالِجات + المزامنات الفرعية — orchestrator منفصل.
     * الحالة الخام تبقى في `requestsOrchestrator`؛ هذا الهوك يضيف طبقة المشتقّات
     * (صلاحية النموذج، أنواع الإدخال، الأقسام الظاهرة) والمُعالِجات (فتح/إغلاق/حفظ الطلب).
     */
    const {
        isRequestModalViewOnly,
        isRequestFinalStatus,
        reqDecisionBeforeRequest,
        mixedInvestigationScopedDefendantNames,
        requestEligibleParties,
        isCustomJudicialEntry,
        showJuvenileJudgeConcernedPartyPicker,
        showPurgeDefendantPicker,
        showUnknownPartyNoticeInRequestModal,
        autoRequestPartyLabel,
        customJudicialConcernedPartyOptions,
        customJudicialConcernedPartyId,
        showRequestPartySection,
        patchReqDetentionForParty,
        patchReqBailForParty,
        clearRequestEntryLane,
        modalLinkedRequest,
        applyJudicialTemplate,
        applyLawyerTemplate,
        openQuickBailFromDecision,
        openJudicialDecisionModal,
        openAdultJudicialDecisionModal,
        openJuvenileJudicialDecisionModal,
        openLawyerMotionModal,
        openRequestViewModal,
        openRequestQuickFinalizeModal,
        closeRequestsModal,
        reqNeedsDetentionDateRange,
        reqJuvenileDetentionLocked,
        showJuvenileArrestLegalHint,
        reqIsJudicialDecisionEntry,
        reqIsLawyerMotionEntry,
        reqIsOrderEnforcementEntry,
        reqIsComplaintReferralEntry,
        reqIsDefendantBailEntry,
        showPartyPickerFormUi,
        fugitiveDefendants,
        handleReqBailUnifiedChange,
        handleReqDetentionUnifiedChange,
        onAssetSeizureDraftsChange,
        requestFormBaseValid,
        requestFormFinalValid,
        submitRequest,
        submitQuickFinalize,
    } = useCriminalRequestsModalController({
        id,
        lawyerRequests,
        defendants,
        complainants,
        activeParties,
        partyScopeDefendants,
        ourRepresentation,
        isDefense,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        isAllDefendantsUnknown,
        unknownDefendantsForPartyDisplay,
        isMutualComplaint,
        activeLegalArticle,
        autoConcernedPartyId,
        isEffectiveTrialCourtStage,
        isInvestigationDossierSealed,
        requestsOrchestrator,
        setConfirmAction,
        setDecisionsKindFilter,
        showLegalToast,
        closeQuickFinalizeModal,
        openRequestQuickFinalizeModalController,
        submitQuickFinalizeController,
    });

    /**
     * سلة المهملات (نقل الطلبات/القرارات) + المراجع الإجرائية/التايم-لاين المرتبط + مودال التأكيد
     * العام + إعادة فتح القضية المغلقة + تعديل قابلية الطعن على أمر الحبس — hook منفصل.
     */
    const {
        showLegalError,
        handleMoveRequestToTrash,
        handleMoveDecisionToTrash,
        handleRequestOrderProceedingsBlockChange,
        getProceduralRefsForRequest,
        activeRequestProceduralReferences,
        linkedTimelineProceduralReferences,
        navigateToProceduralItem,
        openProceduralLinkedRecord,
        closeConfirmAction,
        runConfirmAction,
        openReopenCase,
        submitReopenCase,
    } = useCriminalDashboardTrashProceduralHandlers({
        id,
        criminalCase,
        editingRequestId,
        lawyerRequests,
        linkedTimelineFromProcedural,
        setLinkedTimelineFromProcedural,
        setProceduralNavTarget,
        setActiveTab,
        isRequestsModalOpen,
        closeRequestsModal,
        openRequestViewModal,
        confirmAction,
        setConfirmAction,
        moveLawyerRequestToTrash,
        moveJudicialDecisionToTrash,
        patchJudicialDecisionLifecycle,
        reopenClosedCase,
        reopenCaseReason,
        setReopenCaseReason,
        setIsReopenCaseOpen,
        showLegalToast,
    });

    /** رجوع تدريجي (Escape/زر الرجوع) — orchestrator منفصل يغلق أعلى طبقة مفتوحة تدريجياً. */
    const { handleDashboardBack } = useCriminalDashboardNavigationGuard({
        activeTab,
        switchDashboardTab,
        onClose,
        confirmAction,
        setConfirmAction,
        cassationResultContext,
        setCassationResultContext,
        cassationAppealModal,
        setCassationAppealModal,
        quickFinalizeRequest,
        closeQuickFinalizeModal,
        requestMarginModalOpen,
        setRequestMarginModalOpen,
        isRequestsModalOpen,
        closeRequestsModal,
        linkedTimelineFromProcedural,
        setLinkedTimelineFromProcedural,
        isStatementModalOpen,
        setIsStatementModalOpen,
        setEditingStatement,
        isTrialDepositionModalOpen,
        setIsTrialDepositionModalOpen,
        setEditingTrialDeposition,
        isOtherEvidenceFormOpen,
        setIsOtherEvidenceFormOpen,
        isTrashModalOpen,
        setIsTrashModalOpen,
        isReopenCaseOpen,
        setIsReopenCaseOpen,
        isSendToCassationOpen,
        setIsSendToCassationOpen,
        isMergeCasesOpen,
        setIsMergeCasesOpen,
        isStageCloserOpen: stageCloserOrchestrator.isStageCloserOpen,
        setIsStageCloserOpen,
        isLegalEditOpen,
        setIsLegalEditOpen,
        isInvestigationDecisionOpen,
        setIsInvestigationDecisionOpen,
        isSeveranceOpen,
        setIsSeveranceOpen,
        isInlineSeveranceFormOpen,
        setIsInlineSeveranceFormOpen,
        identityEdit,
        setIdentityEdit,
        forfeitureModal,
        setForfeitureModal,
        selectedPartyFilterId,
        setSelectedPartyFilterId,
        selectedJourneyBranchId,
        setSelectedJourneyBranchId,
        selectedNodeFilter,
        setSelectedNodeFilter,
        proceduralNavTarget,
        setProceduralNavTarget,
        isStageFinalDecisionOpen,
        setIsStageFinalDecisionOpen,
        verdictCassationFilingCard,
        setVerdictCassationFilingCard,
        trialSessionAddModalOpen,
        setTrialSessionAddModalOpen,
    });

    /**
     * مدخل «القرار الختامي» بكل تفرّعاته + مودالات الغلق الختامي/التعديل القانوني/التحقيق
     * الاجتماعي للقاصر + مصادرة الكفالة — hook منفصل.
     */
    const {
        openForfeitureUpdate,
        submitLegalEdit,
        patchSocialInquiryReport,
        caseSovereignContext,
        openInvestigationDecisionModal,
        openDefaultJudgmentOpposition,
        isTemporaryClosingFollowUpStage,
        showInvestigationFinalDecisionAction,
        finalDecisionActionLabel,
        showInvestigationReferralInJourney,
        showFinalDecisionInCriminalHeader,
        openTrialReferralOrders,
        openFinalDecisionEntry,
        openStageFinalDecisionFromTrialSession,
        submitStageFinalDecision,
    } = useCriminalDashboardFinalDecisionEntry({
        id,
        criminalCase,
        rawCase,
        stage,
        isInvestigationPhase,
        isTrialCourtStage,
        isJuvenileTrial,
        isCassationStage,
        isPrejudicialFrozen,
        isTimelineArchiveReadOnly,
        isDashboardReadOnly: effectiveDashboardReadOnly,
        isInvestigationDossierSealed,
        isArchived,
        isDefaultJudgmentArchived,
        finalDecision,
        showTrialsTab,
        showJourneyReferralButton,
        defendants,
        investigationHasMixedUnknownAndIdentified,
        investigationDefendantsPartyMix,
        firstJuvenileDefendant,
        modalUiState,
        stageCloserOrchestrator,
        openJudicialDecisionModal,
        setTrialSessionAddModalOpen,
        ensureCaseSovereignContext,
        registerStageFinalDecision,
        syncTrialSessionVerdictFromStageFinal,
        updateJuvenileSocialInquiryReport,
        updateLegalArticle,
        showLegalToast,
        showLegalError,
    });

    const { submitStageCloser } = useCriminalStageCloserSubmit({
        caseId: id,
        stage,
        defendants,
        juvenileDefendants,
        isJuvenileTrial,
        isPrivateRightWaived,
        closer: stageCloserOrchestrator,
        setInvestigationDecisionError,
        showLegalError,
        waivePrivateRight,
        severJuvenileDefendantToJuvenileCourt,
        referAndGenerateCase,
        issueStageDecision,
    });

    /** دوالّ عرض بطاقات الإفادات وأدلة الإثبات الأخرى (مع طلب النقل إلى سلة المهملات) — hook منفصل. */
    const { renderStatementCard, renderOtherEvidenceCard } = useCriminalDashboardEvidenceCardRenderers({
        id,
        stageJourney,
        complainants,
        defendants,
        isStatementsTabReadOnly,
        isOtherEvidenceReadOnly,
        moveStatementToTrash,
        moveOtherEvidenceToTrash,
        setConfirmAction,
        showLegalToast,
    });

    /** لافتات التمييز (عدّاد الموعد، تنبيهات الغياب) ومشتقّات ضم الإضبارات — hook منفصل. */
    const {
        mandatoryCassationAutoSend,
        availableCassationFilingTypes,
        showCassationCountdownBanner,
        inAbsentiaBanners,
        mergedCaseIds,
        mergedCaseDisplayLinks,
        canShowMergeMenuItem,
        isMergeMenuItemDisabled,
    } = useCriminalDashboardCaseBanners({
        criminalCase,
        displayCasesById,
        stage,
        caseStage,
        defendants,
        finalDecision,
        isSentToCassation,
        isArchived,
        isEffectivelyArchived,
        isDashboardReadOnly: effectiveDashboardReadOnly,
    });

    const {
        sendToCassationOnVerdictCard,
        submitSendToCassation,
        openMergeCases,
        submitMergeCases,
    } = useCriminalDashboardCassationMergeActions({
        caseId: id,
        stage,
        caseStage,
        defendantIds: defendants.map((d) => d.id),
        showCassationCountdownBanner,
        isDecisionsTabMaterialReadOnly,
        mandatoryCassationAutoSend,
        cassationNumber,
        cassationSentDate,
        cassationPanelName,
        cassationType,
        cassationInterventionBasis,
        cassationAppellantIds,
        cassationFilingDetails,
        mergeTargetCaseId,
        mergeReason,
        setCassationNumber,
        setCassationSentDate,
        setCassationPanelName,
        setCassationFilingDetails,
        setCassationType,
        setCassationInterventionBasis,
        setCassationAppellantIds,
        setIsSendToCassationOpen,
        setMergeTargetCaseId,
        setMergeReason,
        setIsMergeCasesOpen,
        initiateCassationProceeding,
        mergeCases,
        showLegalToast,
    });

    const dossierBodyProps = useCriminalDashboardDossierBodyProps({
        id, onClose, onExitToHome, onOpenCase, handleDashboardBack, criminalCase,
        caseStage, shouldShowMandatoryCassationBanner, shouldShowArticle3DeadlineBanner, article3ElapsedDays,
        isOwnerAccessDenied: isAccessDenied,
        isOrphanLegacyCase,
        onClaimCaseOwnership: isOrphanLegacyCase ? handleClaimCaseOwnership : undefined,
        pendingSeveranceContext, isInlineSeveranceFormOpen, openInlineSeveranceForm, isPrejudicialFrozen,
        isInterventionReview, isCassationFilterReadOnly, selectedJourneyNode, headerTitle,
        stage, activeLegalArticle, isMutualComplaint, isFrozen,
        hasPendingBail, confirmBailAfterAppeal, pendingBailDefendantIds, finalDecision,
        isArchived, openReopenCase, canManageDossier: effectiveCanManageDossier, canShowMergeMenuItem,
        isMergeMenuItemDisabled, openMergeCases, mergedCaseDisplayLinks, mergedCaseIds,
        canEditIdentity, showEditVenueIdentity, isTimelineArchiveReadOnly, setIdentityEditError,
        setIdentityEdit, isEffectivelyArchived, isInvestigationDossierSealed, allowSeveranceOrDossierStrike,
        allowDefendantSeverance, setSeveranceError, setIsSeveranceOpen, physicalLocation,
        physicalLocationCustomName, updateCasePhysicalLocation, showLegalError, showFinalDecisionInCriminalHeader,
        finalDecisionActionLabel, openDefaultJudgmentOpposition, isTemporaryClosingFollowUpStage, showInvestigationFinalDecisionAction,
        openFinalDecisionEntry, investigationDossierSealLabel, investigationDossierClosure, setIsTrashModalOpen,
        trashCount, isInvestigationPhase, showEndTemporaryClosureAction, endInvestigationTemporaryClosure,
        showLegalToast, stageJourney, defendants, selectedNodeFilter,
        selectedPartyFilterId, selectedJourneyBranchId, setSelectedNodeFilter, setSelectedPartyFilterId,
        setSelectedJourneyBranchId, showInvestigationReferralInJourney, showJourneyReferralButton, openInvestigationDecisionModal,
        openTrialReferralOrders, isDashboardReadOnly: effectiveDashboardReadOnly, mergedIntoCaseId, mergedIntoCaseNumber,
        isSentToCassation, cassationCaseDetails, inAbsentiaBanners, isDefense,
        fileInAbsentiaObjection, displayComplainants, visibleDefendants, crimeType,
        hasUnrevealedUnknown, isPrivateRightWaived, waiverDate, ourRepresentation,
        isStageCloserOpen: stageCloserOrchestrator.isStageCloserOpen, isStatementModalOpen, isTrialDepositionModalOpen, isRequestsModalOpen,
        confirmAction, openForfeitureUpdate, switchDashboardTab, activeTab,
        handleDashboardBack, setIsOtherEvidenceFormOpen, isOtherEvidenceReadOnly, isEffectiveTrialCourtStage,
        setEditingTrialDeposition, setIsTrialDepositionModalOpen, setEditingStatement, setIsStatementModalOpen,
        isStatementsTabReadOnly, isOtherEvidenceFormOpen, addOtherEvidenceItem, statementsTabActive,
        statements, otherEvidenceItems, trialDepositions, trialSessions,
        isHistoricalNodeView, activeJourneyBranch, updateTrialDeposition, deleteTrialDeposition,
        renderStatementCard, renderOtherEvidenceCard, hasJuvenileInCase, isInvestigationMaterialReadOnly,
        openProceduralLinkedRecord, proceduralNavTarget, setProceduralNavTarget, decisionsKindFilter,
        setDecisionsKindFilter, showTrialsTab, trialSessionsTabLabel, setTrialSessionAddModalOpen,
        openAdultJudicialDecisionModal, openJuvenileJudicialDecisionModal, openLawyerMotionModal, canCreateDecisionsOrRequests,
        decisionsScopeFilter, setDecisionsScopeFilter, effectiveDecisionsScope, effectiveUiStage,
        isDecisionsTabMaterialReadOnly, criminalCaseUserRole, sendToCassationOnVerdictCard, updateVerdictCardDraft,
        patchVerdictCardOrdinaryAppeal, recordVerdictCardCassationResult, patchVerdictCardCorrectionAppeal, recordVerdictAbsentiaPublication,
        recordVerdictAbsentiaObjection, setVerdictCassationFilingCard, sortedLawyerRequestsForNode, verdictCards,
        trialSessionAddModalOpen, addTrialSession, updateTrialSession, documentTrialSessionPreparatoryDecision,
        postponeTrialSession, registerInitialTrialHearingDate, openStageFinalDecisionFromTrialSession, openAppealModal, handleInterventionCassation,
        handleCassationCorrection, handleDeclareJudgmentFinal, currentAccusationArticle, allParties,
        setCassationResultContext, handleRequestOrderProceedingsBlockChange, addRequestMargin, toggleRequestStar,
        getProceduralRefsForRequest, navigateToProceduralItem, handleMoveDecisionToTrash, handleMoveRequestToTrash,
        openRequestQuickFinalizeModal, primaryDefendant, autoConcernedPartyId, openQuickBailFromDecision,
        extendDetentionOnDecision, documentDetentionReleaseOnDecision, updateOrderEnforcementOnDecision, visibleLawyerRequestsCount,
        visibleJudicialDecisionsCount, setVisibleJudicialDecisionsCount, decisionsPageSize: DECISIONS_PAGE_SIZE,
    });

    const modalsHostProps = assembleCriminalDashboardModalsHostProps({
        id, defendants, complainants, criminalCase,
        activeParties, isMutualComplaint, isInvestigationPhase, activeLegalArticle,
        isTimelineArchiveReadOnly, isDashboardReadOnly: effectiveDashboardReadOnly, canManageDossier: effectiveCanManageDossier, onOpenCase,
        showLegalToast, showLegalError, cassationAppealModal, setCassationAppealModal,
        declareJudicialDecisionFinal, fileJudicialDecisionAppeal, cassationResultContext, setCassationResultContext,
        recordJudicialAppealResult, isInvestigationDecisionOpen, setIsInvestigationDecisionOpen, investigationDecisionError,
        setInvestigationDecisionError, hasUnrevealedUnknown, referInvestigationDefendantToTrial, applyInvestigationReferral,
        isSeveranceOpen, setIsSeveranceOpen, severanceError, setSeveranceError,
        investigationDefendantsPartyMix, beginSeveranceFromDossier, openInlineSeveranceForm, caseSovereignContext,
        isStageFinalDecisionOpen, setIsStageFinalDecisionOpen, trialFinalDecisionSessionIdRef, stageFinalDecisionError,
        setStageFinalDecisionError, inferredStageFinalPresence, submitStageFinalDecision, isStageCloserOpen: stageCloserOrchestrator.isStageCloserOpen,
        stageCloserOrchestrator, caseStage, isCassationStage, isJuvenileTrial,
        isTrialCourtStage, isPrivateRightWaived, juvenileAccused, firstJuvenileDefendant,
        firstJuvenileSocialWorkflow, patchSocialInquiryReport, submitStageCloser, isLegalEditOpen,
        setIsLegalEditOpen, legalArticleNext, setLegalArticleNext, legalChangedBy,
        setLegalChangedBy, submitLegalEdit, activeTab, isStatementModalOpen,
        setIsStatementModalOpen, editingStatement, setEditingStatement, statementEligibleDefendants,
        ourRepresentation, addStatement, updateStatement, isEffectiveTrialCourtStage,
        isTrialDepositionModalOpen, setIsTrialDepositionModalOpen, editingTrialDeposition, setEditingTrialDeposition,
        sortedTrialSessionsForDepositions, addTrialDeposition, updateTrialDeposition, isRequestsModalOpen,
        requestsOrchestrator, isRequestModalViewOnly, mixedInvestigationScopedDefendantNames, reqJuvenileDetentionLocked,
        isAllDefendantsUnknown, reqNeedsDetentionDateRange, reqIsOrderEnforcementEntry, isRequestFinalStatus,
        reqDecisionBeforeRequest, reqIsJudicialDecisionEntry, reqIsLawyerMotionEntry, reqIsDefendantBailEntry,
        reqIsComplaintReferralEntry, isCustomJudicialEntry, requestFormBaseValid, requestFormFinalValid,
        showPurgeDefendantPicker, showRequestPartySection, showPartyPickerFormUi, showJuvenileJudgeConcernedPartyPicker,
        showUnknownPartyNoticeInRequestModal, showJuvenileArrestLegalHint, allParties, requestEligibleParties,
        fugitiveDefendants, customJudicialConcernedPartyOptions, customJudicialConcernedPartyId, autoRequestPartyLabel,
        autoConcernedPartyLabel, unknownDefendantsForPartyDisplay, modalLinkedRequest, activeRequestProceduralReferences,
        closeRequestsModal, submitRequest, applyJudicialTemplate, applyLawyerTemplate,
        clearRequestEntryLane, onAssetSeizureDraftsChange, patchReqBailForParty, patchReqDetentionForParty,
        handleReqBailUnifiedChange, handleReqDetentionUnifiedChange, navigateToProceduralItem, toggleRequestStar,
        addRequestAttachment, removeRequestAttachment, requestMarginModalOpen, setRequestMarginModalOpen,
        editingRequestId, addRequestMargin, quickFinalizeRequest, quickFinalizeStatus,
        quickFinalizeMargin, quickFinalizeDate, setQuickFinalizeStatus, setQuickFinalizeMargin,
        setQuickFinalizeDate, closeQuickFinalizeModal, submitQuickFinalize, linkedTimelineFromProcedural,
        setLinkedTimelineFromProcedural, linkedTimelineProceduralReferences, isReopenCaseOpen, setIsReopenCaseOpen,
        reopenCaseReason, setReopenCaseReason, submitReopenCase, isSendToCassationOpen,
        setIsSendToCassationOpen, availableCassationFilingTypes, cassationType, setCassationType,
        cassationInterventionBasis, setCassationInterventionBasis, cassationNumber, setCassationNumber,
        cassationPanelName, setCassationPanelName, cassationAppellantIds, setCassationAppellantIds,
        submitSendToCassation, verdictCassationFilingCard, setVerdictCassationFilingCard, effectiveUiStage,
        isDecisionsTabMaterialReadOnly, patchVerdictCardOrdinaryAppeal, identityEdit, setIdentityEdit,
        identityEditError, setIdentityEditError, correctCasePartyName, showEditInvestigationCourt,
        showEditTrialCourt, showEditDeposition, depositEntityName, isTrialPhase,
        correctCaseLegalArticle, correctCaseCourtName, correctCaseDepositionLocation, correctCaseReferenceNumbers,
        isTrashModalOpen, setIsTrashModalOpen, trashItems, restoreTrashItem,
        purgeTrashItem, setConfirmAction, isMergeCasesOpen, setIsMergeCasesOpen,
        headerTitle, mergeTargetCaseId, setMergeTargetCaseId, mergeReason,
        setMergeReason, submitMergeCases, confirmAction, runConfirmAction,
        closeConfirmAction, forfeitureModal, setForfeitureModal, updateBailForfeiture,
    });

    const forceModalsHost = computeCriminalDashboardForceModalsHost({
        isInvestigationDecisionOpen,
        isSeveranceOpen,
        isInlineSeveranceFormOpen,
        isStatementModalOpen,
        isOtherEvidenceFormOpen,
        isTrialDepositionModalOpen,
        isTrashModalOpen,
        isReopenCaseOpen,
        isSendToCassationOpen,
        isMergeCasesOpen,
        isStageFinalDecisionOpen,
        isLegalEditOpen,
        isRequestsModalOpen,
        requestMarginModalOpen,
        stageCloserOrchestrator,
        confirmAction,
        forfeitureModal,
        cassationAppealModal,
        identityEdit,
        quickFinalizeRequest,
        verdictCassationFilingCard,
    });

    const { modalsHostMounted } = useCriminalDashboardShellPrefetch(forceModalsHost);

    return {
        isCaseHydrating,
        isMissingCase,
        missingRecoveryDone,
        criminalCase,
        legalToast,
        dossierBodyProps,
        modalsHostProps,
        modalsHostMounted,
        forceModalsHost,
        isInlineSeveranceFormOpen,
        pendingSeveranceContext,
        closeInlineSeveranceForm,
        setIsInlineSeveranceFormOpen,
    };
}
