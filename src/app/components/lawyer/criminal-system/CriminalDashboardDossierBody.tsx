import React, { Suspense } from 'react';
import {
    LazyCriminalDashboardHeader,
    LazyCriminalPartiesGrid,
    LazyCriminalDashboardStatementsTab,
} from './criminalDashboardLazyRegistry';
import { isInvestigationStoredStage } from './criminalStageRuntimeCore';
import {
    CriminalDossierTopBanners,
    CriminalDossierMidBanners,
} from './components/CriminalDossierStatusBanners';
import { CaseJourneyHeader } from './components/CaseJourneyHeader';
import { GuarantorForfeitureStrip } from './components/GuarantorForfeitureStrip';
import { CriminalDashboardLazySurfaceFallback } from './criminalDashboardRuntimeShells';
import { CriminalDossierTabBar } from './CriminalDossierTabBar';
import { CriminalDossierStatementsChrome } from './CriminalDossierStatementsChrome';
import { CriminalDossierHeaderLazyBoundary } from './CriminalDossierHeaderLazyBoundary';
import { CriminalDossierReadOnlySurface } from './CriminalDossierReadOnlySurface';
import { CriminalDossierLegalCodesPanel } from './CriminalDossierLegalCodesPanel';
import { CriminalDossierStatementsPanel } from './CriminalDossierStatementsPanel';
import { CriminalDossierRequestsPanel } from './CriminalDossierRequestsPanel';
import { CriminalDossierTrackingPanel } from './CriminalDossierTrackingPanel';
import { type CriminalDashboardDossierBodyProps } from './criminalDashboardDossierBodyProps';

export type { CriminalDashboardDossierBodyProps } from './criminalDashboardDossierBodyProps';

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
        onExitToHome,
        handleDashboardBack,
        dossierNestedNav = false,
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
            <CriminalDossierHeaderLazyBoundary
                onNavBack={handleDashboardBack}
                onNavExit={onExitToHome}
                dossierNestedNav={dossierNestedNav}
            >
                <LazyCriminalDashboardHeader
                    key={id}
                    onNavBack={handleDashboardBack}
                    onNavExit={onExitToHome}
                    dossierNestedNav={dossierNestedNav}
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
            </CriminalDossierHeaderLazyBoundary>
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

            <CriminalDossierReadOnlySurface isDashboardReadOnly={isDashboardReadOnly}>
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

        <CriminalDossierTabBar
            caseStage={caseStage}
            activeTab={activeTab}
            switchDashboardTab={switchDashboardTab}
        />

        {activeTab === 'statements' ? (
            <CriminalDossierStatementsPanel>
                <CriminalDossierStatementsChrome
                    setIsOtherEvidenceFormOpen={setIsOtherEvidenceFormOpen}
                    isOtherEvidenceReadOnly={isOtherEvidenceReadOnly}
                    isEffectiveTrialCourtStage={isEffectiveTrialCourtStage}
                    setEditingTrialDeposition={setEditingTrialDeposition}
                    setIsTrialDepositionModalOpen={setIsTrialDepositionModalOpen}
                    setEditingStatement={setEditingStatement}
                    setIsStatementModalOpen={setIsStatementModalOpen}
                    isStatementsTabReadOnly={isStatementsTabReadOnly}
                    isOtherEvidenceFormOpen={isOtherEvidenceFormOpen}
                    addOtherEvidenceItem={addOtherEvidenceItem}
                    caseId={id}
                    showLegalToast={showLegalToast}
                />

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
            </CriminalDossierStatementsPanel>
        ) : activeTab === 'legal_codes' ? (
            <CriminalDossierLegalCodesPanel showJuvenileLawTab={hasJuvenileInCase} />
        ) : activeTab === 'tracking' ? (
            <CriminalDossierTrackingPanel {...props} />
        ) : activeTab === 'requests' ? (
            <CriminalDossierRequestsPanel {...props} />
        ) : null}

            </CriminalDossierReadOnlySurface>
        </>
    );
}
