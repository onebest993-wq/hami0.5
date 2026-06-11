import React, { useState } from 'react';
import { AppealOriginBadge } from './AppealOriginBadge';
import { AppealProceedingsSummary } from './AppealProceedingsSummary';
import GlowingDot from './GlowingDot';
import type { Decision } from '../types';
import {
    AppealResultChip,
    DECISION_META_CHIP,
    DECISION_BTN_DEBTOR_APPEAL_NOTICE,
} from '../decisionCardPresentation';
import {
    DECISION_GLASS_CARD,
    cleanTitle,
    formatDateNumeric,
    appealWindowsFromClockYmd,
    decisionAppealClockYmd,
    cassationButtonTitles,
    deriveDecisionHubStatus,
    appealPipelineRowForCard,
    buildAppealProceedingsForDecision,
    resolveAppealWorkflowPhaseLabel,
    resolveRequestFilerFromDebtorAgentView,
    resolveUnderlyingDecisionHub,
    resolveCreditorRequestAppealGate,
    resolveCreditorDecisionEnforcementState,
    isExecutorDecisionAppealFinal,
    resolveDebtorAgentRequestFateLine,
    shouldHideDebtorAgentFateLine,
    shouldShowAppealResultChipSeparate,
    resolveAppealResultActorForClient,
    resolveEffectiveAppealActor,
    isCreditorInitiatedExecutorRequest,
    COMPACT_APPEAL_PROCEEDINGS_MAX,
} from '../utils';
import type { AppealDeadlineWindows, DecisionsAppealsAppealSlot } from '../utils';
import type { AppealUiPerspective } from '../appealUiLabels';
import { appealDebtorGrievanceNoticeLabel } from '../appealUiLabels';

type AppealWorkflowCardProps = {
    decision: Decision;
    decisions: Decision[];
    appealCardRank?: number;
    appealCardsTotal?: number;
    appealPerspective?: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    buildDecisionCardStatus: (
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[]
    ) => { statusPillEl: React.ReactNode };
    canShowAppealInitialForDecision: (d: Decision) => boolean;
    renderAppealEntryButtons: (
        decision: Decision,
        windows: AppealDeadlineWindows,
        opts?: { pathLockedOnOriginal?: boolean; lockedBecauseActiveCopy?: boolean }
    ) => React.ReactNode;
    renderAppealGrievanceDecideButtons: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot
    ) => React.ReactNode;
    renderAppealTamyeezPhasePanel: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        cassTips: ReturnType<typeof cassationButtonTitles>,
        onCommitTamyeezNumber: (v: string) => void
    ) => React.ReactNode;
    renderAppealAwaitingCassationButtons: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        appealWindowClosed: boolean,
        canManageAppealHere: boolean
    ) => React.ReactNode;
    transitionAppealWorkflow: (
        decision: Decision,
        patch: Partial<Decision>,
        timelineTitle?: string,
        timelineDescription?: string,
        tone?: 'emerald' | 'rose' | 'amber' | 'slate'
    ) => void;
};

