import React from 'react';
import { AppealOriginBadge } from './AppealOriginBadge';
import GlowingDot from './GlowingDot';
import type { Decision } from '../types';
import {
    DECISION_GLASS_CARD,
    cleanTitle,
    formatDateNumeric,
    appealWindowsFromClockYmd,
    decisionAppealClockYmd,
    cassationButtonTitles,
    inferAppealMethodsUsed,
    deriveDecisionHubStatus,
    appealPipelineRowForCard,
    formatRegisteredAppealPathForDecision,
} from '../utils';
import type { AppealDeadlineWindows, DecisionsAppealsAppealSlot } from '../utils';

type AppealWorkflowCardProps = {
    decision: Decision;
    decisions: Decision[];
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    appealActorDraftById: Record<string, 'lawyer' | 'debtor' | null>;
    buildDecisionCardStatus: (
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[]
    ) => { statusPillEl: React.ReactNode };
    canShowAppealInitialForDecision: (d: Decision) => boolean;
    renderAppealInitialButtons: (
        decision: Decision,
        opts?: { lockedBecauseActiveCopy?: boolean }
    ) => React.ReactNode;
    renderAppealTadhallumTamyeezDraft: (
        decision: Decision,
        actorDraft: 'lawyer' | 'debtor',
        windows: AppealDeadlineWindows,
        opts?: { pathLockedOnOriginal?: boolean }
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
    requestNeedsExecutorOutcome,
    appealActorDraftById,
    buildDecisionCardStatus,
    canShowAppealInitialForDecision,
    renderAppealInitialButtons,
    renderAppealTadhallumTamyeezDraft,
    renderAppealGrievanceDecideButtons,
    renderAppealTamyeezPhasePanel,
    renderAppealAwaitingCassationButtons,
    transitionAppealWorkflow,
}: AppealWorkflowCardProps) {
    const state = decision.appealWorkflowState ?? 'NONE';
    const actorDraft = appealActorDraftById[decision.id] ?? null;
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
        !actorDraft &&
        canShowAppealInitialForDecision(decision);
    const cassTips = cassationButtonTitles(decision);
    const showDebtorGrievanceNotice =
        decision.appealActor === 'debtor' &&
        decision.appealMethod === 'tadhallum' &&
        decision.appealStatus === 'tadhallum_filed' &&
        (state === 'PENDING_APPEAL_LAWYER' || state === 'PENDING_APPEAL_DEBTOR');
    const titleClean = cleanTitle(decision.title);
    const hubStatus = deriveDecisionHubStatus(decision, requestNeedsExecutorOutcome);
    const showExecutorPendingFooter = hubStatus === 'pending';
    const { statusPillEl } = buildDecisionCardStatus(decision, appealWindowClosed, decisions);
    const pipelineRow = appealPipelineRowForCard(decision, decisions);
    const appealMethodsUsedAppeal = inferAppealMethodsUsed(pipelineRow);
    const registeredAppealPath = formatRegisteredAppealPathForDecision(pipelineRow);
    const showRegisteredAppealPathLine =
        Boolean(registeredAppealPath) &&
        ((isFinalLocked && (appealMethodsUsedAppeal.tadhallum || appealMethodsUsedAppeal.tamyeez)) ||
            (Array.isArray(pipelineRow.appealTimelineLogs) && pipelineRow.appealTimelineLogs.length > 0));
    const dateStr = formatDateNumeric(decision.date);

    return (
        <div id={`hami-appeal-card-${decision.id}`} className={`${DECISION_GLASS_CARD}`} dir="rtl">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-right">
                        <GlowingDot
                            status={decision.appealStatus}
                            outcome={decision.executorOutcome}
                            origin={decision.appealRequestOrigin}
                        />
                        <h3 className="break-words text-sm font-bold text-slate-100">{titleClean}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">{statusPillEl}</div>
                </div>

                <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                        <span>{dateStr}</span>
                        <AppealOriginBadge decision={decision} />
                    </div>
                    {decision.tamyeezDecisionNumber?.trim() ? (
                        <span className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium text-slate-300">
                            تمييز: {decision.tamyeezDecisionNumber}
                        </span>
                    ) : null}
                </div>

                {showRegisteredAppealPathLine ||
                showDebtorGrievanceNotice ||
                (appealWindowClosed && !isFinalLocked) ||
                showExecutorPendingFooter ? (
                    <div className="mt-1 border-t border-white/5 pt-2 space-y-1">
                        {showRegisteredAppealPathLine ? (
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-200">
                                    {(() => {
                                        const parts = (registeredAppealPath || '').split(' ← ').map(s => s.trim()).filter(Boolean);
                                        return parts.length > 0 ? parts[parts.length - 1] : registeredAppealPath;
                                    })()}
                                </p>
                                {(() => {
                                    const parts = (registeredAppealPath || '').split(' ← ').map(s => s.trim()).filter(Boolean);
                                    return parts.length > 1 ? (
                                        <details className="group">
                                            <summary className="cursor-pointer list-none text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                                                عرض مسار الطعن الكامل
                                            </summary>
                                            <p className="mt-1 leading-relaxed text-gray-400 text-[11px] whitespace-pre-line">
                                                {registeredAppealPath}
                                            </p>
                                        </details>
                                    ) : null;
                                })()}
                            </div>
                        ) : null}
                        {showDebtorGrievanceNotice ? (
                            <p className="text-center italic text-blue-400 text-sm py-2">
                                قام المدين بالطعن بالقرار
                            </p>
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
                {actorDraft && !appealWindowClosed && renderAppealTadhallumTamyeezDraft(decision, actorDraft, windows)}
                {canShowInitialAppealActions ? renderAppealInitialButtons(decision) : null}
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
                {renderAppealAwaitingCassationButtons(decision, 'appealsTab', appealWindowClosed, true)}
            </div>
        </div>
    );
}

export default React.memo(AppealWorkflowCard);
