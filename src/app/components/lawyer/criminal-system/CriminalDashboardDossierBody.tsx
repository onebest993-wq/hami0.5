import React, { Suspense, type ComponentProps, type Dispatch, type SetStateAction } from 'react';
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
    LazyCriminalPartiesGrid,
    LazyCriminalDashboardRequestsTab,
    LazyCriminalDashboardStatementsTab,
    LazyCriminalDashboardTrackingTab,
    LazyLegalCodesTab,
    prefetchCriminalDashboardTab,
} from './criminalDashboardLazyRegistry';
import {
    criminalDashboardTabClass,
    CRIMINAL_DASHBOARD_TAB_LABELS,
    resolveCriminalDashboardTabLabel,
    type CriminalDashboardTab,
} from './criminalDashboardTabChrome';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';
import { isInvestigationStoredStage } from './criminalStageRuntimeCore';
import { getPendingCassationAppealForResult } from './judicialDecisionsEngine';
import {
    CriminalDossierTopBanners,
    CriminalDossierMidBanners,
    type CriminalDossierMidBannersProps,
} from './components/CriminalDossierStatusBanners';
import { CaseJourneyHeader } from './components/CaseJourneyHeader';
import { GuarantorForfeitureStrip } from './components/GuarantorForfeitureStrip';
import { OtherEvidenceEntryForm } from './components/OtherEvidenceEntryForm';
import { CriminalDashboardLazySurfaceFallback } from './criminalDashboardRuntimeShells';

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
    renderStatementCard: (statement: Statement) => React.ReactNode;
    renderOtherEvidenceCard: (item: OtherEvidenceItem) => React.ReactNode;

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

/**
 * جسد الإضبارة الجزائية الرئيسي — مستخرَج من CriminalDashboardResolvedRuntime ضمن تفكيك
 * المكوّن العملاق. لا منطق جديد هنا: نفس الـ JSX وأصله بحرفيته (الهيدر، اللافتات، شبكة
 * الأطراف، شريط التبويبات، وألواح التبويبات الثلاثة)، فقط القيم/الأفعال أصبحت props صريحة
 * بدل الإغلاق على النطاق الخارجي. مضيف المودالات المنفصل والغطاء الداخلي لتفريق الدعوى
 * يبقيان في الـ Runtime.
 */
