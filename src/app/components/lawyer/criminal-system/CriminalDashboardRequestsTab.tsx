import React, { useCallback, useEffect, useState } from 'react';
import type { DecisionsScopeFilter } from './casePhaseFilterEngine';
import type { VerdictCard } from './verdictCardsEngine';
import { useCriminalDashboardRequestsTabData } from './useCriminalDashboardRequestsTabData';
import { TrialHearingDateModal } from './components/modals/TrialHearingDateModal';
import { filterTrialSessionsForDisplay, normalizeTrialSessions } from './trialSessionsDisplay';
import { useCriminalStore } from './criminalStore';
import { useCriminalLocalOverlayEscape } from './useCriminalLocalOverlayEscape';
import { CriminalDashboardRequestsTabFilters } from './CriminalDashboardRequestsTabFilters';
import { CriminalDashboardRequestsTabHearingTools } from './CriminalDashboardRequestsTabHearingTools';
import { CriminalDashboardRequestsTabVerdictSection } from './CriminalDashboardRequestsTabVerdictSection';
import { CriminalDashboardRequestsTabDecisionsList } from './CriminalDashboardRequestsTabDecisionsList';
import type { CriminalDashboardRequestsTabProps } from './criminalDashboardRequestsTabProps';

export type { CriminalDashboardRequestsTabProps } from './criminalDashboardRequestsTabProps';

type DecisionScopeOption = { value: DecisionsScopeFilter; label?: string };

