import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
    AppealResultChip,
    ArchiveDecisionButton,
    DECISION_NOTICE_GLASS,
    DECISION_META_CHIP,
} from '../decisionCardPresentation';
import type {
    DecisionsDispatcherHubProps,
} from '../../DecisionsAndAppealsEngine';
import GlowingDot from './GlowingDot';
import DecisionHintTooltip from './DecisionHintTooltip';
import { AppealOriginBadge } from './AppealOriginBadge';
import type { Decision } from '../types';
import { inferExecutorApprovalDecisionType } from '@/app/utils/executorApprovalWorkflow';
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import { isPersonalStatusCourtDecisionsDossier } from '@/app/utils/followupSpecializationVisibility';
import { isSeizureDecisionFollowupComplete } from '../seizureFollowupComplete';
import {
    DECISION_GLASS_CARD,
    cleanTitle,
    formatDateNumeric,
    shouldShowDecisionHubBody,
    stripRedundantLeadingLinesFromHubBody,
    appealWindowsFromClockYmd,
    decisionAppealClockYmd,
    cassationButtonTitles,
    deriveDecisionHubStatus,
    appealPipelineRowForCard,
    buildAppealProceedingsForDecision,
    resolveCreditorRequestAppealGate,
    isCreditorRequestFlowContinues,
    isExecutorRequestAppealCycleSuperseded,
    resolveCreditorDecisionEnforcementState,
    resolveRequestFilerFromDebtorAgentView,
    resolveUnderlyingDecisionHub,
    isCreditorPartyRequest,
    resolveDebtorAgentRequestFateLine,
    shouldHideDebtorAgentFateLine,
    shouldShowAppealResultChipSeparate,
    resolveAppealResultActorForClient,
    resolveEffectiveAppealActor,
    resolveEffectiveAwaitingCassationParty,
    COMPACT_APPEAL_PROCEEDINGS_MAX,
    decisionCardSurfaceClasses,
    isExecutorDecisionAppealFinal,
} from '../utils';
import { AppealProceedingsSummary } from './AppealProceedingsSummary';
import type { AppealDeadlineWindows, DecisionsAppealsAppealSlot } from '../utils';
import type { AppealUiPerspective } from '../appealUiLabels';

type DecisionCardProps = {
    decision: Decision;
    decisions: Decision[];
    dispatcherHub?: DecisionsDispatcherHubProps;
    executionId: string | undefined;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    buildDecisionCardStatus: (
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[]
    ) => { statusPillEl: React.ReactNode };
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleExecutorResolveById: (id: string, resolution: 'approved' | 'rejected') => void;
    goToAppealsWithScroll: (id: string) => void;
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
    renderAppealAwaitingCassationButtons: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        appealWindowClosed: boolean,
        canManageAppealHere: boolean
    ) => React.ReactNode;
    renderAppealTamyeezPhasePanel: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        cassTips: ReturnType<typeof cassationButtonTitles>,
        onCommitTamyeezNumber: (v: string) => void
    ) => React.ReactNode;
    patchDecisionRow: (decisionId: string, patch: Partial<Decision>) => void;
    logAppealTimeline: (title: string, description?: string) => void;
    btnPrimaryWFull: string;
    btnPrimaryFlex: string;
    btnSecondaryFlex: string;
    onDeleteDecision: (id: string) => void;
    onArchiveDecision: (id: string) => void;
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    appealPerspective?: AppealUiPerspective;
};