export function CriminalDashboardDossierBody(props: CriminalDashboardDossierBodyProps) {
    const {
        id,
        onOpenCase,
        criminalCase,
        caseStage,
        shouldShowMandatoryCassationBanner,
        shouldShowArticle3DeadlineBanner,
        article3ElapsedDays,
        isOwnerAccessDenied,
        isOrphanLegacyCase,
        onClaimCaseOwnership,
        pendingSeveranceContext,
        isInlineSeveranceFormOpen,
        openInlineSeveranceForm,
        isPrejudicialFrozen,
        isInterventionReview,
        isCassationFilterReadOnly,
        selectedJourneyNode,
        headerTitle,
        stage,
        activeLegalArticle,
        isMutualComplaint,
        isFrozen,
        hasPendingBail,
        confirmBailAfterAppeal,
        pendingBailDefendantIds,
        finalDecision,
        isArchived,
        openReopenCase,
        canManageDossier,
        canShowMergeMenuItem,
        isMergeMenuItemDisabled,
        openMergeCases,
        mergedCaseDisplayLinks,
        mergedCaseIds,
        canEditIdentity,
        showEditVenueIdentity,
        isTimelineArchiveReadOnly,
        setIdentityEditError,
        setIdentityEdit,
        isEffectivelyArchived,
        isInvestigationDossierSealed,
        allowSeveranceOrDossierStrike,
        allowDefendantSeverance,
        setSeveranceError,
        setIsSeveranceOpen,
        physicalLocation,
        physicalLocationCustomName,
        updateCasePhysicalLocation,
        showLegalError,
        showFinalDecisionInCriminalHeader,
        finalDecisionActionLabel,
        openDefaultJudgmentOpposition,
        isTemporaryClosingFollowUpStage,
        showInvestigationFinalDecisionAction,
        openFinalDecisionEntry,
        investigationDossierSealLabel,
        investigationDossierClosure,
        setIsTrashModalOpen,
        trashCount,
        isInvestigationPhase,
        showEndTemporaryClosureAction,
        endInvestigationTemporaryClosure,
        showLegalToast,
        stageJourney,
        defendants,
        selectedNodeFilter,
        selectedPartyFilterId,
        selectedJourneyBranchId,
        setSelectedNodeFilter,
        setSelectedPartyFilterId,
        setSelectedJourneyBranchId,
        showInvestigationReferralInJourney,
        showJourneyReferralButton,
        openInvestigationDecisionModal,
        openTrialReferralOrders,
        isDashboardReadOnly,
        mergedIntoCaseId,
        mergedIntoCaseNumber,
        isSentToCassation,
        cassationCaseDetails,
        inAbsentiaBanners,
        isDefense,
        fileInAbsentiaObjection,
        displayComplainants,
        visibleDefendants,
        crimeType,
        hasUnrevealedUnknown,
        isPrivateRightWaived,
        waiverDate,
        ourRepresentation,
        isStageCloserOpen,
        isStatementModalOpen,
        isTrialDepositionModalOpen,
        isRequestsModalOpen,
        confirmAction,
        openForfeitureUpdate,
        switchDashboardTab,
        activeTab,
        onClose,
        onExitToHome,
        handleDashboardBack,
        setIsOtherEvidenceFormOpen,
        isOtherEvidenceReadOnly,
        isEffectiveTrialCourtStage,
        setEditingTrialDeposition,
        setIsTrialDepositionModalOpen,
        setEditingStatement,
        setIsStatementModalOpen,
        isStatementsTabReadOnly,
        isOtherEvidenceFormOpen,
        addOtherEvidenceItem,
        statementsTabActive,
        statements,
        otherEvidenceItems,
        trialDepositions,
        trialSessions,
        isHistoricalNodeView,
        activeJourneyBranch,
        updateTrialDeposition,
        deleteTrialDeposition,
        renderStatementCard,
        renderOtherEvidenceCard,
        hasJuvenileInCase,
        isInvestigationMaterialReadOnly,
        openProceduralLinkedRecord,
        proceduralNavTarget,
        setProceduralNavTarget,
        decisionsKindFilter,
        setDecisionsKindFilter,
        showTrialsTab,
        trialSessionsTabLabel,
        setTrialSessionAddModalOpen,
        openAdultJudicialDecisionModal,
        openJuvenileJudicialDecisionModal,
        openLawyerMotionModal,
        canCreateDecisionsOrRequests,
        decisionsScopeFilter,
        setDecisionsScopeFilter,
        effectiveDecisionsScope,
        effectiveUiStage,
        isDecisionsTabMaterialReadOnly,
        criminalCaseUserRole,
        sendToCassationOnVerdictCard,
        updateVerdictCardDraft,
        patchVerdictCardOrdinaryAppeal,
        recordVerdictCardCassationResult,
        patchVerdictCardCorrectionAppeal,
        recordVerdictAbsentiaPublication,
        recordVerdictAbsentiaObjection,
        setVerdictCassationFilingCard,
        sortedLawyerRequestsForNode,
        verdictCards,
        trialSessionAddModalOpen,
        addTrialSession,
        updateTrialSession,
        documentTrialSessionPreparatoryDecision,
        postponeTrialSession,
        registerInitialTrialHearingDate,
        openStageFinalDecisionFromTrialSession,
        openAppealModal,
        handleInterventionCassation,
        handleCassationCorrection,
        handleDeclareJudgmentFinal,
        currentAccusationArticle,
        allParties,
        setCassationResultContext,
        handleRequestOrderProceedingsBlockChange,
        addRequestMargin,
        toggleRequestStar,
        getProceduralRefsForRequest,
        navigateToProceduralItem,
        handleMoveDecisionToTrash,
        handleMoveRequestToTrash,
        openRequestQuickFinalizeModal,
        primaryDefendant,
        autoConcernedPartyId,
        openQuickBailFromDecision,
        extendDetentionOnDecision,
        documentDetentionReleaseOnDecision,
        updateOrderEnforcementOnDecision,
        visibleLawyerRequestsCount,
        visibleJudicialDecisionsCount,
        setVisibleJudicialDecisionsCount,
        decisionsPageSize,
    } = props;

    return (
        <>
            <CriminalDossierTopBanners
                shouldShowMandatoryCassationBanner={shouldShowMandatoryCassationBanner}
                shouldShowArticle3DeadlineBanner={shouldShowArticle3DeadlineBanner}
                article3ElapsedDays={article3ElapsedDays}
                pendingSeveranceParentMatch={pendingSeveranceContext?.parentCaseId === id}
                isInlineSeveranceFormOpen={isInlineSeveranceFormOpen}
                parentCaseId={id}
                onResumeSeverance={openInlineSeveranceForm}
                isPrejudicialFrozen={isPrejudicialFrozen}
                isInterventionReview={isInterventionReview}
                isCassationFilterReadOnly={isCassationFilterReadOnly}
                selectedJourneyNodeLabel={selectedJourneyNode?.label}
                isOwnerAccessDenied={isOwnerAccessDenied}
                isOrphanLegacyCase={isOrphanLegacyCase}
                onClaimCaseOwnership={onClaimCaseOwnership}
            />
            <Suspense
                fallback={<div className="min-h-[96px] border-b border-white/[0.06] bg-[#1b1511]/70" aria-hidden />}
            >
                <LazyCriminalDashboardHeader
                    key={id}
                    onNavBack={handleDashboardBack}
                    onNavExit={onExitToHome}
                    headerTitle={headerTitle}
                    stage={stage}
                    activeLegalArticle={activeLegalArticle}
                    isMutualComplaint={isMutualComplaint}
                    isFrozen={isFrozen}
                    hasPendingBail={hasPendingBail}
                    canConfirmPendingBail={hasPendingBail}
                    onConfirmPendingBail={() => confirmBailAfterAppeal(id, pendingBailDefendantIds)}
                    showReopenClosedCase={
                        isInvestigationStoredStage(stage) &&
                        Boolean(finalDecision) &&
                        finalDecision?.decisionType !== 'referral' &&
                        !isArchived
                    }
                    onOpenReopenClosedCase={openReopenCase}
                    canManageDossier={canManageDossier}
                    showMergeCases={canShowMergeMenuItem}
                    mergeCasesDisabled={isMergeMenuItemDisabled}
                    onOpenMergeCases={openMergeCases}
                    mergedCaseDisplayLinks={mergedCaseDisplayLinks}
                    isUnifiedParentDossier={mergedCaseIds.length > 0}
                    onOpenMergedChildCase={onOpenCase}
                    canEditIdentity={canEditIdentity}
                    showEditHeaderInfo={showEditVenueIdentity && !isTimelineArchiveReadOnly}
                    onEditHeaderInfo={() => {
                        setIdentityEditError('');
                        setIdentityEdit({ mode: 'venue' });
                    }}
                    showSeverance={
                        canManageDossier &&
                        !isEffectivelyArchived &&
                        !isInvestigationDossierSealed &&
                        allowSeveranceOrDossierStrike &&
                        allowDefendantSeverance
                    }
                    onOpenSeverance={() => {
                        setSeveranceError('');
                        setIsSeveranceOpen(true);
                    }}
                    finalDecision={finalDecision}
                    physicalLocation={physicalLocation}
                    physicalLocationCustomName={physicalLocationCustomName}
                    onUpdatePhysicalLocation={(loc, custom) => {
                        try {
                            updateCasePhysicalLocation(id, loc, custom);
                        } catch {
                            showLegalError();
                        }
                    }}
                    showFinalDecisionAction={showFinalDecisionInCriminalHeader}
                    finalDecisionLabel={finalDecisionActionLabel}
                    finalDecisionTitle={
                        openDefaultJudgmentOpposition
                            ? 'تقديم طعن واعتراض معارضة غيابية يكسر الأرشفة ويفتح محاكمة وجاهية'
                            : isTemporaryClosingFollowUpStage
                              ? 'متابعة بعد الغلق المؤقت — قرارات القاضي (غلق، صلح، أو إحالة)'
                              : showInvestigationFinalDecisionAction
                                ? 'إحالة الإضبارة إلى محكمة الموضوع (جنح أو جنايات)'
                                : 'إحالة، غلق، انقضاء، أو حكم — ينقل الإضبارة بين المراحل الإجرائية'
                    }
                    onOpenFinalDecision={openFinalDecisionEntry}
                    investigationDossierSealLabel={investigationDossierSealLabel}
                    investigationDossierIsFinalClosure={investigationDossierClosure?.kind === 'final'}
                    onOpenTrash={() => setIsTrashModalOpen(true)}
                    trashCount={trashCount}
                    showEndTemporaryClosureAction={isInvestigationPhase && showEndTemporaryClosureAction}
                    onEndTemporaryClosure={() => {
                        const err = endInvestigationTemporaryClosure(id);
                        if (err) {
                            showLegalToast(err, 5000);
                            return;
                        }
                        showLegalToast('✓ تم إعادة الشكوى وإنهاء الغلق المؤقت — الإضبارة نشطة مجدداً.', 5000);
                    }}
                />
            </Suspense>
            <CaseJourneyHeader
                journey={stageJourney}
                defendants={defendants}
                selectedNodeId={selectedNodeFilter}
                selectedPartyId={selectedPartyFilterId}
                selectedBranchId={selectedJourneyBranchId}
                onSelectNode={setSelectedNodeFilter}
                onSelectParty={setSelectedPartyFilterId}
                onSelectBranch={setSelectedJourneyBranchId}
                showReferralButton={showInvestigationReferralInJourney || showJourneyReferralButton}
                onOpenReferral={() => {
                    if (showInvestigationReferralInJourney) {
                        openInvestigationDecisionModal();
                        return;
                    }
                    openTrialReferralOrders();
                }}
                referralButtonLabel={showInvestigationReferralInJourney ? 'الإحالة' : 'إحالة'}
                referralButtonTitle={
                    showInvestigationReferralInJourney
                        ? 'إحالة الإضبارة إلى محكمة الموضوع (جنح أو جنايات)'
                        : 'إحالة أو تبديل اختصاص'
                }
                referralButtonDisabled={
                    isTimelineArchiveReadOnly || isDashboardReadOnly || isPrejudicialFrozen
                }
            />

            <CriminalDossierMidBanners
                isDashboardReadOnly={isDashboardReadOnly}
                mergedIntoCaseId={mergedIntoCaseId}
                mergedIntoCaseNumber={mergedIntoCaseNumber}
                onOpenMergedParent={onOpenCase}
                isSentToCassation={Boolean(isSentToCassation && cassationCaseDetails)}
                cassationNumber={cassationCaseDetails?.cassationNumber}
                cassationSentDate={cassationCaseDetails?.sentDate}
                inAbsentiaBanners={inAbsentiaBanners}
                isDefense={isDefense}
                onFileInAbsentiaObjection={(defendantId) => {
                    try {
                        fileInAbsentiaObjection(id, defendantId);
                    } catch {
                        showLegalError();
                    }
                }}
            />

            <div
                className={
                    isDashboardReadOnly
                        ? 'select-none opacity-55 print:opacity-100'
                        : ''
                }
            >
            <Suspense fallback={<CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[200px]" />}>
            <LazyCriminalPartiesGrid
                caseId={id}
                complainants={displayComplainants}
                defendants={visibleDefendants}
                crimeType={crimeType}
                stage={stage}
                isMutualComplaint={isMutualComplaint}
                isUnknownPerpetrator={hasUnrevealedUnknown}
                isFrozen={isFrozen || isDashboardReadOnly}
                isPrivateRightWaived={isPrivateRightWaived}
                waiverDate={waiverDate}
                showDetentionIndicators={isDefense}
                isConfidential={false}
                ourRepresentation={ourRepresentation}
                lockPartyMenus={
                    isStageCloserOpen ||
                    isStatementModalOpen ||
                    isTrialDepositionModalOpen ||
                    isRequestsModalOpen ||
                    Boolean(confirmAction)
                }
                canEditPartyNames={canEditIdentity}
                onEditPartyName={(kind, partyId, snapshot) => {
                    setIdentityEditError('');
                    setIdentityEdit({
                        mode: 'party',
                        kind,
                        id: partyId,
                        fullName: snapshot.fullName,
                        phone: snapshot.phone,
                        address: snapshot.address,
                    });
                }}
            />
            </Suspense>

            <GuarantorForfeitureStrip
                defendants={defendants}
                onOpenForfeitureUpdate={openForfeitureUpdate}
            />

        <div className="max-w-5xl mx-auto w-full px-6 pb-1 print:hidden">
            <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => switchDashboardTab('requests')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('requests')}
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.tabRequests}
                    className={criminalDashboardTabClass('requests', activeTab === 'requests')}
                >
                    {resolveCriminalDashboardTabLabel('requests', caseStage)}
                </button>
                <button
                    type="button"
                    onClick={() => switchDashboardTab('statements')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('statements')}
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.tabStatements}
                    className={criminalDashboardTabClass('statements', activeTab === 'statements')}
                >
                    {CRIMINAL_DASHBOARD_TAB_LABELS.statements}
                </button>
                <button
                    type="button"
                    onClick={() => switchDashboardTab('tracking')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('tracking')}
                    className={criminalDashboardTabClass('tracking', activeTab === 'tracking')}
                >
                    {CRIMINAL_DASHBOARD_TAB_LABELS.tracking}
                </button>
                <button
                    type="button"
                    onClick={() => switchDashboardTab('legal_codes')}
                    onPointerEnter={() => prefetchCriminalDashboardTab('legal_codes')}
                    className={criminalDashboardTabClass('legal_codes', activeTab === 'legal_codes')}
                >
                    {CRIMINAL_DASHBOARD_TAB_LABELS.legal_codes}
                </button>
            </div>
        </div>

        {activeTab === 'statements' ? (
            <div
                key="criminal-tab-statements"
                data-testid={CRIMINAL_DOSSIER_TEST_IDS.statementsPanel}
                className="flex flex-col p-6 max-w-5xl mx-auto w-full gap-6 print:text-black"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="text-white/80 font-black text-sm whitespace-normal break-words">سجل الإفادات</div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            data-testid={CRIMINAL_DOSSIER_TEST_IDS.otherEvidenceToggle}
                            onClick={() => setIsOtherEvidenceFormOpen((v) => !v)}
                            disabled={isOtherEvidenceReadOnly}
                            className="rounded-lg border border-white/15 bg-white/10 text-white px-4 py-2 text-sm font-black hover:bg-white/15 transition whitespace-normal break-words print:hidden disabled:opacity-40 disabled:pointer-events-none min-h-[44px] touch-manipulation"
                        >
                            أدلة الإثبات الأخرى
                        </button>
                        <button
                            type="button"
                            data-testid={CRIMINAL_DOSSIER_TEST_IDS.statementsAdd}
                            onClick={() => {
                                if (isEffectiveTrialCourtStage) {
                                    setEditingTrialDeposition(null);
                                    setIsTrialDepositionModalOpen(true);
                                    return;
                                }
                                setEditingStatement(null);
                                setIsStatementModalOpen(true);
                            }}
                            disabled={isStatementsTabReadOnly}
                            className="rounded-lg bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black hover:brightness-110 active:brightness-95 transition whitespace-normal break-words print:hidden disabled:opacity-40 disabled:pointer-events-none min-h-[44px] touch-manipulation"
                        >
                            + إضافة إلى سجل الإفادات
                        </button>
                    </div>
                </div>
                {isOtherEvidenceFormOpen ? (
                    <OtherEvidenceEntryForm
                        onSubmit={(item) => addOtherEvidenceItem(id, item)}
                        onClose={() => setIsOtherEvidenceFormOpen(false)}
                        showLegalToast={showLegalToast}
                    />
                ) : null}

                <Suspense fallback={<CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[280px]" />}>
                    <LazyCriminalDashboardStatementsTab
                        statementsTabActive={statementsTabActive}
                        statements={statements}
                        otherEvidenceItems={otherEvidenceItems}
                        defendants={defendants}
                        trialDepositions={trialDepositions}
                        trialSessions={trialSessions}
                        selectedJourneyNode={selectedJourneyNode}
                        isHistoricalNodeView={isHistoricalNodeView}
                        activeJourneyBranch={activeJourneyBranch}
                        stageJourney={stageJourney}
                        isEffectiveTrialCourtStage={isEffectiveTrialCourtStage}
                        isStatementsTabReadOnly={isStatementsTabReadOnly}
                        id={id}
                        showLegalToast={showLegalToast}
                        updateTrialDeposition={updateTrialDeposition}
                        deleteTrialDeposition={deleteTrialDeposition}
                        setEditingTrialDeposition={setEditingTrialDeposition}
                        setIsTrialDepositionModalOpen={setIsTrialDepositionModalOpen}
                        renderStatementCard={renderStatementCard}
                        renderOtherEvidenceCard={renderOtherEvidenceCard}
                    />
                </Suspense>
            </div>
        ) : activeTab === 'legal_codes' ? (
            <Suspense fallback={<CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[200px]" />}>
            <LazyLegalCodesTab showJuvenileLawTab={hasJuvenileInCase} />
            </Suspense>
        ) : activeTab === 'tracking' ? (
            <Suspense fallback={<CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[240px]" />}>
                <LazyCriminalDashboardTrackingTab
                    id={id}
                    readOnly={
                        isTimelineArchiveReadOnly ||
                        isDashboardReadOnly ||
                        isInvestigationMaterialReadOnly
                    }
                    onOpenLinkedRecord={openProceduralLinkedRecord}
                    navTarget={proceduralNavTarget}
                    onNavTargetHandled={() => setProceduralNavTarget(null)}
                />
            </Suspense>
        ) : activeTab === 'requests' ? (
            <Suspense fallback={<CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[320px]" />}>
                <LazyCriminalDashboardRequestsTab
                    id={id}
                    decisionsKindFilter={decisionsKindFilter}
                    setDecisionsKindFilter={setDecisionsKindFilter}
                    isInvestigationPhase={isInvestigationPhase}
                    showTrialsTab={showTrialsTab}
                    trialSessionsTabLabel={trialSessionsTabLabel}
                    switchDashboardTab={switchDashboardTab}
                    setTrialSessionAddModalOpen={setTrialSessionAddModalOpen}
                    openAdultJudicialDecisionModal={openAdultJudicialDecisionModal}
                    openJuvenileJudicialDecisionModal={openJuvenileJudicialDecisionModal}
                    openLawyerMotionModal={openLawyerMotionModal}
                    canCreateDecisionsOrRequests={canCreateDecisionsOrRequests}
                    decisionsScopeFilter={decisionsScopeFilter}
                    setDecisionsScopeFilter={setDecisionsScopeFilter}
                    effectiveDecisionsScope={effectiveDecisionsScope}
                    defendants={defendants}
                    effectiveUiStage={effectiveUiStage}
                    caseStage={caseStage}
                    criminalCase={criminalCase}
                    isDecisionsTabMaterialReadOnly={isDecisionsTabMaterialReadOnly}
                    criminalCaseUserRole={criminalCaseUserRole}
                    sendToCassationOnVerdictCard={sendToCassationOnVerdictCard}
                    updateVerdictCardDraft={updateVerdictCardDraft}
                    patchVerdictCardOrdinaryAppeal={patchVerdictCardOrdinaryAppeal}
                    recordVerdictCardCassationResult={recordVerdictCardCassationResult}
                    patchVerdictCardCorrectionAppeal={patchVerdictCardCorrectionAppeal}
                    recordVerdictAbsentiaPublication={recordVerdictAbsentiaPublication}
                    recordVerdictAbsentiaObjection={recordVerdictAbsentiaObjection}
                    openVerdictCassationFilingCard={setVerdictCassationFilingCard}
                    sortedLawyerRequestsForNode={sortedLawyerRequestsForNode}
                    trialSessions={trialSessions}
                    activeJourneyBranch={activeJourneyBranch}
                    isHistoricalNodeView={isHistoricalNodeView}
                    selectedJourneyNode={selectedJourneyNode}
                    verdictCards={verdictCards}
                    isTimelineArchiveReadOnly={isTimelineArchiveReadOnly}
                    isDashboardReadOnly={isDashboardReadOnly}
                    isFrozen={isFrozen}
                    trialSessionAddModalOpen={trialSessionAddModalOpen}
                    addTrialSession={addTrialSession}
                    updateTrialSession={updateTrialSession}
                    documentTrialSessionPreparatoryDecision={documentTrialSessionPreparatoryDecision}
                    postponeTrialSession={postponeTrialSession}
                    registerInitialTrialHearingDate={registerInitialTrialHearingDate}
                    openStageFinalDecisionFromTrialSession={openStageFinalDecisionFromTrialSession}
                    openAppealModal={openAppealModal}
                    handleInterventionCassation={handleInterventionCassation}
                    handleCassationCorrection={handleCassationCorrection}
                    handleDeclareJudgmentFinal={handleDeclareJudgmentFinal}
                    getPendingCassationAppealForResult={getPendingCassationAppealForResult}
                    currentAccusationArticle={currentAccusationArticle}
                    showLegalToast={showLegalToast}
                    allParties={allParties}
                    stageJourney={stageJourney}
                    isInvestigationDossierSealed={isInvestigationDossierSealed}
                    crimeType={crimeType}
                    activeLegalArticle={activeLegalArticle}
                    setCassationResultContext={setCassationResultContext}
                    handleRequestOrderProceedingsBlockChange={handleRequestOrderProceedingsBlockChange}
                    addRequestMargin={addRequestMargin}
                    toggleRequestStar={toggleRequestStar}
                    getProceduralRefsForRequest={getProceduralRefsForRequest}
                    navigateToProceduralItem={navigateToProceduralItem}
                    handleMoveDecisionToTrash={handleMoveDecisionToTrash}
                    handleMoveRequestToTrash={handleMoveRequestToTrash}
                    openRequestQuickFinalizeModal={openRequestQuickFinalizeModal}
                    criminalCaseForInvestigationPurge={isInvestigationPhase ? criminalCase : undefined}
                    primaryDefendant={primaryDefendant}
                    autoConcernedPartyId={autoConcernedPartyId}
                    openQuickBailFromDecision={openQuickBailFromDecision}
                    extendDetentionOnDecision={extendDetentionOnDecision}
                    documentDetentionReleaseOnDecision={documentDetentionReleaseOnDecision}
                    updateOrderEnforcementOnDecision={updateOrderEnforcementOnDecision}
                    visibleLawyerRequestsCount={visibleLawyerRequestsCount}
                    visibleJudicialDecisionsCount={visibleJudicialDecisionsCount}
                    setVisibleJudicialDecisionsCount={setVisibleJudicialDecisionsCount}
                    decisionsPageSize={decisionsPageSize}
                />
            </Suspense>
        ) : null}

            </div>
        </>
    );
}
