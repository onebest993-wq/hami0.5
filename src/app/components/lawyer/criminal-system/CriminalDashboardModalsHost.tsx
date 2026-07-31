import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import { hasIdentifiedDefendant } from './criminalUnknownDefendant';
import {
    resolveEffectiveDefendantScopeIds,
    shouldShowDefendantDecisionScopePicker,
} from './partyPersonalStage';
import {
    InvestigationDecisionModal,
    PartyIdentityCorrectionModal,
    VenueIdentityCorrectionModal,
    TrialDepositionModal,
    StageFinalDecisionModal,
    ProceduralLinkedTimelineModal,
    CriminalStatementModal,
    MergeCaseModal,
    ConfirmActionModal,
} from './criminalDashboardLazyModals';
import {
    JudicialCassationAppealModal,
    JudicialCassationResultModal,
    type JudicialCassationAppealModalVariant,
} from './criminalDashboardAppealFlowLazyModals';
import { CriminalCaseTrashModal, SeveranceTargetPickerModal } from './criminalDashboardCaseFlowLazyModals';
import {
    RequestQuickFinalizeModal,
    VerdictCassationFilingModal,
} from './criminalDashboardRequestFlowLazyModals';
import { RequestMarginPromptModal } from './criminalDashboardLazyRequestUi';
import { RequestsEntryModal } from './components/RequestsEntryModal';
import { StageCloserModal } from './components/StageCloserModal';
import { SendToCassationModal } from './components/SendToCassationModal';
import { LegalArticleEditModal } from './components/LegalArticleEditModal';
import { ReopenCaseModal } from './components/ReopenCaseModal';
import { BailForfeitureModal } from './components/BailForfeitureModal';
import { useCriminalStore } from './criminalStore';

export type {
    IdentityEditState,
    ConfirmActionState,
    CriminalDashboardModalsHostProps,
} from './criminalDashboardModalsHostProps';

/**
 * كل مودالات إضبارة الدعوى الجزائية — مستخرَجة من CriminalDashboardResolvedRuntime
 * ضمن تفكيك المكوّن العملاق. لا منطق جديد هنا: نفس الـ JSX وأصله بحرفيته،
 * فقط القيم/الأفعال أصبحت props صريحة بدل الإغلاق على النطاق الخارجي.
 */