export function CriminalDashboardRequestsTab(props: CriminalDashboardRequestsTabProps) {
    const {
        id,
        decisionsKindFilter,
        setDecisionsKindFilter,
        isInvestigationPhase,
        showTrialsTab,
        trialSessionsTabLabel,
        switchDashboardTab,
        setTrialSessionAddModalOpen,
        openAdultJudicialDecisionModal,
        openJuvenileJudicialDecisionModal,
        openLawyerMotionModal,
        canCreateDecisionsOrRequests,
        decisionsScopeFilter,
        setDecisionsScopeFilter,
        effectiveDecisionsScope,
        defendants,
        effectiveUiStage,
        caseStage,
        criminalCase,
        isDecisionsTabMaterialReadOnly,
        criminalCaseUserRole,
        sendToCassationOnVerdictCard,
        updateVerdictCardDraft,
        patchVerdictCardOrdinaryAppeal,
        recordVerdictCardCassationResult,
        patchVerdictCardCorrectionAppeal,
        recordVerdictAbsentiaPublication,
        recordVerdictAbsentiaObjection,
        openVerdictCassationFilingCard,
        sortedLawyerRequestsForNode,
        trialSessions,
        activeJourneyBranch,
        isHistoricalNodeView,
        selectedJourneyNode,
        verdictCards,
        isTimelineArchiveReadOnly,
        isDashboardReadOnly,
        isFrozen,
        trialSessionAddModalOpen,
        addTrialSession,
        updateTrialSession,
        documentTrialSessionPreparatoryDecision,
        postponeTrialSession,
        registerInitialTrialHearingDate,
        openStageFinalDecisionFromTrialSession,
        currentAccusationArticle,
        showLegalToast,
        allParties,
        stageJourney,
        isInvestigationDossierSealed,
        crimeType,
        activeLegalArticle,
        openAppealModal,
        setCassationResultContext,
        handleRequestOrderProceedingsBlockChange,
        addRequestMargin,
        toggleRequestStar,
        getProceduralRefsForRequest,
        navigateToProceduralItem,
        handleMoveDecisionToTrash,
        handleMoveRequestToTrash,
        openRequestQuickFinalizeModal,
        criminalCaseForInvestigationPurge,
        primaryDefendant,
        autoConcernedPartyId,
        openQuickBailFromDecision,
        extendDetentionOnDecision,
        documentDetentionReleaseOnDecision,
        updateOrderEnforcementOnDecision,
        handleInterventionCassation,
        handleCassationCorrection,
        handleDeclareJudgmentFinal,
        getPendingCassationAppealForResult,
        visibleLawyerRequestsCount,
        visibleJudicialDecisionsCount,
        setVisibleJudicialDecisionsCount,
        decisionsPageSize,
    } = props;

    const [trialHearingDateModalOpen, setTrialHearingDateModalOpen] = useState(false);
    const closeTrialHearingDateModal = useCallback(() => setTrialHearingDateModalOpen(false), []);
    useCriminalLocalOverlayEscape({
        open: trialHearingDateModalOpen,
        onClose: closeTrialHearingDateModal,
    });
    const showTrialHearingDateTools =
        showTrialsTab && (caseStage === 'misdemeanor' || caseStage === 'felony');
    const trialHearingReadOnly =
        isTimelineArchiveReadOnly || isDashboardReadOnly || isFrozen || !canCreateDecisionsOrRequests;
    const normalizedTrialSessions = normalizeTrialSessions(trialSessions);
    const scheduledHearingDate = String(criminalCase.location.nextHearingDate ?? '').trim();
    const realTrialSessions = filterTrialSessionsForDisplay(
        normalizedTrialSessions,
        scheduledHearingDate,
    );

    useEffect(() => {
        if (!id) return;
        useCriminalStore.getState().prunePhantomScheduledTrialSessions(id);
    }, [id, scheduledHearingDate, trialSessions.length, decisionsKindFilter]);

    const showInitialTrialHearingCta =
        showTrialHearingDateTools &&
        !trialHearingReadOnly &&
        realTrialSessions.length === 0 &&
        !scheduledHearingDate;
    const showTrialHearingDateHint =
        showTrialHearingDateTools &&
        realTrialSessions.length === 0 &&
        scheduledHearingDate &&
        decisionsKindFilter !== 'trial_sessions';

    const {
        investigationDefendantsPartyMix,
        phaseFilteredLawyerRequests,
        judicialDecisionsLedger,
        kindFilteredJudicialDecisions,
        pendingLawyerRequestsForFeed,
        visibleJudicialDecisions,
        phaseFilteredTrialSessions,
        currentVerdictCardsForPanel,
        verdictCardsForNode,
        decisionsScopeOptions,
        remandPivotDate,
    } = useCriminalDashboardRequestsTabData({
        requestsTabActive: true,
        criminalCase,
        defendants,
        sortedLawyerRequestsForNode,
        effectiveDecisionsScope,
        effectiveUiStage,
        stageJourney,
        trialSessions,
        activeJourneyBranch,
        isHistoricalNodeView,
        selectedJourneyNode,
        decisionsKindFilter,
        verdictCards,
        visibleLawyerRequestsCount,
        visibleJudicialDecisionsCount,
    });

    useEffect(() => {
        if (decisionsScopeOptions.length > 0) return;
        if (decisionsScopeFilter !== 'current') {
            setDecisionsScopeFilter('current');
        }
    }, [decisionsScopeOptions.length, decisionsScopeFilter, setDecisionsScopeFilter]);

    useEffect(() => {
        if ((decisionsScopeOptions as DecisionScopeOption[]).some((o) => o.value === decisionsScopeFilter)) return;
        const fallback =
            (decisionsScopeOptions as DecisionScopeOption[]).find((o) => o.value === 'current')?.value ??
            (decisionsScopeOptions as DecisionScopeOption[])[0]?.value ??
            'current';
        setDecisionsScopeFilter(fallback);
    }, [decisionsScopeOptions, decisionsScopeFilter, setDecisionsScopeFilter]);

    const openVerdictCassationFiling = useCallback(
        (cardId: string) => {
            const card = verdictCardsForNode.find((candidate: VerdictCard) => candidate.id === cardId);
            if (card) openVerdictCassationFilingCard(card);
        },
        [openVerdictCassationFilingCard, verdictCardsForNode],
    );

    return (
        <div
            key="criminal-tab-requests"
            className="flex flex-col px-6 pt-2 pb-6 max-w-5xl mx-auto w-full gap-3 print:text-black"
        >
            <CriminalDashboardRequestsTabFilters
                decisionsKindFilter={decisionsKindFilter}
                setDecisionsKindFilter={setDecisionsKindFilter}
                isInvestigationPhase={isInvestigationPhase}
                investigationDefendantsPartyMix={investigationDefendantsPartyMix}
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
                decisionsScopeOptions={decisionsScopeOptions}
            />

            <CriminalDashboardRequestsTabHearingTools
                showInitialTrialHearingCta={Boolean(showInitialTrialHearingCta)}
                showTrialHearingDateHint={Boolean(showTrialHearingDateHint)}
                scheduledHearingDate={scheduledHearingDate}
                onOpenTrialHearingDateModal={() => setTrialHearingDateModalOpen(true)}
            />

            <CriminalDashboardRequestsTabVerdictSection
                id={id}
                showTrialsTab={showTrialsTab}
                decisionsKindFilter={decisionsKindFilter}
                effectiveDecisionsScope={effectiveDecisionsScope}
                currentVerdictCardsForPanel={currentVerdictCardsForPanel}
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
                openVerdictCassationFiling={openVerdictCassationFiling}
                showLegalToast={showLegalToast}
            />

            <CriminalDashboardRequestsTabDecisionsList
                id={id}
                decisionsKindFilter={decisionsKindFilter}
                showTrialsTab={showTrialsTab}
                caseStage={caseStage}
                phaseFilteredTrialSessions={phaseFilteredTrialSessions}
                scheduledHearingDate={scheduledHearingDate}
                remandPivotDate={remandPivotDate}
                judicialDecisionsLedger={judicialDecisionsLedger}
                isTimelineArchiveReadOnly={isTimelineArchiveReadOnly}
                isDashboardReadOnly={isDashboardReadOnly}
                isFrozen={isFrozen}
                criminalCaseUserRole={criminalCaseUserRole}
                trialSessionAddModalOpen={trialSessionAddModalOpen}
                setTrialSessionAddModalOpen={setTrialSessionAddModalOpen}
                addTrialSession={addTrialSession}
                updateTrialSession={updateTrialSession}
                documentTrialSessionPreparatoryDecision={documentTrialSessionPreparatoryDecision}
                postponeTrialSession={postponeTrialSession}
                openStageFinalDecisionFromTrialSession={openStageFinalDecisionFromTrialSession}
                openAppealModal={openAppealModal}
                handleInterventionCassation={handleInterventionCassation}
                handleCassationCorrection={handleCassationCorrection}
                handleDeclareJudgmentFinal={handleDeclareJudgmentFinal}
                getPendingCassationAppealForResult={getPendingCassationAppealForResult}
                setCassationResultContext={setCassationResultContext}
                currentAccusationArticle={currentAccusationArticle}
                criminalCase={criminalCase}
                showLegalToast={showLegalToast}
                visibleJudicialDecisions={visibleJudicialDecisions}
                allParties={allParties}
                defendants={defendants}
                phaseFilteredLawyerRequests={phaseFilteredLawyerRequests}
                stageJourney={stageJourney}
                isInvestigationDossierSealed={isInvestigationDossierSealed}
                pendingLawyerRequestsForFeed={pendingLawyerRequestsForFeed}
                openRequestQuickFinalizeModal={openRequestQuickFinalizeModal}
                isDecisionsTabMaterialReadOnly={isDecisionsTabMaterialReadOnly}
                handleMoveRequestToTrash={handleMoveRequestToTrash}
                criminalCaseForInvestigationPurge={criminalCaseForInvestigationPurge}
                crimeType={crimeType}
                activeLegalArticle={activeLegalArticle}
                handleRequestOrderProceedingsBlockChange={handleRequestOrderProceedingsBlockChange}
                addRequestMargin={addRequestMargin}
                toggleRequestStar={toggleRequestStar}
                getProceduralRefsForRequest={getProceduralRefsForRequest}
                navigateToProceduralItem={navigateToProceduralItem}
                handleMoveDecisionToTrash={handleMoveDecisionToTrash}
                primaryDefendant={primaryDefendant}
                autoConcernedPartyId={autoConcernedPartyId}
                openQuickBailFromDecision={openQuickBailFromDecision}
                extendDetentionOnDecision={extendDetentionOnDecision}
                documentDetentionReleaseOnDecision={documentDetentionReleaseOnDecision}
                updateOrderEnforcementOnDecision={updateOrderEnforcementOnDecision}
                kindFilteredJudicialDecisions={kindFilteredJudicialDecisions}
                setVisibleJudicialDecisionsCount={setVisibleJudicialDecisionsCount}
                decisionsPageSize={decisionsPageSize}
            />

            <TrialHearingDateModal
                open={trialHearingDateModalOpen}
                currentDate={criminalCase.location.nextHearingDate}
                onClose={closeTrialHearingDateModal}
                onSave={(date) => {
                    const err = registerInitialTrialHearingDate(id, date);
                    if (err) return err;
                    showLegalToast('✓ تم تسجيل موعد المحاكمة.', 4500);
                    return null;
                }}
            />
        </div>
    );
}
