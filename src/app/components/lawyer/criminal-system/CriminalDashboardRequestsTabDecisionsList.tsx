import React, { Suspense } from 'react';
import type { CaseStage, JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalActionParty } from './criminalPartyLabelCore';
import type { CriminalCase, CriminalDefendant, LawyerRequest } from './criminalStore';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { JourneyNode } from '@/app/types/criminal';
import type {
    DecisionsLedgerKindFilter,
    JudicialDecisionsLedgerProps,
    LiveArrestSummonCardRenderContext,
    LiveDetentionCardRenderContext,
} from './components/JudicialDecisionsLedger';
import type { AddTrialSessionInput, TrialSession } from './trialSessionsDisplay';
import { filterTrialSessionsForDisplay } from './trialSessionsDisplay';
import type { TrialsTabProps } from './components/TrialsTab';
import {
    LazyJudicialDecisionsLedger,
    LazyLiveArrestSummonCard,
    LazyLiveDetentionCard,
    LazyTrialsTab,
} from './criminalDashboardLazyRegistry';

type EnforcementPatch = Record<string, unknown>;

export type CriminalDashboardRequestsTabDecisionsListProps = {
    id: string;
    decisionsKindFilter: DecisionsLedgerKindFilter;
    showTrialsTab: boolean;
    caseStage: CaseStage;
    phaseFilteredTrialSessions: TrialSession[];
    scheduledHearingDate: string;
    remandPivotDate: string | null | undefined;
    judicialDecisionsLedger: JudicialDecision[];
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;
    isFrozen: boolean;
    criminalCaseUserRole?: CriminalCaseUserRole;
    trialSessionAddModalOpen: boolean;
    setTrialSessionAddModalOpen: (open: boolean) => void;
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
    openStageFinalDecisionFromTrialSession?: (sessionId: string) => void;
    openAppealModal: (decision: JudicialDecision, kind: 'ordinary') => void;
    handleInterventionCassation?: NonNullable<JudicialDecisionsLedgerProps['onInterventionCassation']>;
    handleCassationCorrection?: NonNullable<JudicialDecisionsLedgerProps['onCassationCorrection']>;
    handleDeclareJudgmentFinal?: NonNullable<JudicialDecisionsLedgerProps['onDeclareJudgmentFinal']>;
    getPendingCassationAppealForResult: (decision: JudicialDecision) => JudicialDecisionAppeal | undefined;
    setCassationResultContext: (value: { decision: JudicialDecision; appeal: JudicialDecisionAppeal }) => void;
    currentAccusationArticle: string;
    criminalCase: CriminalCase;
    showLegalToast: (message: string, duration?: number) => void;
    visibleJudicialDecisions: JudicialDecision[];
    allParties: CriminalActionParty[];
    defendants: CriminalDefendant[];
    phaseFilteredLawyerRequests: LawyerRequest[];
    stageJourney: JourneyNode[];
    isInvestigationDossierSealed: boolean;
    pendingLawyerRequestsForFeed: LawyerRequest[];
    openRequestQuickFinalizeModal?: NonNullable<JudicialDecisionsLedgerProps['onRecordJudgeMargin']>;
    isDecisionsTabMaterialReadOnly: boolean;
    handleMoveRequestToTrash?: NonNullable<JudicialDecisionsLedgerProps['onMoveRequestToTrash']>;
    criminalCaseForInvestigationPurge?: CriminalCase;
    crimeType?: string;
    activeLegalArticle?: string;
    handleRequestOrderProceedingsBlockChange?: NonNullable<
        JudicialDecisionsLedgerProps['onRequestOrderProceedingsBlockChange']
    >;
    addRequestMargin: (caseId: string, requestId: string, text: string) => void;
    toggleRequestStar: (caseId: string, requestId: string) => void;
    getProceduralRefsForRequest: NonNullable<JudicialDecisionsLedgerProps['proceduralRefsForRequest']>;
    navigateToProceduralItem: NonNullable<JudicialDecisionsLedgerProps['onNavigateProcedural']>;
    handleMoveDecisionToTrash?: NonNullable<JudicialDecisionsLedgerProps['onMoveToTrash']>;
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
    kindFilteredJudicialDecisions: JudicialDecision[];
    setVisibleJudicialDecisionsCount: React.Dispatch<React.SetStateAction<number>>;
    decisionsPageSize: number;
};

export function CriminalDashboardRequestsTabDecisionsList(
    props: CriminalDashboardRequestsTabDecisionsListProps,
) {
    const {
        id,
        decisionsKindFilter,
        showTrialsTab,
        caseStage,
        phaseFilteredTrialSessions,
        scheduledHearingDate,
        remandPivotDate,
        judicialDecisionsLedger,
        isTimelineArchiveReadOnly,
        isDashboardReadOnly,
        isFrozen,
        criminalCaseUserRole,
        trialSessionAddModalOpen,
        setTrialSessionAddModalOpen,
        addTrialSession,
        updateTrialSession,
        documentTrialSessionPreparatoryDecision,
        postponeTrialSession,
        openStageFinalDecisionFromTrialSession,
        openAppealModal,
        handleInterventionCassation,
        handleCassationCorrection,
        handleDeclareJudgmentFinal,
        getPendingCassationAppealForResult,
        setCassationResultContext,
        currentAccusationArticle,
        criminalCase,
        showLegalToast,
        visibleJudicialDecisions,
        allParties,
        defendants,
        phaseFilteredLawyerRequests,
        stageJourney,
        isInvestigationDossierSealed,
        pendingLawyerRequestsForFeed,
        openRequestQuickFinalizeModal,
        isDecisionsTabMaterialReadOnly,
        handleMoveRequestToTrash,
        criminalCaseForInvestigationPurge,
        crimeType,
        activeLegalArticle,
        handleRequestOrderProceedingsBlockChange,
        addRequestMargin,
        toggleRequestStar,
        getProceduralRefsForRequest,
        navigateToProceduralItem,
        handleMoveDecisionToTrash,
        primaryDefendant,
        autoConcernedPartyId,
        openQuickBailFromDecision,
        extendDetentionOnDecision,
        documentDetentionReleaseOnDecision,
        updateOrderEnforcementOnDecision,
        kindFilteredJudicialDecisions,
        setVisibleJudicialDecisionsCount,
        decisionsPageSize,
    } = props;

    return (
        <>
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
                        onDocumentPreparatoryDecision={(
                            input: Parameters<
                                CriminalDashboardRequestsTabDecisionsListProps['documentTrialSessionPreparatoryDecision']
                            >[1],
                        ) => documentTrialSessionPreparatoryDecision(id, input)}
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
                        renderLiveDetentionCard={({
                            decision,
                            allDecisions,
                            partyLabel,
                            caseStage: cardCaseStage,
                            crimeTypeLabel: cardCrimeType,
                            onAppeal,
                            onResult,
                            onInterventionCassation,
                            onCassationCorrection,
                            onDeclareJudgmentFinal,
                            onMoveToTrash,
                        }: LiveDetentionCardRenderContext) => (
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
                        renderLiveArrestSummonCard={({
                            decision,
                            partyLabel,
                            onMoveToTrash,
                        }: LiveArrestSummonCardRenderContext) => (
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
        </>
    );
}