function DecisionCard({
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
    appealPerspective = 'creditor_agent',
}: DecisionCardProps) {
    const titleClean = (() => {
        const t = cleanTitle(decision.title);
        const idx = t.search(/[\u2014\-—]/);
        const base = idx > 4 ? t.slice(0, idx).trim() : t;
        return base.replace(/^طلب\s+/, '');
    })();
    const debtorsCount = (() => {
        try {
            const execData = (dispatcherHub as any)?.executionData;
            if (!execData) return 0;
            return (execData.debtors ?? execData.debtorList ?? []).length;
        } catch { return 0; }
    })();
    const debtorName = (() => {
        try {
            const execData = (dispatcherHub as any)?.executionData;
            if (!execData) return null;
            const debtors = execData.debtors ?? execData.debtorList ?? [];
            if (Array.isArray(debtors) && debtors.length > 0) {
                const name = debtors[0]?.name;
                if (name && typeof name === 'string' && name.trim()) return name.trim();
            }
            return null;
        } catch { return null; }
    })();
    const hubBodyResolved =
        decision.requestKind === 'creditor_party_death'
            ? (() => {
                  const json =
                      String(decision.creditorPartyDeathPayloadJson || '').trim() ||
                      String(decision.body || '');
                  const p = parseCreditorPartyDeathPayload(json);
                  return p ? formatCreditorPartyDeathSummaryAr(p) : String(decision.body ?? '');
              })()
            : String(decision.body ?? '');
    const hubBodyTrimmed = stripRedundantLeadingLinesFromHubBody(titleClean, hubBodyResolved);
    const hubBodyTextFull = shouldShowDecisionHubBody(titleClean, hubBodyTrimmed) ? hubBodyTrimmed : '';
    const hubBodyText = (() => {
        const t = hubBodyTextFull;
        if (!t) return '';
        const withoutDate = t.replace(/^بتاريخ\s+\d{4}[\/-]\d{2}[\/-]\d{2}:\s*/, '');
        const idx = withoutDate.search(/[.—]/);
        const cleaned = idx > 10 ? withoutDate.slice(0, idx).trim() : withoutDate;
        return cleaned.replace(/^بتاريخ\s+\d{4}[\/-]\d{2}[\/-]\d{2}:\s*/, '');
    })();
    const hubStatus = deriveDecisionHubStatus(decision, requestNeedsExecutorOutcome);
    const showExecutorPendingFooter = hubStatus === 'pending';
    const workflowState = decision.appealWorkflowState ?? 'NONE';
    const windows = appealWindowsFromClockYmd(decisionAppealClockYmd(decision));
    const appealWindowClosed = !windows.canTamyeez;
    const appealBusyOnCopy = Boolean(decision.activeAppealCopyId);
    const canManageAppealHere = true;
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
        workflowState === 'PENDING_APPEAL_LAWYER' ||
        workflowState === 'PENDING_APPEAL_DEBTOR' ||
        workflowState === 'FINAL_ACCEPTED' ||
        workflowState === 'FINAL_REJECTED' ||
        workflowState === 'REVOKED_BY_APPEAL';
    const hasActiveAppeal = hasAppealActivity || Boolean(decision.activeAppealCopyId);
    const cassTips = cassationButtonTitles(decision, appealPerspective);

    const { statusPillEl } = buildDecisionCardStatus(decision, appealWindowClosed, decisions);
    const pipelineRow = appealPipelineRowForCard(decision, decisions);
    const appealProceedings = buildAppealProceedingsForDecision(pipelineRow, appealPerspective);
    const showRegisteredAppealPathLine = appealProceedings.length > 0;
    const compactAppealProceedings =
        showRegisteredAppealPathLine &&
        appealProceedings.length <= COMPACT_APPEAL_PROCEEDINGS_MAX;
    const expandableAppealProceedings =
        showRegisteredAppealPathLine &&
        appealProceedings.length > COMPACT_APPEAL_PROCEEDINGS_MAX;
    const requestAppealGate = resolveCreditorRequestAppealGate(
        decision,
        pipelineRow,
        appealPerspective
    );
    const requestFlowContinues = isCreditorRequestFlowContinues(
        decision,
        pipelineRow,
        appealPerspective
    );
    const appealCycleSealed = isExecutorRequestAppealCycleSuperseded(
        decision,
        decisions,
        appealPerspective
    );
    /** عند إيقاف/إعادة دورة الطلب تُعرض الإجراءات في لوحة البوابة أعلاه — لا تكرار المسار القديم */
    const legacyAppealActionsVisible = requestAppealGate.kind === 'continue';
    const awaitingCreditorCassationEntry =
        appealPerspective === 'debtor_agent' &&
        requestAppealGate.kind === 'paused' &&
        resolveEffectiveAwaitingCassationParty(pipelineRow, decision) === 'lawyer' &&
        pipelineRow.appealStatus !== 'tamyeez_filed' &&
        pipelineRow.appealPhase !== 'cassation';
    const dateStr = formatDateNumeric(decision.date);
    const heirsParty: 'creditor' | 'debtor' | null =
        decision.requestKind === 'creditor_party_death'
            ? 'creditor'
            : decision.requestKind === 'debtor_party_death'
              ? 'debtor'
              : null;
    const isHeirSubstitutionRequest = (() => {
        if (!heirsParty) return false;
        if (decision.requestKind === 'creditor_party_death') {
            const raw = String(decision.creditorPartyDeathPayloadJson || '').trim() || String(decision.body || '');
            const p = parseCreditorPartyDeathPayload(raw);
            return Boolean(p && p.action === 'heir_substitution');
        }
        return decision.requestKind === 'debtor_party_death';
    })();

    const heirsNeedEntry =
        Boolean(heirsParty) &&
        isHeirSubstitutionRequest &&
        (decision.executorOutcome === 'approved' || decision.executorOutcome === 'alternative') &&
        !requestNeedsExecutorOutcome(decision) &&
        !String(decision.heirSubstitutionCompletedAt || '').trim();

    const isLatestHeirsRequestForParty = (() => {
        if (!heirsParty || !isHeirSubstitutionRequest) return false;
        const sameKind = decisions.filter((d) => {
            if (d.requestKind !== decision.requestKind) return false;
            if (d.executorOutcome !== 'approved' && d.executorOutcome !== 'alternative') return false;
            if (requestNeedsExecutorOutcome(d)) return false;
            if (d.requestKind === 'creditor_party_death') {
                const raw = String(d.creditorPartyDeathPayloadJson || '').trim() || String(d.body || '');
                const p = parseCreditorPartyDeathPayload(raw);
                if (!p || p.action !== 'heir_substitution') return false;
            }
            return true;
        });
        if (sameKind.length === 0) return true;
        const best = sameKind.reduce((acc, cur) => {
            const a = String((acc as any).resolvedAt ?? acc.date ?? '');
            const b = String((cur as any).resolvedAt ?? cur.date ?? '');
            return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
        }, sameKind[0]);
        return best.id === decision.id;
    })();

    const canOpenHeirsEntry = heirsNeedEntry && isLatestHeirsRequestForParty;

    const [seizureCompletionBusy, setSeizureCompletionBusy] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | null>(null);
    const [showReasoning, setShowReasoning] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const decisionEffectivelyApproved = (d: Decision): boolean => {
        if (d.executorOutcome === 'withdrawn' || d.lawyerWithdrawn === true) return false;
        const pipeline = appealPipelineRowForCard(d, decisions);
        const windowsForD = appealWindowsFromClockYmd(decisionAppealClockYmd(d));
        const appealWindowClosedForD = !windowsForD.canTamyeez;
        const appealLegallyFinalForD = isExecutorDecisionAppealFinal(d, pipeline, {
            appealWindowClosed: appealWindowClosedForD,
            appealTrackActive: false,
        });
        const state = resolveCreditorDecisionEnforcementState(d, pipeline, {
            hubTab: decisionsHubTab,
            appealLegallyFinal: appealLegallyFinalForD,
            needsExecutor: requestNeedsExecutorOutcome(d),
            appealPerspective,
            allDecisions: decisions,
        });
        return state.enforced;
    };
    const creditorPartyRequest = isCreditorPartyRequest(decision, appealPerspective);
    const showCreditorFollowupActions =
        appealPerspective !== 'debtor_agent' || !creditorPartyRequest;
    const seizureSubtype = String(decision.seizureSubtype || '').trim();
    const seizureSubtypeIsFinalNoCompletion =
        seizureSubtype === 'movable_auction' ||
        seizureSubtype === 'property_final_award' ||
        seizureSubtype === 'property_expert_objection' ||
        seizureSubtype === 'movable_expert_objection' ||
        seizureSubtype === 'property_title_transfer' ||
        seizureSubtype === 'property_buyer_delivery' ||
        seizureSubtype === 'property_proceeds_disburse' ||
        seizureSubtype === 'movable_final_award' ||
        seizureSubtype === 'property_increase_10' ||
        seizureSubtype === 'movable_increase_10' ||
        seizureSubtype === 'movable_buyer_delivery' ||
        seizureSubtype === 'movable_proceeds_disburse';
    const executionFile = dispatcherHub?.executionData;
    const personalStatusCourtCoerciveBlocked = isPersonalStatusCourtDecisionsDossier(
        executionFile?.docType,
        executionFile?.classification,
        (executionFile as { category?: string } | undefined)?.category,
    );
    const seizureFollowupComplete = isSeizureDecisionFollowupComplete(decision, executionFile);
    const seizureCompletionReady =
        decision.requestKind === 'seizure' &&
        decisionEffectivelyApproved(decision) &&
        requestFlowContinues &&
        Boolean(seizureSubtype) &&
        !seizureSubtypeIsFinalNoCompletion &&
        !seizureFollowupComplete &&
        !requestNeedsExecutorOutcome(decision);
    const propertyStepFromSubtype = (st: string):
        | 'init'
        | 'experts'
        | 'auction'
        | 'award'
        | 'reauction_default'
        | null => {
        if (st === 'property') return 'init';
        if (st === 'property_expert') return 'experts';
        if (st === 'property_expert_committee') return 'experts';
        if (st === 'property_auction') return 'auction';
        if (st === 'property_final_award') return null;
        if (st === 'property_increase_10') return null;
        if (st === 'property_reauction_default') return 'reauction_default';
        return null;
    };
    const seizureCompletionLabel =
        propertyStepFromSubtype(seizureSubtype) === 'init'
            ? 'إكمال بيانات العقار'
            : propertyStepFromSubtype(seizureSubtype) === 'experts'
              ? 'تسجيل تقرير الخبراء'
              : propertyStepFromSubtype(seizureSubtype) === 'auction'
                ? 'تسجيل موعد المزايدة'
                : propertyStepFromSubtype(seizureSubtype) === 'award'
                  ? 'تسجيل الإحالة'
                    : propertyStepFromSubtype(seizureSubtype) === 'reauction_default'
                      ? 'تسجيل النكول/إعادة المزايدة'
                      : seizureSubtype === 'movable_auction'
                        ? 'إكمال بيانات المال المنقول'
                        : seizureSubtype === 'movable_expert'
                          ? 'تسجيل تقرير الخبراء'
                          : seizureSubtype === 'movable_expert_committee'
                            ? 'تسجيل تقرير الخبراء'
                            : seizureSubtype === 'movable_auction_date'
                              ? 'تسجيل موعد المزايدة'
                                : seizureSubtype === 'movable_reauction_default'
                                  ? 'تسجيل النكول/إعادة المزايدة'
                                  : 'إكمال بيانات الحجز';
    const runSeizureCompletion = useCallback(() => {
        if (seizureCompletionBusy) return;
        setSeizureCompletionBusy(true);
        try {
            const step = propertyStepFromSubtype(seizureSubtype);
            if (step === 'init') {
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-property-init', {
                        detail: { executionId, decisionId: decision.id },
                    })
                );
            } else if (seizureSubtype === 'movable_auction') {
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-movable-init', {
                        detail: { executionId, decisionId: decision.id },
                    })
                );
            } else if (step) {
                let seizedPropertyId = '';
                const rawJson = String((decision as any).seizurePayloadJson || '').trim();
                if (rawJson) {
                    try {
                        const v = JSON.parse(rawJson) as any;
                        seizedPropertyId = String(v?.seizedPropertyId ?? '').trim();
                    } catch {
                        /* ignore */
                    }
                }
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-property-step', {
                        detail: {
                            executionId,
                            decisionId: decision.id,
                            seizedPropertyId,
                            step,
                        },
                    })
                );
            } else if (
                seizureSubtype === 'movable_expert' ||
                seizureSubtype === 'movable_expert_committee' ||
                seizureSubtype === 'movable_auction_date' ||
                seizureSubtype === 'movable_reauction_default'
            ) {
                let seizedMovableId = '';
                const rawJson = String((decision as any).seizurePayloadJson || '').trim();
                if (rawJson) {
                    try {
                        const v = JSON.parse(rawJson) as any;
                        seizedMovableId = String(v?.seizedMovableId ?? '').trim();
                    } catch {
                        /* ignore */
                    }
                }
                const movableStep =
                    seizureSubtype === 'movable_expert' || seizureSubtype === 'movable_expert_committee'
                        ? 'experts'
                        : seizureSubtype === 'movable_auction_date'
                          ? 'auction'
                          : 'reauction_default';
                window.dispatchEvent(
                    new CustomEvent('hami-open-seized-movable-step', {
                        detail: {
                            executionId,
                            decisionId: decision.id,
                            seizedMovableId,
                            step: movableStep,
                        },
                    })
                );
            } else {
                window.dispatchEvent(
                    new CustomEvent('hami-open-seizure-completion', {
                        detail: { executionId, decisionId: decision.id },
                    })
                );
            }
        } catch {
            /* ignore */
        }
        setSeizureCompletionBusy(false);
    }, [decision, executionId, seizureCompletionBusy, seizureSubtype]);
    const evictionWorkflowBranch =
        decision.requestKind === 'eviction_procedure' &&
        decisionEffectivelyApproved(decision) &&
        requestFlowContinues &&
        !requestNeedsExecutorOutcome(decision)
            ? inferExecutorApprovalDecisionType(decision)
            : 'other';
    const evictionScheduleReady =
        evictionWorkflowBranch === 'Field Visit Date' && !String(decision.executorScheduleLabel || '').trim();
    const evictionGraceReady =
        evictionWorkflowBranch === 'Grace Period' && !String(decision.evictionGraceSavedAt || '').trim();
    const evictionPoliceReady =
        evictionWorkflowBranch === 'Police Assistance Request' &&
        !String(decision.policeAssistanceSavedAt || '').trim();
    const trustDisburseShortcutReady =
        decision.requestKind === 'trust_disburse' &&
        decisionEffectivelyApproved(decision) &&
        requestFlowContinues &&
        !requestNeedsExecutorOutcome(decision);
    const guarantorDetailsAlreadySaved =
        Boolean(String((decision as any).guarantorDetailsSavedAt || '').trim()) ||
        Boolean((dispatcherHub as any)?.executionData?.guarantor_followup?.details_saved);
    const guarantorShortcutReady =
        decision.requestKind === 'guarantor_request' &&
        decisionEffectivelyApproved(decision) &&
        requestFlowContinues &&
        !guarantorDetailsAlreadySaved &&
        !requestNeedsExecutorOutcome(decision);
    const settled = !requestNeedsExecutorOutcome(decision);

    const appealLegallyFinal = isExecutorDecisionAppealFinal(decision, pipelineRow, {
        appealWindowClosed,
        appealTrackActive: hasActiveAppeal && !appealWindowClosed,
    });
    const enforcementState = resolveCreditorDecisionEnforcementState(decision, pipelineRow, {
        hubTab: decisionsHubTab,
        appealLegallyFinal,
        needsExecutor: requestNeedsExecutorOutcome(decision),
        appealPerspective,
        allDecisions: decisions,
    });
    const isCassated =
        pipelineRow.appealResult === 'نقض القرار' &&
        pipelineRow.appealStatus === 'final' &&
        requestAppealGate.kind === 'lifecycle_reset';
    const cardClassName = decisionCardSurfaceClasses(enforcementState.visual, decisionsHubTab);
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
                        <h4 className="break-words text-sm font-bold text-slate-100">{titleClean}</h4>
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
                        {decisionsHubTab === 'previous' && settled && !decision.isArchived ? (
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
                </div>

                {(debtorsCount > 1 && debtorName) || showRegisteredAppealPathLine ? (
                    <div className="mt-1 border-t border-white/5 pt-2 space-y-1">
                        {debtorsCount > 1 && debtorName ? (
                            <p className="text-sm text-gray-300">
                                {debtorName}
                            </p>
                        ) : null}
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

                    </div>
                ) : null}
            </div>

            <div className="mt-2 flex min-w-0 flex-col gap-1.5 text-right">
                {requestAppealGate.kind !== 'continue' &&
                !decision.isArchived &&
                !appealCycleSealed ? (
                    <div className="space-y-2">
                        {!awaitingCreditorCassationEntry ? (
                            <div
                                className={`${DECISION_NOTICE_GLASS} ${
                                    requestAppealGate.kind === 'lifecycle_reset'
                                        ? 'border-violet-400/15 text-violet-100/90'
                                        : requestAppealGate.kind === 'paused'
                                          ? 'border-amber-400/15 text-amber-100/90'
                                          : 'border-rose-400/15 text-rose-100/90'
                                }`}
                            >
                                {requestAppealGate.message}
                            </div>
                        ) : null}
                        <div className="flex flex-col gap-2">
                            {requestAppealGate.kind === 'paused' ? (
                                <>
                                    {awaitingCreditorCassationEntry ||
                                    requestAppealGate.showWaiveCassation
                                        ? renderAppealAwaitingCassationButtons(
                                              pipelineRow,
                                              'previousCard',
                                              appealWindowClosed,
                                              canManageAppealHere
                                          )
                                        : pipelineRow.appealStatus === 'tadhallum_filed' ||
                                            pipelineRow.appealPhase === 'grievance'
                                          ? renderAppealGrievanceDecideButtons(
                                                pipelineRow,
                                                'previousCard'
                                            )
                                          : null}
                                </>
                            ) : null}
                        </div>
                    </div>
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
                    <div className="space-y-2">
                        {canOpenHeirsEntry && heirsParty ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-party-death-modal', {
                                                detail: { executionId, party: heirsParty, decisionId: decision.id },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح بيانات الورثة
                            </button>
                        ) : null}
                        {seizureCompletionReady ? (
                            <button
                                type="button"
                                disabled={seizureCompletionBusy}
                                onClick={runSeizureCompletion}
                                className={btnPrimaryWFull}
                            >
                                {seizureCompletionLabel}
                            </button>
                        ) : null}
                        {guarantorShortcutReady ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-guarantor-details', {
                                                detail: { executionId, decisionId: decision.id },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح بيانات الكفيل
                            </button>
                        ) : null}
                        {trustDisburseShortcutReady ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-financial-hub-ledger', {
                                                detail: { executionId, mode: 'disburse' },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح تنفيذ الصرف
                            </button>
                        ) : null}
                        {(evictionScheduleReady || evictionGraceReady || evictionPoliceReady) &&
                        !personalStatusCourtCoerciveBlocked ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-execution-coercive-tab', {
                                                detail: { executionId, decisionId: decision.id },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح الإجراءات الجبرية
                            </button>
                        ) : null}

                    </div>
                ) : null}

                {canManageAppealHere && (
                    <div className="flex w-full min-w-0 flex-col gap-2">
                        {!appealWindowClosed &&
                            !hasActiveAppeal &&
                            canShowAppealInitialForDecision(decision) &&
                            renderAppealEntryButtons(decision, windows, {
                                pathLockedOnOriginal: appealBusyOnCopy,
                                lockedBecauseActiveCopy: appealBusyOnCopy,
                            })}
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
                    </div>
                )}

                {requestNeedsExecutorOutcome(decision) && dispatcherHub && (
                    <div className="space-y-2">
                        {isCassated ? (
                            <p className="text-[10px] text-red-400/80 text-right leading-relaxed">
                                لا يمكن اتخاذ إجراء على قرار منقوض
                            </p>
                        ) : null}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={isCassated}
                                onClick={() => {
                                    if (isCassated) return;
                                    if (showReasoning && selectedAction === 'approved') {
                                        handleExecutorResolveById(decision.id, 'approved');
                                        setShowReasoning(false);
                                        setSelectedAction(null);
                                    } else if (showReasoning) {
                                        setSelectedAction('approved');
                                    } else {
                                        handleExecutorResolveById(decision.id, 'approved');
                                    }
                                }}
                                className={btnPrimaryFlex}
                                style={showReasoning && selectedAction === 'approved' ? { minWidth: 'auto' } : undefined}
                            >
                                {showReasoning && selectedAction === 'approved' ? 'إرسال مع التسبيب' : 'موافقة'}
                            </button>
                            <button
                                type="button"
                                disabled={isCassated}
                                onClick={() => {
                                    if (isCassated) return;
                                    if (showReasoning && selectedAction === 'rejected') {
                                        handleExecutorResolveById(decision.id, 'rejected');
                                        setShowReasoning(false);
                                        setSelectedAction(null);
                                    } else if (showReasoning) {
                                        setSelectedAction('rejected');
                                    } else {
                                        handleExecutorResolveById(decision.id, 'rejected');
                                    }
                                }}
                                className={btnSecondaryFlex}
                                style={showReasoning && selectedAction === 'rejected' ? { minWidth: 'auto' } : undefined}
                            >
                                {showReasoning && selectedAction === 'rejected' ? 'إرسال مع التسبيب' : 'رفض المنفذ'}
                            </button>
                            <label
                                onClick={() => {
                                    setShowReasoning(!showReasoning);
                                    if (!showReasoning) setSelectedAction(null);
                                }}
                                className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-400 select-none shrink-0"
                            >
                                <span
                                    className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border transition-all ${
                                        showReasoning
                                            ? 'bg-purple-500/30 border-purple-400'
                                            : 'border-white/20 bg-transparent'
                                    }`}
                                >
                                    {showReasoning && (
                                        <svg className="w-2.5 h-2.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </span>
                                تسبيب
                            </label>
                        </div>
                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                selectedAction ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                            }`}
                        >
                            {isCassated ? (
                                <p className="w-full rounded-lg border border-white/10 bg-slate-950/40 p-2 text-right text-[11px] text-gray-400 leading-relaxed">
                                    {hubNoteById[decision.id] ?? ''}
                                </p>
                            ) : (
                                <textarea
                                    value={hubNoteById[decision.id] ?? ''}
                                    onChange={(e) =>
                                        setHubNoteById((p) => ({ ...p, [decision.id]: e.target.value }))
                                    }
                                    className="w-full min-h-[60px] max-h-[20vh] resize-y rounded-lg border border-white/10 bg-slate-950/40 p-2 text-right text-[11px] text-gray-100 outline-none focus:border-purple-500/40 transition-all"
                                    placeholder="نص قرار المنفذ..."
                                />
                            )}
                        </div>
                    </div>
                )}
                {requestNeedsExecutorOutcome(decision) && !dispatcherHub && (
                    <div className="space-y-2">
                        {isCassated ? (
                            <p className="text-[10px] text-red-400/80 text-right leading-relaxed">
                                لا يمكن اتخاذ إجراء على قرار منقوض
                            </p>
                        ) : null}
                        <div className="flex flex-row-reverse flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={isCassated}
                                onClick={() => {
                                    if (isCassated) return;
                                    handleExecutorResolveById(decision.id, 'approved');
                                }}
                                className={btnPrimaryFlex}
                            >
                                قبول المنفذ
                            </button>
                            <button
                                type="button"
                                disabled={isCassated}
                                onClick={() => {
                                    if (isCassated) return;
                                    handleExecutorResolveById(decision.id, 'rejected');
                                }}
                                className={btnSecondaryFlex}
                            >
                                رفض المنفذ
                            </button>
                        </div>
                    </div>
                )}

                {legacyAppealActionsVisible &&
                    pipelineRow.appealStatus === 'tadhallum_filed' &&
                    (pipelineRow.appealWorkflowState === 'PENDING_APPEAL_LAWYER' ||
                        pipelineRow.appealWorkflowState === 'PENDING_APPEAL_DEBTOR') && (
                    <>
                        {canManageAppealHere ? (
                            renderAppealGrievanceDecideButtons(decision, 'previousCard')
                        ) : (
                            <div className="mb-3 text-[10px] text-slate-400 text-right leading-relaxed">
                                القرار قيد التظلم — انتقل إلى «القرارات السابقة» أو «الطعون» لتسجيل قبول/رد التظلم.
                            </div>
                        )}
                    </>
                )}
                {legacyAppealActionsVisible
                    ? renderAppealAwaitingCassationButtons(
                          pipelineRow,
                          'previousCard',
                          appealWindowClosed,
                          canManageAppealHere
                      )
                    : null}
                {legacyAppealActionsVisible &&
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

            {deleteConfirmId === decision.id ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
                    <div className="rounded-xl border border-red-500/30 bg-slate-900 p-5 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm text-gray-200 text-center leading-relaxed">
                            هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء
                        </p>
                        <div className="mt-4 flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => { onDeleteDecision(decision.id); setDeleteConfirmId(null); }}
                                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
                            >
                                حذف
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </motion.div>
    );
}

export default React.memo(DecisionCard);