function AppealWorkflowCard({
    decision,
    decisions,
    appealCardRank = 0,
    appealCardsTotal = 1,
    appealPerspective = 'creditor_agent',
    requestNeedsExecutorOutcome,
    buildDecisionCardStatus,
    canShowAppealInitialForDecision,
    renderAppealEntryButtons,
    renderAppealGrievanceDecideButtons,
    renderAppealTamyeezPhasePanel,
    renderAppealAwaitingCassationButtons,
    transitionAppealWorkflow,
}: AppealWorkflowCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const state = decision.appealWorkflowState ?? 'NONE';
    const windows = appealWindowsFromClockYmd(decisionAppealClockYmd(decision));
    const appealWindowClosed = !windows.canTamyeez;
    const hasAppealActivity =
        decision.appealActor === 'lawyer' ||
        decision.appealActor === 'debtor' ||
        decision.appealMethod === 'tadhallum' ||
        decision.appealMethod === 'tamyeez' ||
        decision.appealStatus === 'tadhallum_filed' ||
        decision.appealStatus === 'tamyeez_filed' ||
        decision.appealPhase === 'grievance' ||
        decision.appealPhase === 'cassation' ||
        Boolean(decision.awaitingCassationEntryBy) ||
        Boolean(decision.grievanceRejectedAwaitingTamyeez) ||
        Boolean(decision.grievanceAcceptedAwaitingDebtorTamyeez) ||
        Boolean(decision.appealResult) ||
        (Array.isArray(decision.appealTimelineLogs) && decision.appealTimelineLogs.length > 0) ||
        state === 'PENDING_APPEAL_LAWYER' ||
        state === 'PENDING_APPEAL_DEBTOR' ||
        state === 'FINAL_ACCEPTED' ||
        state === 'FINAL_REJECTED' ||
        state === 'REVOKED_BY_APPEAL';
    const isFinalLocked =
        state === 'FINAL_ACCEPTED' ||
        state === 'FINAL_REJECTED' ||
        state === 'REVOKED_BY_APPEAL' ||
        Boolean(decision.appealResult) ||
        decision.appealStatus === 'final';
    const canShowInitialAppealActions =
        !decision.appealSourceDecisionId &&
        state === 'NONE' &&
        !hasAppealActivity &&
        !isFinalLocked &&
        !appealWindowClosed &&
        canShowAppealInitialForDecision(decision);
    const cassTips = cassationButtonTitles(decision, appealPerspective);
    const underlyingHub = resolveUnderlyingDecisionHub(decision, decisions);
    const showDebtorGrievanceNotice =
        decision.appealActor === 'debtor' &&
        decision.appealMethod === 'tadhallum' &&
        decision.appealStatus === 'tadhallum_filed' &&
        (state === 'PENDING_APPEAL_LAWYER' || state === 'PENDING_APPEAL_DEBTOR') &&
        (appealPerspective !== 'debtor_agent' ||
            !isCreditorInitiatedExecutorRequest(underlyingHub));
    const titleClean = cleanTitle(decision.title);
    const hubStatus = deriveDecisionHubStatus(decision, requestNeedsExecutorOutcome);
    const showExecutorPendingFooter = hubStatus === 'pending';
    const { statusPillEl } = buildDecisionCardStatus(decision, appealWindowClosed, decisions);
    const pipelineRow = appealPipelineRowForCard(decision, decisions);
    const appealProceedings = buildAppealProceedingsForDecision(pipelineRow, appealPerspective);
    const requestAppealGate = resolveCreditorRequestAppealGate(
        decision,
        pipelineRow,
        appealPerspective
    );
    const settled = !requestNeedsExecutorOutcome(decision);
    const phaseLabel = resolveAppealWorkflowPhaseLabel(pipelineRow, appealPerspective);
    const hubTitleClean = cleanTitle(underlyingHub.title);
    const isAppealCopy = Boolean(decision.appealSourceDecisionId);
    const showHubLink = isAppealCopy && underlyingHub.id !== decision.id && hubTitleClean;
    const appealLegallyFinal = isExecutorDecisionAppealFinal(decision, pipelineRow, {
        appealWindowClosed,
        appealTrackActive: hasAppealActivity && !appealWindowClosed,
    });
    const enforcementState = resolveCreditorDecisionEnforcementState(decision, pipelineRow, {
        hubTab: 'appeals',
        appealLegallyFinal,
        needsExecutor: requestNeedsExecutorOutcome(decision),
        appealPerspective,
        allDecisions: decisions,
    });
    const dateStr = formatDateNumeric(decision.date);
    const hideDebtorFateLine = shouldHideDebtorAgentFateLine(
        enforcementState.pillLabel,
        requestAppealGate
    );
    const showAppealResultChip =
        Boolean(pipelineRow.appealResult) &&
        shouldShowAppealResultChipSeparate(enforcementState.pillLabel, appealPerspective);
    const appealResultActor =
        resolveAppealResultActorForClient(pipelineRow, decision, appealPerspective) ??
        resolveEffectiveAppealActor(pipelineRow, decision, appealPerspective);
    const compactAppealProceedings =
        appealProceedings.length > 0 &&
        appealProceedings.length <= COMPACT_APPEAL_PROCEEDINGS_MAX;
    const expandableAppealProceedings =
        appealProceedings.length > COMPACT_APPEAL_PROCEEDINGS_MAX;

    return (
        <div
            id={`hami-appeal-card-${decision.id}`}
            className={`${DECISION_GLASS_CARD} ${
                appealCardRank === 0 ? 'ring-1 ring-amber-400/30 shadow-[0_0_24px_rgba(251,191,36,0.08)]' : ''
            }`}
            dir="rtl"
        >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="mb-1 flex flex-wrap items-center justify-end gap-1.5">
                    {appealCardRank === 0 && appealCardsTotal > 1 ? (
                        <span className="rounded-md border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-100">
                            الأحدث
                        </span>
                    ) : null}
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">
                        {phaseLabel}
                    </span>
                    {isAppealCopy ? (
                        <span className="rounded-md border border-violet-400/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-100">
                            نسخة طعن
                        </span>
                    ) : null}
                </div>
                <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-right">
                        <GlowingDot
                            status={decision.appealStatus}
                            outcome={decision.executorOutcome}
                            origin={decision.appealRequestOrigin}
                            perspective={appealPerspective}
                            requestFiler={
                                appealPerspective === 'debtor_agent'
                                    ? resolveRequestFilerFromDebtorAgentView(underlyingHub)
                                    : undefined
                            }
                        />
                        <h3 className="break-words text-sm font-bold text-slate-100">{titleClean}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">{statusPillEl}</div>
                </div>

                <div className="mb-2 flex flex-col gap-1.5 text-[10px] text-slate-400">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span>{dateStr}</span>
                            <AppealOriginBadge decision={decision} perspective={appealPerspective} />
                        </div>
                        {decision.tamyeezDecisionNumber?.trim() ? (
                            <span className={DECISION_META_CHIP}>
                                تمييز: {decision.tamyeezDecisionNumber}
                            </span>
                        ) : null}
                    </div>
                    {appealPerspective === 'debtor_agent' && settled && !hideDebtorFateLine ? (
                        <p
                            className={`${DECISION_META_CHIP} inline-flex w-full justify-end text-[10px] leading-relaxed ${
                                enforcementState.enforced
                                    ? 'border-rose-400/20 text-rose-200/90'
                                    : enforcementState.pillLabel.includes('لصالح موكّلنا')
                                      ? 'border-emerald-400/20 text-emerald-100/90'
                                      : 'border-white/12 text-slate-200/90'
                            }`}
                        >
                            {resolveDebtorAgentRequestFateLine(enforcementState, requestAppealGate)}
                        </p>
                    ) : null}
                    {showHubLink ? (
                        <p className="text-[10px] leading-relaxed text-slate-500">
                            القرار الأصلي:{' '}
                            <span className="font-semibold text-slate-300">{hubTitleClean}</span>
                        </p>
                    ) : null}
                </div>

                {showDebtorGrievanceNotice ||
                appealProceedings.length > 0 ||
                (appealWindowClosed && !isFinalLocked) ||
                showExecutorPendingFooter ? (
                    <div className="mt-1 border-t border-white/5 pt-2 space-y-1">
                        {compactAppealProceedings ? (
                            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5">
                                <AppealProceedingsSummary
                                    row={pipelineRow}
                                    perspective={appealPerspective}
                                />
                            </div>
                        ) : expandableAppealProceedings ? (
                            <>
                                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                    <button
                                        type="button"
                                        onClick={() => setShowDetails(!showDetails)}
                                        className="text-gray-500 hover:text-white transition-colors underline decoration-dotted underline-offset-2"
                                    >
                                        {showDetails ? 'إخفاء مسار الطعن' : 'تفاصيل الطعن'}
                                    </button>
                                </div>
                                {showDetails ? (
                                    <div className="transition-all duration-300 ease-in-out overflow-hidden">
                                        <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                                            <AppealProceedingsSummary
                                                row={pipelineRow}
                                                perspective={appealPerspective}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        ) : null}
                        {showDebtorGrievanceNotice ? (
                            <span className={`${DECISION_BTN_DEBTOR_APPEAL_NOTICE} pointer-events-none`}>
                                {appealDebtorGrievanceNoticeLabel(appealPerspective)}
                            </span>
                        ) : null}
                        {appealWindowClosed && !isFinalLocked ? (
                            <p className="text-[10px] leading-relaxed text-slate-300">
                                انتهت مهلة الطعن وأصبح القرار باتاً.
                            </p>
                        ) : null}
                        {showExecutorPendingFooter ? (
                            <p className="text-[10px] leading-relaxed text-blue-400/80">قيد المعالجة</p>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="mt-2 flex min-w-0 flex-col gap-1.5 text-right">
                {showAppealResultChip && pipelineRow.appealResult ? (
                    <div className="flex justify-end">
                        <AppealResultChip
                            result={pipelineRow.appealResult}
                            flowGateKind={requestAppealGate.kind}
                            perspective={appealPerspective}
                            appealActor={appealResultActor}
                        />
                    </div>
                ) : null}
                {canShowInitialAppealActions
                    ? renderAppealEntryButtons(decision, windows)
                    : null}
                {(state === 'PENDING_APPEAL_LAWYER' || state === 'PENDING_APPEAL_DEBTOR') &&
                    decision.appealStatus === 'tadhallum_filed' &&
                    renderAppealGrievanceDecideButtons(decision, 'appealsTab')}
                {(state === 'PENDING_APPEAL_LAWYER' || state === 'PENDING_APPEAL_DEBTOR') &&
                    decision.appealMethod === 'tamyeez' &&
                    renderAppealTamyeezPhasePanel(decision, 'appealsTab', cassTips, (v) =>
                        transitionAppealWorkflow(
                            decision,
                            { tamyeezDecisionNumber: v },
                            'حفظ رقم القرار التمييزي',
                            `تم حفظ رقم القرار التمييزي: ${v}`,
                            'amber'
                        )
                    )}
                {renderAppealAwaitingCassationButtons(
                    pipelineRow,
                    'appealsTab',
                    appealWindowClosed,
                    true
                )}
            </div>
        </div>
    );
}

export default React.memo(AppealWorkflowCard);