export function CriminalDashboardModalsHost({
    id,
    defendants,
    complainants,
    criminalCase,
    activeParties,
    isMutualComplaint,
    isInvestigationPhase,
    activeLegalArticle,
    isTimelineArchiveReadOnly,
    isDashboardReadOnly,
    canManageDossier,
    onOpenCase,
    showLegalToast,
    showLegalError,

    cassationAppealModal,
    setCassationAppealModal,
    declareJudicialDecisionFinal,
    fileJudicialDecisionAppeal,

    cassationResultContext,
    setCassationResultContext,
    recordJudicialAppealResult,

    isInvestigationDecisionOpen,
    setIsInvestigationDecisionOpen,
    investigationDecisionError,
    setInvestigationDecisionError,
    hasUnrevealedUnknown,
    referInvestigationDefendantToTrial,
    applyInvestigationReferral,

    isSeveranceOpen,
    setIsSeveranceOpen,
    severanceError,
    setSeveranceError,
    investigationDefendantsPartyMix,
    beginSeveranceFromDossier,
    openInlineSeveranceForm,

    caseSovereignContext,
    isStageFinalDecisionOpen,
    setIsStageFinalDecisionOpen,
    trialFinalDecisionSessionIdRef,
    stageFinalDecisionError,
    setStageFinalDecisionError,
    inferredStageFinalPresence,
    submitStageFinalDecision,

    isStageCloserOpen,
    stageCloserOrchestrator,
    caseStage,
    isCassationStage,
    isJuvenileTrial,
    isTrialCourtStage,
    isPrivateRightWaived,
    juvenileAccused,
    firstJuvenileDefendant,
    firstJuvenileSocialWorkflow,
    patchSocialInquiryReport,
    submitStageCloser,

    isLegalEditOpen,
    setIsLegalEditOpen,
    legalArticleNext,
    setLegalArticleNext,
    legalChangedBy,
    setLegalChangedBy,
    submitLegalEdit,

    activeTab,
    isStatementModalOpen,
    setIsStatementModalOpen,
    editingStatement,
    setEditingStatement,
    statementEligibleDefendants,
    ourRepresentation,
    addStatement,
    updateStatement,

    isEffectiveTrialCourtStage,
    isTrialDepositionModalOpen,
    setIsTrialDepositionModalOpen,
    editingTrialDeposition,
    setEditingTrialDeposition,
    sortedTrialSessionsForDepositions,
    addTrialDeposition,
    updateTrialDeposition,

    isRequestsModalOpen,
    requestsOrchestrator,
    isRequestModalViewOnly,
    mixedInvestigationScopedDefendantNames,
    reqJuvenileDetentionLocked,
    isAllDefendantsUnknown,
    reqNeedsDetentionDateRange,
    reqIsOrderEnforcementEntry,
    isRequestFinalStatus,
    reqDecisionBeforeRequest,
    reqIsJudicialDecisionEntry,
    reqIsLawyerMotionEntry,
    reqIsDefendantBailEntry,
    reqIsComplaintReferralEntry,
    isCustomJudicialEntry,
    requestFormBaseValid,
    requestFormFinalValid,
    showPurgeDefendantPicker,
    showRequestPartySection,
    showPartyPickerFormUi,
    showJuvenileJudgeConcernedPartyPicker,
    showUnknownPartyNoticeInRequestModal,
    showJuvenileArrestLegalHint,
    allParties,
    requestEligibleParties,
    fugitiveDefendants,
    customJudicialConcernedPartyOptions,
    customJudicialConcernedPartyId,
    autoRequestPartyLabel,
    autoConcernedPartyLabel,
    unknownDefendantsForPartyDisplay,
    modalLinkedRequest,
    activeRequestProceduralReferences,
    closeRequestsModal,
    submitRequest,
    applyJudicialTemplate,
    applyLawyerTemplate,
    clearRequestEntryLane,
    onAssetSeizureDraftsChange,
    patchReqBailForParty,
    patchReqDetentionForParty,
    handleReqBailUnifiedChange,
    handleReqDetentionUnifiedChange,
    navigateToProceduralItem,
    toggleRequestStar,
    addRequestAttachment,
    removeRequestAttachment,

    requestMarginModalOpen,
    setRequestMarginModalOpen,
    editingRequestId,
    addRequestMargin,

    quickFinalizeRequest,
    quickFinalizeStatus,
    quickFinalizeMargin,
    quickFinalizeDate,
    setQuickFinalizeStatus,
    setQuickFinalizeMargin,
    setQuickFinalizeDate,
    closeQuickFinalizeModal,
    submitQuickFinalize,

    linkedTimelineFromProcedural,
    setLinkedTimelineFromProcedural,
    linkedTimelineProceduralReferences,

    isReopenCaseOpen,
    setIsReopenCaseOpen,
    reopenCaseReason,
    setReopenCaseReason,
    submitReopenCase,

    isSendToCassationOpen,
    setIsSendToCassationOpen,
    availableCassationFilingTypes,
    cassationType,
    setCassationType,
    cassationInterventionBasis,
    setCassationInterventionBasis,
    cassationNumber,
    setCassationNumber,
    cassationPanelName,
    setCassationPanelName,
    cassationAppellantIds,
    setCassationAppellantIds,
    submitSendToCassation,

    verdictCassationFilingCard,
    setVerdictCassationFilingCard,
    effectiveUiStage,
    isDecisionsTabMaterialReadOnly,
    patchVerdictCardOrdinaryAppeal,

    identityEdit,
    setIdentityEdit,
    identityEditError,
    setIdentityEditError,
    correctCasePartyName,

    showEditInvestigationCourt,
    showEditTrialCourt,
    showEditDeposition,
    depositEntityName,
    isTrialPhase,
    correctCaseLegalArticle,
    correctCaseCourtName,
    correctCaseDepositionLocation,
    correctCaseReferenceNumbers,

    isTrashModalOpen,
    setIsTrashModalOpen,
    trashItems,
    restoreTrashItem,
    purgeTrashItem,
    setConfirmAction,

    isMergeCasesOpen,
    setIsMergeCasesOpen,
    headerTitle,
    mergeTargetCaseId,
    setMergeTargetCaseId,
    mergeReason,
    setMergeReason,
    submitMergeCases,

    confirmAction,
    runConfirmAction,
    closeConfirmAction,

    forfeitureModal,
    setForfeitureModal,
    updateBailForfeiture,
}: CriminalDashboardModalsHostProps) {
    return (
        <>
            <JudicialCassationAppealModal
                open={Boolean(cassationAppealModal)}
                decision={cassationAppealModal?.decision ?? null}
                variant={cassationAppealModal?.variant ?? 'ordinary'}
                parties={activeParties}
                onClose={() => setCassationAppealModal(null)}
                onSubmit={({ appellantType, appellantIds, targetDefendantIds, appellantManualLabel }) => {
                    if (!cassationAppealModal) return null;
                    const { decision, variant } = cassationAppealModal;
                    let err: string | null = null;
                    if (variant === 'declare_final') {
                        err = declareJudicialDecisionFinal(id, decision.id, {
                            declarerType: appellantType,
                            declarerIds: appellantIds,
                            declarerManualLabel: appellantManualLabel,
                        });
                    } else {
                        err = fileJudicialDecisionAppeal(id, decision.id, {
                            appellantType,
                            appellantIds,
                            targetDefendantIds,
                            appellantManualLabel,
                            appealPath: variant,
                        });
                    }
                    if (err) {
                        showLegalToast(err, 5000);
                        return err;
                    }
                    const successByVariant: Record<JudicialCassationAppealModalVariant, string> = {
                        ordinary: '✓ تم تسجيل الطعن التمييزي — بانتظار نتيجة محكمة الطعن.',
                        intervention_264b: '✓ تم تسجيل طلب التدخل التمييزي — بانتظار النتيجة.',
                        correction_266: '✓ تم تسجيل طلب تصحيح القرار — بانتظار النتيجة.',
                        declare_final: '✓ تم إعلان الحكم باتاً واختتامه في السجل.',
                    };
                    showLegalToast(successByVariant[variant], 5000);
                    setCassationAppealModal(null);
                    return null;
                }}
            />

            <JudicialCassationResultModal
                open={Boolean(cassationResultContext)}
                decision={cassationResultContext?.decision ?? null}
                appeal={cassationResultContext?.appeal ?? null}
                parties={activeParties}
                onClose={() => setCassationResultContext(null)}
                onSubmit={(payload) => {
                    if (!cassationResultContext) return;
                    const err = recordJudicialAppealResult(
                        id,
                        cassationResultContext.decision.id,
                        cassationResultContext.appeal.id,
                        payload,
                    );
                    if (err) {
                        showLegalToast(err, 5000);
                        return;
                    }
                    showLegalToast('✓ تم تسجيل نتيجة الطعن التمييزي — القرار محصن ولا يُعاد فتحه.', 5000);
                    setCassationResultContext(null);
                }}
            />

            <InvestigationDecisionModal
                open={isInvestigationDecisionOpen}
                onClose={() => setIsInvestigationDecisionOpen(false)}
                error={investigationDecisionError}
                defendants={defendants}
                crossAccusedComplainants={complainants.filter(
                    (c) => isMutualComplaint || c.isCrossComplaint === true,
                )}
                activeLegalArticle={activeLegalArticle}
                publicProsecutionNumber={criminalCase.location.publicProsecutionNumber}
                onSubmitReferral={(payload) => {
                    if (hasUnrevealedUnknown && !hasIdentifiedDefendant(defendants)) {
                        setInvestigationDecisionError(
                            'لا يمكن إحالة إضبارة بلا متهم معروف — أكّد هوية متهم واحد على الأقل عبر «كشف الهوية».',
                        );
                        return;
                    }
                    const scopedIds = resolveEffectiveDefendantScopeIds(defendants, payload.defendantIds ?? [])
                        .filter((defId) => defendants.some((d) => d.id === defId));
                    if (shouldShowDefendantDecisionScopePicker(defendants) && !scopedIds.length) {
                        setInvestigationDecisionError('حدّد متهماً واحداً على الأقل مشمولاً بالإحالة.');
                        return;
                    }
                    const allCaseDefIds = defendants.map((d) => d.id);
                    const remainingOnCase = allCaseDefIds.filter((defId) => !scopedIds.includes(defId));
                    const isPartialReferral = scopedIds.length > 0 && remainingOnCase.length > 0;
                    const referralPayload = { ...payload, defendantIds: scopedIds };

                    setInvestigationDecisionError('');
                    if (isPartialReferral) {
                        const childId = referInvestigationDefendantToTrial(id, referralPayload);
                        if (!childId) {
                            setInvestigationDecisionError(
                                'تعذّر إتمام الإحالة — تحقق من المتهمين النشطين والمحكمة.',
                            );
                            return;
                        }
                        setIsInvestigationDecisionOpen(false);
                        showLegalToast('✓ تمت الإحالة وإنشاء إضبارة المحكمة المختصة.', 5000);
                        onOpenCase?.(childId);
                        return;
                    }

                    applyInvestigationReferral(id, referralPayload);
                    setIsInvestigationDecisionOpen(false);
                    showLegalToast('✓ تمت الإحالة إلى محكمة الموضوع.', 5000);
                }}
            />

            <SeveranceTargetPickerModal
                open={isSeveranceOpen}
                onClose={() => {
                    setIsSeveranceOpen(false);
                    setSeveranceError('');
                }}
                defendants={defendants}
                defendantsPartyMix={investigationDefendantsPartyMix}
                error={severanceError}
                onContinue={(defendantIds, judicialSeveranceDraft) => {
                    const ok = beginSeveranceFromDossier(id, defendantIds, {
                        judicialSeveranceDraft,
                    });
                    if (!ok) {
                        setSeveranceError(
                            'تعذّر بدء عملية التفريق — تحقق من المتهمين المحددين وحالة الإضبارة.',
                        );
                        return;
                    }
                    setIsSeveranceOpen(false);
                    setSeveranceError('');
                    showLegalToast(
                        '✓ تم تجهيز مسار التفريق — أكمل بيانات الإضبارة الجديدة ثم «تنفيذ التفريق وإنشاء الإضبارة».',
                        6000,
                    );
                    openInlineSeveranceForm();
                }}
            />

            {caseSovereignContext ? (
                <StageFinalDecisionModal
                    open={isStageFinalDecisionOpen}
                    onClose={() => {
                        trialFinalDecisionSessionIdRef.current = null;
                        setIsStageFinalDecisionOpen(false);
                        setStageFinalDecisionError('');
                    }}
                    error={stageFinalDecisionError}
                    defendants={defendants}
                    caseContext={caseSovereignContext}
                    inferredPresenceType={inferredStageFinalPresence}
                    onSubmit={submitStageFinalDecision}
                />
            ) : null}

            {isStageCloserOpen ? (
                <StageCloserModal
                    closer={stageCloserOrchestrator}
                    defendants={defendants}
                    caseStage={caseStage}
                    isCassationStage={isCassationStage}
                    isInvestigationPhase={isInvestigationPhase}
                    isJuvenileTrial={isJuvenileTrial}
                    isTrialCourtStage={isTrialCourtStage}
                    isPrivateRightWaived={isPrivateRightWaived}
                    juvenileAccused={juvenileAccused}
                    firstJuvenileDefendant={firstJuvenileDefendant}
                    firstJuvenileSocialWorkflow={firstJuvenileSocialWorkflow}
                    patchSocialInquiryReport={patchSocialInquiryReport}
                    onSubmit={submitStageCloser}
                />
            ) : null}

            <LegalArticleEditModal
                open={isLegalEditOpen}
                legalArticleNext={legalArticleNext}
                setLegalArticleNext={setLegalArticleNext}
                legalChangedBy={legalChangedBy}
                setLegalChangedBy={setLegalChangedBy}
                onClose={() => setIsLegalEditOpen(false)}
                onSubmit={submitLegalEdit}
            />


            <CriminalStatementModal
                isOpen={activeTab === 'statements' && isStatementModalOpen}
                initialStatement={editingStatement}
                complainants={complainants}
                defendants={statementEligibleDefendants}
                ourRepresentation={ourRepresentation}
                isMutualComplaint={isMutualComplaint}
                showDepositionVenuePicker={isInvestigationPhase}
                investigationPapersAt={criminalCase?.location.investigationPapersAt ?? ''}
                onClose={() => {
                    setEditingStatement(null);
                    setIsStatementModalOpen(false);
                }}
                onCreate={(statement) => {
                    try {
                        return addStatement(id, statement);
                    } catch {
                        // إن نجح الحقن في الـ store رغم رمي مشترك لاحق (جسر/تقويم) نعدّه نجاحاً
                        const saved = useCriminalStore
                            .getState()
                            .casesById[id]?.statements?.some((s) => s.id === statement.id);
                        return saved ? null : 'تعذّر حفظ الإفادة.';
                    }
                }}
                onUpdate={(statementId, updatedData) => updateStatement(id, statementId, updatedData)}
                onError={(message) => showLegalError(message)}
            />

            <TrialDepositionModal
                isOpen={activeTab === 'statements' && isEffectiveTrialCourtStage && isTrialDepositionModalOpen}
                initialDeposition={editingTrialDeposition}
                sessions={sortedTrialSessionsForDepositions}
                complainants={complainants}
                defendants={defendants}
                onClose={() => {
                    setEditingTrialDeposition(null);
                    setIsTrialDepositionModalOpen(false);
                }}
                onCreate={(payload) => {
                    const err = addTrialDeposition(id, payload);
                    if (err) {
                        showLegalToast(err, 4500);
                    }
                }}
                onUpdate={(depositionId, patch) => {
                    const err = updateTrialDeposition(id, depositionId, patch);
                    if (err) {
                        showLegalToast(err, 4500);
                    }
                }}
                onError={(msg) => {
                    showLegalToast(msg, 4500);
                }}
            />

            {activeTab === 'requests' && isRequestsModalOpen ? (
                <RequestsEntryModal
                    caseId={id}
                    requests={requestsOrchestrator}
                    isRequestModalViewOnly={isRequestModalViewOnly}
                    isEffectiveTrialCourtStage={isEffectiveTrialCourtStage}
                    isInvestigationPhase={isInvestigationPhase}
                    investigationDefendantsPartyMix={investigationDefendantsPartyMix}
                    mixedInvestigationScopedDefendantNames={mixedInvestigationScopedDefendantNames}
                    reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                    isAllDefendantsUnknown={isAllDefendantsUnknown}
                    reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                    reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                    isRequestFinalStatus={isRequestFinalStatus}
                    reqDecisionBeforeRequest={reqDecisionBeforeRequest}
                    reqIsJudicialDecisionEntry={reqIsJudicialDecisionEntry}
                    reqIsLawyerMotionEntry={reqIsLawyerMotionEntry}
                    reqIsDefendantBailEntry={reqIsDefendantBailEntry}
                    reqIsComplaintReferralEntry={reqIsComplaintReferralEntry}
                    isCustomJudicialEntry={isCustomJudicialEntry}
                    requestFormBaseValid={requestFormBaseValid}
                    requestFormFinalValid={requestFormFinalValid}
                    showPurgeDefendantPicker={showPurgeDefendantPicker}
                    showRequestPartySection={showRequestPartySection}
                    showPartyPickerFormUi={showPartyPickerFormUi}
                    showJuvenileJudgeConcernedPartyPicker={showJuvenileJudgeConcernedPartyPicker}
                    showUnknownPartyNoticeInRequestModal={showUnknownPartyNoticeInRequestModal}
                    showJuvenileArrestLegalHint={showJuvenileArrestLegalHint}
                    isTimelineArchiveReadOnly={isTimelineArchiveReadOnly}
                    isDashboardReadOnly={isDashboardReadOnly}
                    defendants={defendants}
                    allParties={allParties}
                    requestEligibleParties={requestEligibleParties}
                    fugitiveDefendants={fugitiveDefendants}
                    customJudicialConcernedPartyOptions={customJudicialConcernedPartyOptions}
                    customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                    autoRequestPartyLabel={autoRequestPartyLabel}
                    autoConcernedPartyLabel={autoConcernedPartyLabel}
                    unknownDefendantsForPartyDisplay={unknownDefendantsForPartyDisplay}
                    modalLinkedRequest={modalLinkedRequest}
                    activeRequestProceduralReferences={activeRequestProceduralReferences}
                    onClose={closeRequestsModal}
                    onSubmit={submitRequest}
                    onApplyJudicialTemplate={applyJudicialTemplate}
                    onApplyLawyerTemplate={applyLawyerTemplate}
                    onClearEntryLane={clearRequestEntryLane}
                    onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                    patchReqBailForParty={patchReqBailForParty}
                    patchReqDetentionForParty={patchReqDetentionForParty}
                    handleReqBailUnifiedChange={handleReqBailUnifiedChange}
                    handleReqDetentionUnifiedChange={handleReqDetentionUnifiedChange}
                    navigateToProceduralItem={navigateToProceduralItem}
                    toggleRequestStar={toggleRequestStar}
                    addRequestAttachment={addRequestAttachment}
                    removeRequestAttachment={removeRequestAttachment}
                />
            ) : null}

            <RequestMarginPromptModal
                open={requestMarginModalOpen}
                onClose={() => setRequestMarginModalOpen(false)}
                onSubmit={(text) => {
                    if (editingRequestId) addRequestMargin(id, editingRequestId, text);
                }}
            />

            <RequestQuickFinalizeModal
                open={Boolean(quickFinalizeRequest)}
                request={quickFinalizeRequest}
                nextStatus={quickFinalizeStatus}
                judgeMargin={quickFinalizeMargin}
                decisionDate={quickFinalizeDate}
                onStatusChange={setQuickFinalizeStatus}
                onJudgeMarginChange={setQuickFinalizeMargin}
                onDecisionDateChange={setQuickFinalizeDate}
                onClose={closeQuickFinalizeModal}
                onSave={submitQuickFinalize}
            />

            <ProceduralLinkedTimelineModal
                open={linkedTimelineFromProcedural !== null}
                event={linkedTimelineFromProcedural}
                proceduralReferences={linkedTimelineProceduralReferences}
                onNavigateToProcedural={navigateToProceduralItem}
                onClose={() => setLinkedTimelineFromProcedural(null)}
            />

            <ReopenCaseModal
                open={isReopenCaseOpen}
                reopenCaseReason={reopenCaseReason}
                setReopenCaseReason={setReopenCaseReason}
                onClose={() => setIsReopenCaseOpen(false)}
                onSubmit={submitReopenCase}
            />

            <SendToCassationModal
                open={isSendToCassationOpen}
                availableCassationFilingTypes={availableCassationFilingTypes}
                cassationType={cassationType}
                setCassationType={setCassationType}
                cassationInterventionBasis={cassationInterventionBasis}
                setCassationInterventionBasis={setCassationInterventionBasis}
                cassationNumber={cassationNumber}
                setCassationNumber={setCassationNumber}
                cassationPanelName={cassationPanelName}
                setCassationPanelName={setCassationPanelName}
                defendants={defendants}
                cassationAppellantIds={cassationAppellantIds}
                setCassationAppellantIds={setCassationAppellantIds}
                onClose={() => setIsSendToCassationOpen(false)}
                onSubmit={submitSendToCassation}
            />

            <VerdictCassationFilingModal
                open={Boolean(verdictCassationFilingCard)}
                card={verdictCassationFilingCard}
                caseStage={
                    effectiveUiStage === 'felony' || effectiveUiStage === 'misdemeanor'
                        ? effectiveUiStage
                        : caseStage
                }
                currentAccusationArticle={
                    criminalCase.currentAccusationArticle ?? criminalCase.basics.legalArticle
                }
                crimeType={criminalCase.basics.crimeType}
                readOnly={isDecisionsTabMaterialReadOnly}
                onClose={() => setVerdictCassationFilingCard(null)}
                onSave={(patch) => {
                    if (!verdictCassationFilingCard) return;
                    patchVerdictCardOrdinaryAppeal(id, verdictCassationFilingCard.id, patch);
                    setVerdictCassationFilingCard(null);
                }}
            />

            <PartyIdentityCorrectionModal
                open={identityEdit?.mode === 'party'}
                partyKind={identityEdit?.mode === 'party' ? identityEdit.kind : 'complainant'}
                fullName={identityEdit?.mode === 'party' ? identityEdit.fullName : ''}
                phone={identityEdit?.mode === 'party' ? identityEdit.phone : ''}
                address={identityEdit?.mode === 'party' ? identityEdit.address : ''}
                error={identityEditError}
                onClose={() => {
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
                onSubmit={({ newFullName, newPhone, newAddress, reason }) => {
                    if (identityEdit?.mode !== 'party') return;
                    const err = correctCasePartyName(id, {
                        partyKind: identityEdit.kind,
                        partyId: identityEdit.id,
                        newFullName,
                        newPhone,
                        newAddress,
                        reason,
                    });
                    if (err) {
                        setIdentityEditError(err);
                        return;
                    }
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
            />

            <VenueIdentityCorrectionModal
                open={identityEdit?.mode === 'venue'}
                error={identityEditError}
                showInvestigationCourt={showEditInvestigationCourt}
                investigationCourtName={criminalCase.location.investigationCourtName}
                showTrialCourt={showEditTrialCourt}
                trialCourtName={criminalCase.location.courtName}
                showDeposition={showEditDeposition}
                papersAt={
                    criminalCase.location.investigationPapersAt === 'مكتب تحقيق قضائي'
                        ? 'مكتب تحقيق قضائي'
                        : 'مركز شرطة'
                }
                depositionEntityName={depositEntityName}
                legalArticle={activeLegalArticle}
                showLegalArticle={canManageDossier && !isTimelineArchiveReadOnly}
                showReferenceNumbers={canManageDossier && !isTimelineArchiveReadOnly && isTrialPhase}
                courtCaseNumber={String(
                    criminalCase.courtCaseNumber ?? criminalCase.location.caseNumber ?? '',
                ).trim()}
                publicProsecutionNumber={String(
                    criminalCase.location.publicProsecutionNumber ?? '',
                ).trim()}
                onClose={() => {
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
                onSubmit={({
                    investigationCourtName,
                    trialCourtName,
                    papersAt,
                    depositionEntityName,
                    legalArticle,
                    courtCaseNumber,
                    publicProsecutionNumber,
                    reason,
                }) => {
                    let err: string | null = null;
                    if (legalArticle) {
                        err = correctCaseLegalArticle(id, { newArticle: legalArticle, reason });
                    }
                    if (!err && investigationCourtName) {
                        err = correctCaseCourtName(id, {
                            newCourtName: investigationCourtName,
                            reason,
                            scope: 'investigation',
                        });
                    }
                    if (!err && trialCourtName) {
                        err = correctCaseCourtName(id, {
                            newCourtName: trialCourtName,
                            reason,
                            scope: 'trial',
                        });
                    }
                    if (!err && papersAt && depositionEntityName) {
                        err = correctCaseDepositionLocation(id, {
                            papersAt,
                            entityName: depositionEntityName,
                            reason,
                        });
                    }
                    if (
                        !err &&
                        (courtCaseNumber !== undefined || publicProsecutionNumber !== undefined)
                    ) {
                        err = correctCaseReferenceNumbers(id, {
                            ...(courtCaseNumber !== undefined ? { courtCaseNumber } : {}),
                            ...(publicProsecutionNumber !== undefined
                                ? { publicProsecutionNumber }
                                : {}),
                            reason,
                        });
                    }
                    if (err) {
                        setIdentityEditError(err);
                        return;
                    }
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
            />

            <CriminalCaseTrashModal
                open={isTrashModalOpen}
                items={trashItems}
                readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly}
                onClose={() => setIsTrashModalOpen(false)}
                onRestore={(trashItemId) => {
                    const err = restoreTrashItem(id, trashItemId);
                    if (err) {
                        showLegalToast(err, 4500);
                        return;
                    }
                    showLegalToast('✓ تم استرجاع العنصر.', 4000);
                }}
                onPurge={(trashItemId) => {
                    setConfirmAction({
                        title: 'حذف نهائي',
                        message: 'لن يمكن استرجاع هذا العنصر بعد الحذف النهائي.',
                        confirmText: 'حذف نهائي',
                        onConfirm: () => {
                            const err = purgeTrashItem(id, trashItemId);
                            if (err) {
                                showLegalToast(err, 4500);
                            }
                        },
                    });
                }}
            />

            <MergeCaseModal
                open={isMergeCasesOpen}
                parentCaseId={id}
                parentCaseTitle={headerTitle.primary}
                mergeTargetCaseId={mergeTargetCaseId}
                mergeReason={mergeReason}
                onTargetChange={setMergeTargetCaseId}
                onReasonChange={setMergeReason}
                onClose={() => setIsMergeCasesOpen(false)}
                onSubmit={submitMergeCases}
            />

            <ConfirmActionModal
                open={Boolean(confirmAction)}
                title={confirmAction?.title}
                message={confirmAction?.message ?? ''}
                confirmText={confirmAction?.confirmText}
                cancelText={confirmAction?.cancelText}
                onConfirm={runConfirmAction}
                onCancel={closeConfirmAction}
            />

            <BailForfeitureModal
                modal={forfeitureModal}
                onChangeNote={(note) =>
                    setForfeitureModal((prev) => (prev ? { ...prev, forfeitureNote: note } : prev))
                }
                onClose={() => setForfeitureModal(null)}
                onSubmit={() => {
                    if (!forfeitureModal) return;
                    const d = defendants.find((x) => String(x.id) === forfeitureModal.defendantId);
                    if (!d) return;
                    try {
                        updateBailForfeiture(id, forfeitureModal.defendantId, {
                            forfeitureNote: forfeitureModal.forfeitureNote,
                        });
                    } catch {
                        showLegalError();
                        return;
                    }
                    setForfeitureModal(null);
                }}
            />
        </>
    );
}
