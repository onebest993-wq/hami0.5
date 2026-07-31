import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { CaseStage, JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalActionParty } from './criminalPartyLabelCore';
import type { CriminalCase, CriminalDefendant, LawyerRequest } from './criminalStore';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { JourneyNode } from '@/app/types/criminal';
import type { DecisionsScopeFilter } from './casePhaseFilterEngine';
import type { DecisionsLedgerKindFilter, JudicialDecisionsLedgerProps, LiveArrestSummonCardRenderContext, LiveDetentionCardRenderContext } from './components/JudicialDecisionsLedger';
import type { VerdictCardsPanelProps } from './components/VerdictCardsPanel';
import type { AddTrialSessionInput, TrialSession } from './trialSessionsEngine';
import type { JourneyBranchTrack } from './stageJourney';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type { VerdictCard } from './verdictCardsEngine';
import { useCriminalDashboardRequestsTabData } from './useCriminalDashboardRequestsTabData';
import * as TrialsTabModule from './components/TrialsTab';
import { TrialHearingDateModal } from './components/modals/TrialHearingDateModal';
import { TrialHearingDateHint } from './components/TrialHearingDateHint';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';
import { filterTrialSessionsForDisplay, normalizeTrialSessions } from './trialSessionsEngine';
import { useCriminalStore } from './criminalStore';

const LazyDecisionsCommandBar = lazy(() =>
    import('./components/DecisionsCommandBar').then((m) => ({ default: m.DecisionsCommandBar })),
);

const LazyDecisionsScopeFilterBar = lazy(() =>
    import('./components/DecisionsScopeFilterBar').then((m) => ({ default: m.DecisionsScopeFilterBar })),
);

const LazyJudicialDecisionsLedger = lazy(() =>
    import('./components/JudicialDecisionsLedger').then((m) => ({ default: m.JudicialDecisionsLedger })),
);

const LazyLiveArrestSummonCard = lazy(() =>
    import('./components/LiveArrestSummonCard').then((m) => ({ default: m.LiveArrestSummonCard })),
);

const LazyLiveDetentionCard = lazy(() =>
    import('./components/LiveDetentionCard').then((m) => ({ default: m.LiveDetentionCard })),
);

const LazyTrialsTab = lazy(() =>
    Promise.resolve({ default: TrialsTabModule.TrialsTab }),
);

const LazyVerdictCardsPanel = lazy(() =>
    import('./components/VerdictCardsPanel').then((m) => ({ default: m.VerdictCardsPanel })),
);

type VerdictDraft = Parameters<VerdictCardsPanelProps['onUpdateDraft']>[1];
type VerdictOrdinaryAppealPatch = Parameters<VerdictCardsPanelProps['onSaveOrdinaryAppeal']>[1];
type VerdictCassationResultInput = Parameters<VerdictCardsPanelProps['onSaveVerdictCassationResult']>[1];
type VerdictCorrectionAppealPatch = Parameters<VerdictCardsPanelProps['onSaveCorrectionAppeal']>[1];
type DecisionScopeOption = { value: DecisionsScopeFilter; label?: string };
type EnforcementPatch = Record<string, unknown>;

