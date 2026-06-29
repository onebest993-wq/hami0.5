// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import {
    ArchiveDecisionButton,
} from '../decisionCardPresentation';
import GlowingDot from './GlowingDot';
import { AppealOriginBadge } from './AppealOriginBadge';
import type { Decision } from '../types';
import {
    resolveRequestFilerFromDebtorAgentView,
    resolveUnderlyingDecisionHub,
    resolveExecutorDecisionStatusFlag,
} from '../utils';
import { DecisionCardFollowupShortcuts } from './DecisionCardFollowupShortcuts';
import { DecisionCardExecutorPanel } from './DecisionCardExecutorPanel';
import { DecisionCardDeleteConfirm } from './DecisionCardDeleteConfirm';
import { DecisionCardAppealGatePanel } from './DecisionCardAppealGatePanel';
import { DecisionDebtorFateLine } from './DecisionDebtorFateLine';
import { AppealProceedingsToggle } from './AppealProceedingsToggle';
import { ManualExecutorSmartCardPanel } from './ManualExecutorSmartCardPanel';
import type { DecisionCardProps } from './decisionCardTypes';
import { useDecisionCardDerivedState } from './useDecisionCardDerivedState';

function DecisionCard(props: DecisionCardProps) {
    const {
        decision,
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        hubNoteById,
        setHubNoteById,
        handleExecutorResolveById,
        goToAppealsWithScroll,
        canShowAppealInitialForDecision,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        patchDecisionRow,
        logAppealTimeline,
        btnPrimaryWFull,
        btnPrimaryFlex,
        btnSecondaryFlex,
        onDeleteDecision,
        onArchiveDecision,
        onOpenArchiveTab,
        renderAppealDeadlineLapseActions,
        appealPerspective,
    } = props;

    const derived = useDecisionCardDerivedState({
        decision,
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        appealPerspective,
    });

    const {
        titleClean,
        debtorsCount,
        debtorName,
        hubBodyText,
        isManualLedgerCard,
        showExecutorPendingFooter,
        windows,
        appealWindowClosed,
        appealBusyOnCopy,
        canManageAppealHere,
        hasActiveAppeal,
        cassTips,
        statusPillEl,
        pipelineRow,
        showRegisteredAppealPathLine,
        requestAppealGate,
        requestFlowContinues,
        appealCycleSealed,
        legacyAppealActionsVisible,
        dateStr,
        heirsParty,
        canOpenHeirsEntry,
        seizureCompletionReady,
        seizureCompletionLabel,
        seizureCompletionBusy,
        runSeizureCompletion,
        evictionScheduleReady,
        evictionGraceReady,
        evictionPoliceReady,
        trustDisburseShortcutReady,
        guarantorShortcutReady,
        settled,
        appealLegallyFinal,
        enforcementState,
        isCassated,
        manualExecutorStatusFlag,
        cardClassName,
        canArchive,
        executorAppealEntryOpen,
        showCreditorFollowupActions,
        personalStatusCourtCoerciveBlocked,
        selectedAction,
        setSelectedAction,
        showReasoning,
        setShowReasoning,
        showDetails,
        setShowDetails,
        deleteConfirmId,
        setDeleteConfirmId,
        debtorFateLine,
    } = derived;

    return (
        <motion.div
            id={`hami-decision-card-${decision.id}`}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className={cardClassName}
            dir="rtl"
        >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-right">
                        <GlowingDot
                            status={decision.appealStatus}
                            outcome={decision.executorOutcome}
                            origin={decision.appealRequestOrigin}
                            perspective={appealPerspective}
                            requestFiler={
                                appealPerspective === 'debtor_agent'
                                    ? resolveRequestFilerFromDebtorAgentView(
                                          resolveUnderlyingDecisionHub(decision, decisions)
                                      )
                                    : undefined
                            }
                        />
                        <h4 className="break-words text-sm font-bold text-slate-100">
                            الطلب: {titleClean}
                        </h4>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {decisionsHubTab === 'current' && requestNeedsExecutorOutcome(decision) ? (
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmId(decision.id)}
                                className="text-red-500/70 hover:text-red-500 transition-colors text-sm"
                                title="حذف الطلب"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        ) : null}
                        {canArchive ? (
                            <ArchiveDecisionButton onClick={() => onArchiveDecision(decision.id)} />
                        ) : null}
                        {statusPillEl}
                    </div>
                </div>

                <div className="mb-2 flex flex-col gap-1.5 text-[10px] text-slate-400">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span>{dateStr}</span>
                            <AppealOriginBadge decision={decision} perspective={appealPerspective} />
                        </div>
                    </div>
                    {debtorFateLine ? (
                        <DecisionDebtorFateLine
                            enforcementState={enforcementState}
                            fateLine={debtorFateLine}
                        />
                    ) : null}
                    {hubBodyText ? (
                        <p className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                            {hubBodyText}
                        </p>
                    ) : null}
                    {showExecutorPendingFooter ? (
                        <p className="text-[10px] leading-relaxed text-blue-400/80">
                            قيد المعالجة — بانتظار قرار المنفذ
                        </p>
                    ) : null}
                </div>

                {(debtorsCount > 1 && debtorName) || showRegisteredAppealPathLine ? (
                    <div className="mt-1 border-t border-white/5 pt-2 space-y-1">
                        {debtorsCount > 1 && debtorName ? (
                            <p className="text-sm text-amber-200/90">
                                طلب مقدّم ضد المدين {debtorName}
                            </p>
                        ) : null}
                        {showRegisteredAppealPathLine ? (
                            <AppealProceedingsToggle
                                pipelineRow={pipelineRow}
                                appealPerspective={appealPerspective}
                                showDetails={showDetails}
                                onToggle={() => setShowDetails(!showDetails)}
                            />
                        ) : null}

                    </div>
                ) : null}
            </div>

            <div className="mt-2 flex min-w-0 flex-col gap-1.5 text-right">
                {!isManualLedgerCard &&
                requestAppealGate.kind !== 'continue' &&
                !decision.isArchived &&
                !appealCycleSealed ? (
                    <DecisionCardAppealGatePanel
                        decision={decision}
                        derived={derived}
                        renderAppealAwaitingCassationButtons={renderAppealAwaitingCassationButtons}
                        renderAppealGrievanceDecideButtons={renderAppealGrievanceDecideButtons}
                    />
                ) : null}
                {settled &&
                requestFlowContinues &&
                showCreditorFollowupActions &&
                (canOpenHeirsEntry ||
                    seizureCompletionReady ||
                    guarantorShortcutReady ||
                    trustDisburseShortcutReady ||
                    evictionScheduleReady ||
                    evictionGraceReady ||
                    evictionPoliceReady) ? (
                    <DecisionCardFollowupShortcuts
                        decision={decision}
                        executionId={executionId}
                        btnPrimaryWFull={btnPrimaryWFull}
                        canOpenHeirsEntry={canOpenHeirsEntry}
                        heirsParty={heirsParty}
                        seizureCompletionReady={seizureCompletionReady}
                        seizureCompletionBusy={seizureCompletionBusy}
                        seizureCompletionLabel={seizureCompletionLabel}
                        runSeizureCompletion={runSeizureCompletion}
                        guarantorShortcutReady={guarantorShortcutReady}
                        trustDisburseShortcutReady={trustDisburseShortcutReady}
                        evictionScheduleReady={evictionScheduleReady}
                        evictionGraceReady={evictionGraceReady}
                        evictionPoliceReady={evictionPoliceReady}
                        personalStatusCourtCoerciveBlocked={personalStatusCourtCoerciveBlocked}
                    />
                ) : null}

                {isManualLedgerCard &&
                !decision.isArchived &&
                ((decisionsHubTab === 'previous' &&
                    (resolveExecutorDecisionStatusFlag(decision) === 1 ||
                        resolveExecutorDecisionStatusFlag(decision) === 2)) ||
                    (decisionsHubTab === 'appeals' &&
                        resolveExecutorDecisionStatusFlag(decision) === 2)) ? (
                    <ManualExecutorSmartCardPanel
                        decision={decision}
                        btnPrimaryWFull={btnPrimaryWFull}
                        patchDecisionRow={patchDecisionRow}
                        logAppealTimeline={logAppealTimeline}
                        goToAppealsWithScroll={goToAppealsWithScroll}
                        onOpenArchiveTab={onOpenArchiveTab ?? (() => {})}
                    />
                ) : null}
                {!isManualLedgerCard && appealBusyOnCopy && decision.activeAppealCopyId ? (
                    <button
                        type="button"
                        onClick={() => goToAppealsWithScroll(decision.activeAppealCopyId!)}
                        className={btnPrimaryWFull}
                    >
                        متابعة الطعن في سجل الطعون
                    </button>
                ) : null}
                {!isManualLedgerCard && canManageAppealHere && !appealBusyOnCopy ? (
                    <div className="flex w-full min-w-0 flex-col gap-2">
                        {(executorAppealEntryOpen ||
                            (!appealWindowClosed &&
                                !hasActiveAppeal &&
                                canShowAppealInitialForDecision(decision))) &&
                            renderAppealEntryButtons(decision, windows, {
                                pathLockedOnOriginal: appealBusyOnCopy,
                                lockedBecauseActiveCopy: appealBusyOnCopy,
                            })}
                    </div>
                ) : null}


                <DecisionCardExecutorPanel
                    decision={decision}
                    dispatcherHub={dispatcherHub}
                    isCassated={isCassated}
                    hubNoteById={hubNoteById}
                    setHubNoteById={setHubNoteById}
                    handleExecutorResolveById={handleExecutorResolveById}
                    requestNeedsExecutorOutcome={requestNeedsExecutorOutcome}
                    btnPrimaryFlex={btnPrimaryFlex}
                    btnSecondaryFlex={btnSecondaryFlex}
                    selectedAction={selectedAction}
                    setSelectedAction={setSelectedAction}
                    showReasoning={showReasoning}
                    setShowReasoning={setShowReasoning}
                />

                {legacyAppealActionsVisible &&
                    pipelineRow.appealStatus === 'tadhallum_filed' &&
                    !windows.isPastGrievanceDeadline &&
                    (pipelineRow.appealWorkflowState === 'PENDING_APPEAL_LAWYER' ||
                        pipelineRow.appealWorkflowState === 'PENDING_APPEAL_DEBTOR') && (
                    <>
                        {canManageAppealHere ? (
                            renderAppealGrievanceDecideButtons(decision, 'previousCard', windows)
                        ) : (
                            <div className="mb-3 text-[10px] text-slate-400 text-right leading-relaxed">
                                القرار قيد التظلم — انتقل إلى «القرارات السابقة» أو «الطعون» لتسجيل قبول/رد التظلم.
                            </div>
                        )}
                    </>
                )}
                {renderAppealDeadlineLapseActions(decision)}
                {legacyAppealActionsVisible
                    ? renderAppealAwaitingCassationButtons(
                          pipelineRow,
                          'previousCard',
                          appealWindowClosed,
                          canManageAppealHere
                      )
                    : null}
                {legacyAppealActionsVisible &&
                    !isManualLedgerCard &&
                    pipelineRow.appealStatus === 'tamyeez_filed' &&
                    pipelineRow.appealMethod === 'tamyeez' &&
                    renderAppealTamyeezPhasePanel(pipelineRow, 'previousCard', cassTips, (v) => {
                        patchDecisionRow(pipelineRow.id, { tamyeezDecisionNumber: v });
                        logAppealTimeline(
                            'حفظ رقم التمييز',
                            `${pipelineRow.title}\nرقم التمييز: ${v}`
                        );
                    })}

                {!requestNeedsExecutorOutcome(decision) && decision.executorNote ? (
                    <blockquote className="mt-3 p-3 border-r-4 border-gray-500 bg-gray-800/30 text-sm text-gray-300 italic leading-relaxed">
                        التسبيب: {decision.executorNote}
                    </blockquote>
                ) : null}
                {!requestNeedsExecutorOutcome(decision) && hubNoteById[decision.id] ? (
                    <div className="mt-2">
                        <p className="text-[11px] text-gray-400 leading-relaxed border border-white/5 bg-slate-900/30 rounded-lg p-2">
                            {hubNoteById[decision.id]}
                        </p>
                    </div>
                ) : null}
            </div>


            <DecisionCardDeleteConfirm
                deleteConfirmId={deleteConfirmId}
                decisionId={decision.id}
                setDeleteConfirmId={setDeleteConfirmId}
                onDeleteDecision={onDeleteDecision}
            />
        </motion.div>
    );
}

export default React.memo(DecisionCard);
export type { DecisionCardProps } from './decisionCardTypes';
