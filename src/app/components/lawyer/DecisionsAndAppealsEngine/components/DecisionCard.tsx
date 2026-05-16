import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';
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
import {
    DECISION_GLASS_CARD,
    cleanTitle,
    formatDateNumeric,
    shouldShowDecisionHubBody,
    stripRedundantLeadingLinesFromHubBody,
    appealWindowsFromClockYmd,
    decisionAppealClockYmd,
    cassationButtonTitles,
    inferAppealMethodsUsed,
    deriveDecisionHubStatus,
    appealPipelineRowForCard,
    formatRegisteredAppealPathForDecision,
    effectiveExecutorOutcomeForCreditorHubPill,
} from '../utils';
import type { AppealDeadlineWindows, DecisionsAppealsAppealSlot } from '../utils';

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
    appealActorDraftById: Record<string, 'lawyer' | 'debtor' | null>;
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleExecutorResolveById: (id: string, resolution: 'approved' | 'rejected') => void;
    goToAppealsWithScroll: (id: string) => void;
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
};

function DecisionCard({
    decision,
    decisions,
    decisionsHubTab,
    dispatcherHub,
    executionId,
    requestNeedsExecutorOutcome,
    buildDecisionCardStatus,
    appealActorDraftById,
    hubNoteById,
    setHubNoteById,
    handleExecutorResolveById,
    goToAppealsWithScroll,
    canShowAppealInitialForDecision,
    renderAppealInitialButtons,
    renderAppealTadhallumTamyeezDraft,
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
    const actorDraft = appealActorDraftById[decision.id] ?? null;
    const windows = appealWindowsFromClockYmd(decisionAppealClockYmd(decision));
    const appealWindowClosed = !windows.canTamyeez;
    const appealBusyOnCopy = Boolean(decision.activeAppealCopyId);
    const canManageAppealHere = true;
    const isCassated = decision.appealResult === 'نقض القرار';
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
    const cassTips = cassationButtonTitles(decision);

    const { statusPillEl } = buildDecisionCardStatus(decision, appealWindowClosed, decisions);
    const pipelineRow = appealPipelineRowForCard(decision, decisions);
    const appealMethodsUsed = inferAppealMethodsUsed(pipelineRow);
    const appealClosedForSummary =
        decision.appealStatus === 'final' ||
        workflowState === 'FINAL_ACCEPTED' ||
        workflowState === 'FINAL_REJECTED' ||
        workflowState === 'REVOKED_BY_APPEAL' ||
        Boolean(decision.appealResult);
    const registeredAppealPath = formatRegisteredAppealPathForDecision(pipelineRow);
    const showRegisteredAppealPathLine =
        Boolean(registeredAppealPath) &&
        ((appealClosedForSummary && (appealMethodsUsed.tadhallum || appealMethodsUsed.tamyeez)) ||
            (Array.isArray(pipelineRow.appealTimelineLogs) && pipelineRow.appealTimelineLogs.length > 0));
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

    const [seizureCompletionConfirming, setSeizureCompletionConfirming] = useState(false);
    const [seizureCompletionBusy, setSeizureCompletionBusy] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | null>(null);
    const [showReasoning, setShowReasoning] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const decisionEffectivelyApproved = (d: Decision): boolean => {
        const pipeline = appealPipelineRowForCard(d, decisions);
        const eff = effectiveExecutorOutcomeForCreditorHubPill(d, pipeline);
        if (eff === 'approved' || eff === 'alternative') return true;
        if (eff === 'rejected') return false;
        if (d.executorOutcome === 'approved' || d.executorOutcome === 'alternative') return true;
        if (d.executorOutcome !== 'rejected') return false;
        if (d.appealStatus === 'overturned') return true;
        if (d.appealResult === 'نقض القرار') return true;
        if ((d as any).appealWorkflowState === 'REVOKED_BY_APPEAL') return true;
        return false;
    };
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
        seizureSubtype === 'movable_buyer_delivery' ||
        seizureSubtype === 'movable_proceeds_disburse';
    const seizureCompletionReady =
        decision.requestKind === 'seizure' &&
        decisionEffectivelyApproved(decision) &&
        Boolean(seizureSubtype) &&
        !seizureSubtypeIsFinalNoCompletion &&
        !Boolean(String(decision.seizureRequestSavedAt || '').trim()) &&
        !requestNeedsExecutorOutcome(decision);
    const propertyStepFromSubtype = (st: string):
        | 'init'
        | 'experts'
        | 'auction'
        | 'award'
        | 'increase10'
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
        seizureSubtype === 'property_increase_10' || seizureSubtype === 'movable_increase_10'
            ? 'تسجيل نتيجة الضم 10%'
            : 
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
    const evictionWorkflowBranch =
        decision.requestKind === 'eviction_procedure' &&
        decisionEffectivelyApproved(decision) &&
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
        !requestNeedsExecutorOutcome(decision);
    const guarantorDetailsAlreadySaved =
        Boolean(String((decision as any).guarantorDetailsSavedAt || '').trim()) ||
        Boolean((dispatcherHub as any)?.executionData?.guarantor_followup?.details_saved);
    const guarantorShortcutReady =
        decision.requestKind === 'guarantor_request' &&
        decisionEffectivelyApproved(decision) &&
        !guarantorDetailsAlreadySaved &&
        !requestNeedsExecutorOutcome(decision);
    const settled = !requestNeedsExecutorOutcome(decision);

    const resolvedBorderClass =
        decisionsHubTab === 'previous'
            ? decision.executorOutcome === 'approved' || decision.executorOutcome === 'alternative'
                ? 'border-l-[4px] border-l-emerald-500'
                : decision.executorOutcome === 'rejected'
                  ? 'border-l-[4px] border-l-rose-500'
                  : ''
            : '';

    return (
        <motion.div
            id={`hami-decision-card-${decision.id}`}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className={`${DECISION_GLASS_CARD} ${resolvedBorderClass}`}
            dir="rtl"
        >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-right">
                        <GlowingDot
                            status={decision.appealStatus}
                            outcome={decision.executorOutcome}
                            origin={decision.appealRequestOrigin}
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
                            <button
                                type="button"
                                onClick={() => onArchiveDecision(decision.id)}
                                className="text-slate-500 hover:text-slate-300 transition-colors text-[10px] font-medium"
                                title="أرشفة القرار"
                            >
                                📦 أرشفة
                            </button>
                        ) : null}
                        {statusPillEl}
                    </div>
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

                {(debtorsCount > 1 && debtorName) || showRegisteredAppealPathLine ? (
                    <div className="mt-1 border-t border-white/5 pt-2 space-y-1">
                        {debtorsCount > 1 && debtorName ? (
                            <p className="text-sm text-gray-300">
                                {debtorName}
                            </p>
                        ) : null}
                        {showRegisteredAppealPathLine ? (
                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                <span>الطاعن: {(() => {
                                    const origin = decision.appealRequestOrigin;
                                    if (origin === 'debtor_side') return 'المدين';
                                    if (origin === 'creditor_side') return 'الدائن';
                                    return 'المنفذ';
                                })()}</span>
                                <span className="text-gray-600">|</span>
                                <span className={`font-bold ${
                                    decision.appealResult === 'نقض القرار' ? 'text-amber-400' :
                                    decision.appealResult === 'تصديق القرار' ? 'text-emerald-400' :
                                    decision.appealResult === 'رد اللائحة' ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                    النتيجة: {decision.appealResult || 'قيد النظر'}
                                    {decision.appealResult && decision.appealDecisionDate ? (
                                        <span className="text-[10px] text-slate-500 font-normal mr-1">
                                            (بتاريخ: {formatDateNumeric(decision.appealDecisionDate)})
                                        </span>
                                    ) : null}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="text-gray-500 hover:text-white transition-colors underline decoration-dotted underline-offset-2"
                                >
                                    تفاصيل الطعن
                                </button>
                            </div>
                        ) : null}
                        {showDetails && registeredAppealPath ? (
                            <div className="transition-all duration-300 ease-in-out overflow-hidden">
                                <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.03] p-3 space-y-1">
                                    <p className="text-sm font-semibold text-gray-200">
                                        {(() => {
                                            const parts = registeredAppealPath.split(' ← ').map(s => s.trim()).filter(Boolean);
                                            return parts.length > 0 ? parts[parts.length - 1] : registeredAppealPath;
                                        })()}
                                    </p>
                                    {(() => {
                                        const parts = registeredAppealPath.split(' ← ').map(s => s.trim()).filter(Boolean);
                                        return parts.length > 1 ? (
                                            <details className="group">
                                                <summary className="cursor-pointer list-none text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                                                    عرض مسار الطعن الكامل
                                                </summary>
                                                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                                                    {registeredAppealPath}
                                                </p>
                                            </details>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        ) : null}

                    </div>
                ) : null}
            </div>

            <div className="mt-2 flex min-w-0 flex-col gap-1.5 text-right">
                {settled &&
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
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setSeizureCompletionConfirming(true)}
                                    className={btnPrimaryWFull}
                                >
                                    {seizureCompletionLabel}
                                </button>
                                {seizureCompletionConfirming ? (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-slate-950/45 px-2 backdrop-blur-xl">
                                        <button
                                            type="button"
                                            disabled={seizureCompletionBusy}
                                            onClick={() => {
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
                                                    } else if (
                                                        seizureSubtype === 'property_increase_10' ||
                                                        seizureSubtype === 'movable_increase_10'
                                                    ) {
                                                        const rawJson = String((decision as any).seizurePayloadJson || '').trim();
                                                        let seizedPropertyId = '';
                                                        let seizedMovableId = '';
                                                        if (rawJson) {
                                                            try {
                                                                const v = JSON.parse(rawJson) as any;
                                                                seizedPropertyId = String(v?.seizedPropertyId ?? '').trim();
                                                                seizedMovableId = String(v?.seizedMovableId ?? '').trim();
                                                            } catch {}
                                                        }
                                                        window.dispatchEvent(
                                                            new CustomEvent('hami-open-increase10-result', {
                                                                detail: {
                                                                    executionId,
                                                                    decisionId: decision.id,
                                                                    entityKind:
                                                                        seizureSubtype === 'movable_increase_10' ? 'movable' : 'property',
                                                                    entityId:
                                                                        seizureSubtype === 'movable_increase_10'
                                                                            ? seizedMovableId
                                                                            : seizedPropertyId,
                                                                },
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
                                                            } catch {}
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
                                                            } catch {}
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
                                                } catch {}
                                                setSeizureCompletionBusy(false);
                                                setSeizureCompletionConfirming(false);
                                            }}
                                            className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                                        >
                                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                <Send size={14} className="text-amber-200" />
                                                تأكيد
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={seizureCompletionBusy}
                                            onClick={() => setSeizureCompletionConfirming(false)}
                                            className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                ) : null}
                            </div>
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
                        {evictionScheduleReady || evictionGraceReady || evictionPoliceReady ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-200 text-right">
                                أكمل هذا الطلب من تبويب «الإجراءات الجبرية» داخل قسم التنفيذ.
                            </div>
                        ) : null}

                    </div>
                ) : null}

                {canManageAppealHere && (
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-2">
                            {!appealWindowClosed &&
                                !hasActiveAppeal &&
                                !actorDraft &&
                                canShowAppealInitialForDecision(decision) && (
                                    renderAppealInitialButtons(decision, { lockedBecauseActiveCopy: appealBusyOnCopy })
                                )}
                            {actorDraft &&
                                !appealWindowClosed &&
                                canShowAppealInitialForDecision(decision) &&
                                renderAppealTadhallumTamyeezDraft(decision, actorDraft, windows, {
                                    pathLockedOnOriginal: appealBusyOnCopy,
                                })}
                        </div>
                        {decision.appealResult ? (
                            <div className={`pointer-events-none select-none shrink-0 font-bold px-3 py-1 rounded-md border-2 uppercase tracking-wider inline-block text-center text-[11px] ${
                                decision.appealResult === 'نقض القرار'
                                    ? 'bg-red-900/30 text-red-400 border-red-500/50'
                                    : decision.appealResult === 'تصديق القرار'
                                    ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50'
                                    : decision.appealResult === 'رد اللائحة'
                                    ? 'bg-rose-900/30 text-rose-400 border-rose-500/50'
                                    : 'bg-gray-800/50 text-gray-400 border-gray-600/50'
                            }`}>
                                {decision.appealResult === 'نقض القرار' ? '⚖️ ' : decision.appealResult === 'تصديق القرار' ? '✅ ' : decision.appealResult === 'رد اللائحة' ? '❌ ' : ''}{decision.appealResult}
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

                {decision.appealStatus === 'tadhallum_filed' &&
                    (workflowState === 'PENDING_APPEAL_LAWYER' ||
                        workflowState === 'PENDING_APPEAL_DEBTOR') && (
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
                {renderAppealAwaitingCassationButtons(decision, 'previousCard', appealWindowClosed, canManageAppealHere)}
                {decision.appealStatus === 'tamyeez_filed' &&
                    decision.appealMethod === 'tamyeez' &&
                    renderAppealTamyeezPhasePanel(decision, 'previousCard', cassTips, (v) => {
                        patchDecisionRow(decision.id, { tamyeezDecisionNumber: v });
                        logAppealTimeline('حفظ رقم التمييز', `${decision.title}\nرقم التمييز: ${v}`);
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