type CriminalDashboardRequestsTabProps = {
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
        input: Parameters<NonNullable<import('./components/TrialsTab').TrialsTabProps['onDocumentPreparatoryDecision']>>[0],
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
    handleRequestOrderProceedingsBlockChange?: NonNullable<JudicialDecisionsLedgerProps['onRequestOrderProceedingsBlockChange']>;
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
            <div className="flex flex-col items-center gap-1 print:hidden">
                <Suspense fallback={null}>
                    <LazyDecisionsCommandBar
                        activeFilter={decisionsKindFilter}
                        onFilterChange={setDecisionsKindFilter}
                        showInvestigationJudicialTabs={isInvestigationPhase}
                        partyMix={investigationDefendantsPartyMix}
                        showTrialSessionsFilter={showTrialsTab}
                        trialSessionsTabLabel={trialSessionsTabLabel}
                        onOpenTrialSessionModal={() => {
                            switchDashboardTab('requests');
                            setDecisionsKindFilter('trial_sessions');
                            setTrialSessionAddModalOpen(true);
                        }}
                        onOpenAdultJudicialDecisionModal={openAdultJudicialDecisionModal}
                        onOpenJuvenileJudicialDecisionModal={openJuvenileJudicialDecisionModal}
                        onOpenLawyerMotionModal={openLawyerMotionModal}
                        readOnly={!canCreateDecisionsOrRequests}
                    />
                </Suspense>
                <Suspense fallback={null}>
                    <LazyDecisionsScopeFilterBar
                        value={decisionsScopeFilter}
                        onChange={setDecisionsScopeFilter}
                        options={decisionsScopeOptions}
                    />
                </Suspense>
            </div>

            {showInitialTrialHearingCta ? (
                <div className="flex justify-center print:hidden">
                    <button
                        type="button"
                        data-testid={CRIMINAL_DOSSIER_TEST_IDS.trialHearingDateOpen}
                        onClick={() => setTrialHearingDateModalOpen(true)}
                        className="min-h-[44px] rounded-xl border border-[#E6C673]/50 bg-[#E6C673] px-5 text-sm font-black text-[#0B1021] hover:brightness-110 active:brightness-95 transition touch-manipulation"
                    >
                        تسجيل موعد المحاكمة
                    </button>
                </div>
            ) : null}

            {showTrialHearingDateHint ? (
                <div className="print:hidden">
                    <TrialHearingDateHint hearingDate={scheduledHearingDate} />
                </div>
            ) : null}

            {showTrialsTab &&
            decisionsKindFilter === 'trial_sessions' &&
            effectiveDecisionsScope === 'current' ? (
                <Suspense fallback={null}>
                    <LazyVerdictCardsPanel
                        cards={currentVerdictCardsForPanel}
                        defendants={defendants}
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
                        userRole={criminalCaseUserRole}
                        sendToCassation={sendToCassationOnVerdictCard}
                        onUpdateDraft={(cardId: string, draft: VerdictDraft) => updateVerdictCardDraft(id, cardId, draft)}
                        onSaveOrdinaryAppeal={(cardId: string, patch: VerdictOrdinaryAppealPatch) =>
                            patchVerdictCardOrdinaryAppeal(id, cardId, patch)
                        }
                        onSaveVerdictCassationResult={(cardId: string, input: VerdictCassationResultInput) => {
                            const err = recordVerdictCardCassationResult(id, cardId, input);
                            if (err) {
                                showLegalToast(err, 4500);
                                return err;
                            }
                            showLegalToast('✓ تم تسجيل قرار التمييز.', 4500);
                            return null;
                        }}
                        onSaveCorrectionAppeal={(cardId: string, patch: VerdictCorrectionAppealPatch) =>
                            patchVerdictCardCorrectionAppeal(id, cardId, patch)
                        }
                        onRecordAbsentiaPublication={(cardId: string, publicationDate: string) => {
                            const err = recordVerdictAbsentiaPublication(id, cardId, publicationDate);
                            if (err) {
                                showLegalToast(err, 4500);
                            }
                        }}
                        onRecordAbsentiaObjection={(cardId: string) => {
                            const err = recordVerdictAbsentiaObjection(id, cardId);
                            if (err) {
                                showLegalToast(err, 4500);
                                return;
                            }
                            showLegalToast('✓ تم تسجيل الاعتراض الغيابي.', 4500);
                        }}
                        onOpenCassationFiling={openVerdictCassationFiling}
                    />
                </Suspense>
            ) : null}

            {decisionsKindFilter === 'trial_sessions' && showTrialsTab ? (
                <Suspense fallback={null}>
                    <LazyTrialsTab
                        embedded
                        caseId={id}
                        caseStage={caseStage}
                        sessions={filterTrialSessionsForDisplay(
                            phaseFilteredTrialSessions,
                            scheduledHearingDate,
                        )}
                        scheduledHearingDate={scheduledHearingDate}
                        remandPivotDate={remandPivotDate}
                        judicialDecisions={judicialDecisionsLedger}
                        readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly || isFrozen}
                        userRole={criminalCaseUserRole}
                        addModalOpen={trialSessionAddModalOpen}
                        onAddModalOpenChange={setTrialSessionAddModalOpen}
                        onAddSession={(payload: AddTrialSessionInput) => addTrialSession(id, payload)}
                        onUpdateSession={(sessionId: string, payload: AddTrialSessionInput) =>
                            updateTrialSession(id, sessionId, payload)
                        }
                        onDocumentPreparatoryDecision={(input: Parameters<CriminalDashboardRequestsTabProps['documentTrialSessionPreparatoryDecision']>[1]) =>
                            documentTrialSessionPreparatoryDecision(id, input)
                        }
                        onPostpone={(sessionId: string, nextDate: string, reason: string, prepNote?: string) =>
                            postponeTrialSession(id, sessionId, nextDate, reason, prepNote)
                        }
                        onOpenStageFinalDecision={openStageFinalDecisionFromTrialSession}
                        onCassationAppeal={(d: JudicialDecision) => openAppealModal(d, 'ordinary')}
                        onInterventionCassation={handleInterventionCassation}
                        onCassationCorrection={handleCassationCorrection}
                        onDeclareJudgmentFinal={handleDeclareJudgmentFinal}
                        onRecordAppealResult={(d: JudicialDecision) => {
                            const appeal = getPendingCassationAppealForResult(d);
                            if (appeal) setCassationResultContext({ decision: d, appeal });
                        }}
                        currentAccusationArticle={currentAccusationArticle}
                        crimeType={criminalCase.basics.crimeType}
                        onError={(msg: string) => {
                            showLegalToast(msg, 4500);
                        }}
                    />
                </Suspense>
            ) : decisionsKindFilter !== 'trial_sessions' ? (
                <Suspense fallback={null}>
                    <LazyJudicialDecisionsLedger
                        decisions={visibleJudicialDecisions}
                        parties={allParties}
                        defendants={defendants}
                        lawyerRequests={phaseFilteredLawyerRequests}
                        stageJourney={stageJourney}
                        readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly}
                        investigationDossierSealed={isInvestigationDossierSealed}
                        kindFilter={decisionsKindFilter}
                        pendingLawyerRequests={
                            decisionsKindFilter === 'lawyer_motion' ? pendingLawyerRequestsForFeed : undefined
                        }
                        onRecordJudgeMargin={openRequestQuickFinalizeModal}
                        onMoveRequestToTrash={
                            isDecisionsTabMaterialReadOnly ? undefined : handleMoveRequestToTrash
                        }
                        investigationPurgeCase={criminalCaseForInvestigationPurge}
                        caseStage={caseStage}
                        crimeTypeLabel={crimeType}
                        userRole={criminalCaseUserRole}
                        activeCaseArticle={activeLegalArticle}
                        onFileAppeal={(d: JudicialDecision) => openAppealModal(d, 'ordinary')}
                        onRecordAppealResult={(d: JudicialDecision, a: JudicialDecisionAppeal) =>
                            setCassationResultContext({ decision: d, appeal: a })
                        }
                        onInterventionCassation={handleInterventionCassation}
                        onCassationCorrection={handleCassationCorrection}
                        onDeclareJudgmentFinal={handleDeclareJudgmentFinal}
                        onRequestOrderProceedingsBlockChange={
                            isDecisionsTabMaterialReadOnly
                                ? undefined
                                : handleRequestOrderProceedingsBlockChange
                        }
                        onAddRequestMargin={(requestId: string, text: string) => addRequestMargin(id, requestId, text)}
                        onToggleRequestStar={(requestId: string) => toggleRequestStar(id, requestId)}
                        proceduralRefsForRequest={getProceduralRefsForRequest}
                        onNavigateProcedural={navigateToProceduralItem}
                        onMoveToTrash={
                            isDecisionsTabMaterialReadOnly ? undefined : handleMoveDecisionToTrash
                        }
                        renderLiveDetentionCard={({ decision, allDecisions, partyLabel, caseStage: cardCaseStage, crimeTypeLabel: cardCrimeType, onAppeal, onResult, onInterventionCassation, onCassationCorrection, onDeclareJudgmentFinal, onMoveToTrash, }: LiveDetentionCardRenderContext) => (
                            <Suspense fallback={null}>
                                <LazyLiveDetentionCard
                                    decision={decision}
                                    allDecisions={allDecisions}
                                    userRole={criminalCaseUserRole}
                                    defendants={defendants}
                                    fallbackDefendantId={primaryDefendant?.id ?? autoConcernedPartyId}
                                    readOnly={isDecisionsTabMaterialReadOnly}
                                    partyLabel={partyLabel}
                                    caseStage={cardCaseStage}
                                    crimeTypeLabel={cardCrimeType}
                                    onAppeal={onAppeal}
                                    onResult={onResult}
                                    onInterventionCassation={onInterventionCassation}
                                    onCassationCorrection={onCassationCorrection}
                                    onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                                    onMoveToTrash={onMoveToTrash}
                                    onExtendDetention={(decision: JudicialDecision, newEndDate: string) => {
                                        const err = extendDetentionOnDecision(id, decision.id, newEndDate);
                                        if (err) return err;
                                        showLegalToast('✓ تم تحديث تاريخ انتهاء التوقيف على نفس البطاقة.', 5000);
                                        return null;
                                    }}
                                    onDocumentRelease={(decision: JudicialDecision) => {
                                        const err = documentDetentionReleaseOnDecision(id, decision.id);
                                        if (err) {
                                            showLegalToast(err, 5000);
                                            return err;
                                        }
                                        showLegalToast('✓ تم توثيق إطلاق السراح — البطاقة مغلقة.', 5000);
                                        return null;
                                    }}
                                    onQuickBailRelease={openQuickBailFromDecision}
                                />
                            </Suspense>
                        )}
                        renderLiveArrestSummonCard={({ decision, partyLabel, onMoveToTrash }: LiveArrestSummonCardRenderContext) => (
                            <Suspense fallback={null}>
                                <LazyLiveArrestSummonCard
                                    decision={decision}
                                    readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly}
                                    partyLabel={partyLabel}
                                    onMoveToTrash={onMoveToTrash}
                                    onUpdateEnforcement={(patch: EnforcementPatch) => {
                                        const err = updateOrderEnforcementOnDecision(id, decision.id, patch);
                                        if (err) {
                                            showLegalToast(err, 5000);
                                            return err;
                                        }
                                        showLegalToast('✓ تم تحديث متابعة تنفيذ الأمر.', 5000);
                                        return null;
                                    }}
                                />
                            </Suspense>
                        )}
                    />
                </Suspense>
            ) : null}

            {decisionsKindFilter !== 'trial_sessions' &&
            kindFilteredJudicialDecisions.length > visibleJudicialDecisions.length ? (
                <div className="flex justify-center pt-1">
                    <button
                        type="button"
                        onClick={() => setVisibleJudicialDecisionsCount((v: number) => v + decisionsPageSize)}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/10 border border-[#E6C673]/30"
                    >
                        تحميل المزيد من القرارات
                    </button>
                </div>
            ) : null}
            <TrialHearingDateModal
                open={trialHearingDateModalOpen}
                currentDate={criminalCase.location.nextHearingDate}
                onClose={() => setTrialHearingDateModalOpen(false)}
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
