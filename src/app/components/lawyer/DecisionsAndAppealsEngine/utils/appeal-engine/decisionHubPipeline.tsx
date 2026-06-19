import { createElement, type ReactNode } from 'react';
import type { Decision } from '../../types';
import type { ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { isCreditorPartyRequest, isDecisionLikeRow } from '../appealRequestOrigin';
import { isManualExecutorLedgerDecision, isAppealDeadlinePerpetuallyEnforced } from './manualExecutorIdentity';
import type { DecisionHubStatusPillTone } from './appealTypes';
import { compareDecisionsNewestFirst } from './appealsHubCatalog';
import { isExecutorSideAwaitingAppealEntry } from './manualExecutorLedger';
import { isCassationAffirmResult } from './appealProceedings';
import { resolveCassationFilerActor } from './appealWorkflowActors';

export type { DecisionHubStatusPillTone } from './appealTypes';

export function deriveDecisionHubStatus(
    d: Decision,
    needsExecutor: (x: Decision) => boolean
): ExecutionDecisionHubStatus {
    if (d.appealRequestOrigin === 'executor_side') {
        if (d.appealStatus === 'final') return d.status === 'rejected' ? 'rejected' : 'accepted';
        return 'accepted';
    }
    if (d.executorOutcome === 'withdrawn' || d.lawyerWithdrawn === true) return 'rejected';
    if (d.executorOutcome === 'rejected') return 'rejected';
    if (d.executorOutcome === 'approved' || d.executorOutcome === 'alternative') return 'accepted';
    if (needsExecutor(d)) return 'pending';
    if (d.status === 'accepted' || d.status === 'rejected') return d.status;
    if (d.appealStatus === 'pending' && !d.executorOutcome) return 'pending';
    return 'accepted';
}

function appealCopyHasPipelineState(copy: Decision): boolean {
    return (
        Boolean(copy.appealResult) ||
        Boolean(copy.awaitingCassationEntryBy) ||
        copy.appealStatus === 'tadhallum_filed' ||
        copy.appealStatus === 'tamyeez_filed' ||
        copy.appealPhase === 'grievance' ||
        copy.appealPhase === 'cassation' ||
        Boolean(copy.grievanceAcceptedAwaitingDebtorTamyeez) ||
        Boolean(copy.grievanceRejectedAwaitingTamyeez)
    );
}

export function getActiveAppealCopyForOriginal(original: Decision, all: Decision[]): Decision | null {
    if (!isDecisionLikeRow(original)) return null;
    if (original.appealSourceDecisionId) return null;
    if (original.activeAppealCopyId) {
        const linked = all.find((d) => d.id === original.activeAppealCopyId);
        if (linked) return linked;
    }
    const copies = all.filter((d) => d.appealSourceDecisionId === original.id);
    if (copies.length === 0) return null;
    const withPipeline = copies.filter(appealCopyHasPipelineState);
    const pool = withPipeline.length > 0 ? withPipeline : copies;
    return [...pool].sort(compareDecisionsNewestFirst)[0] ?? null;
}

export function appealPipelineRowForCard(row: Decision, all: Decision[]): Decision {
    const copy = getActiveAppealCopyForOriginal(row, all);
    if (copy) return copy;
    const sameId = all.find((d) => d.id === row.id);
    return sameId ?? row;
}

/** انقضاء مهلة الطعن أو صدور نتيجة تمييز/تظلم — القرار لم يعد قابلاً للطعن */
export function isExecutorDecisionAppealFinal(
    hubRow: Decision,
    pipeline: Decision,
    opts: {
        appealWindowClosed: boolean;
        appealTrackActive: boolean;
        isPastTamyeezDeadline?: boolean;
    }
): boolean {
    if (opts.appealTrackActive) return false;
    if (isExecutorSideAwaitingAppealEntry(hubRow, pipeline)) return false;

    const ws = String(pipeline.appealWorkflowState ?? hubRow.appealWorkflowState ?? '').trim();
    if (hubRow.appealStatus === 'final' || pipeline.appealStatus === 'final') return true;
    if (ws === 'FINAL_ACCEPTED' || ws === 'FINAL_REJECTED' || ws === 'REVOKED_BY_APPEAL') {
        return true;
    }

    const st = pipeline.appealStatus ?? hubRow.appealStatus;
    if (st === 'upheld' || st === 'overturned' || st === 'modified') return true;

    const phase = pipeline.appealPhase ?? hubRow.appealPhase;
    const appealStillOpen =
        st === 'tadhallum_filed' ||
        st === 'tamyeez_filed' ||
        phase === 'grievance' ||
        phase === 'cassation' ||
        Boolean(pipeline.awaitingCassationEntryBy ?? hubRow.awaitingCassationEntryBy) ||
        Boolean(pipeline.grievanceAcceptedAwaitingDebtorTamyeez ?? hubRow.grievanceAcceptedAwaitingDebtorTamyeez) ||
        Boolean(pipeline.grievanceRejectedAwaitingTamyeez ?? hubRow.grievanceRejectedAwaitingTamyeez);

    if (appealStillOpen) return false;

    const appealResult = String(pipeline.appealResult ?? hubRow.appealResult ?? '').trim();
    if (appealResult === 'نقض القرار' || isCassationAffirmResult(appealResult)) {
        return true;
    }
    if (
        appealResult === 'قبول التظلم' &&
        (pipeline.appealStatus === 'final' || hubRow.appealStatus === 'final')
    ) {
        return true;
    }
    if (appealResult === 'رد التظلم' && (pipeline.appealStatus === 'final' || hubRow.appealStatus === 'final')) {
        return true;
    }

    if (opts.appealWindowClosed || opts.isPastTamyeezDeadline) {
        return st === 'pending' || !st || !phase;
    }

    return false;
}

const HUB_PILL_TONE_CLASS: Record<DecisionHubStatusPillTone, string> = {
    red: 'border-rose-400/20 bg-rose-500/[0.08] text-rose-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-rose-400/30',
    emerald:
        'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-400/30',
    amber:
        'border-amber-400/20 bg-amber-500/[0.08] text-amber-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-amber-400/30',
    slate: 'border-white/10 bg-white/[0.05] text-slate-200/90 hover:border-white/16',
    violet:
        'border-violet-400/20 bg-violet-500/[0.08] text-violet-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-violet-400/30',
    neutral:
        'border-white/12 bg-white/[0.06] text-slate-100/90 hover:border-white/20 hover:bg-white/[0.10]',
};

export function renderDecisionHubStatusPill(
    label: string,
    tone: DecisionHubStatusPillTone,
    onClick?: () => void
): ReactNode {
    const base = `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold backdrop-blur-md transition-colors ${HUB_PILL_TONE_CLASS[tone]}`;
    if (onClick) {
        return createElement(
            'button',
            {
                type: 'button',
                onClick,
                className: `${base} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20`,
            },
            label
        );
    }
    return createElement('span', { className: base }, label);
}

export function isLawyerCassationNaqdResume(pipe: Decision, hub: Decision): boolean {
    if (pipe.appealResult !== 'نقض القرار' || pipe.appealStatus !== 'final') return false;
    const filer = resolveCassationFilerActor(pipe);
    if (filer === 'debtor') return false;
    const upheld = pipe.executorOutcome === 'approved' || pipe.executorOutcome === 'alternative';
    if (filer === 'lawyer') return upheld;
    const hubApproved = hub.executorOutcome === 'approved' || hub.executorOutcome === 'alternative';
    return upheld && hubApproved;
}

export function isLawyerCassationRadReset(pipe: Decision, phys: Decision['executorOutcome']): boolean {
    if (!isCassationAffirmResult(pipe.appealResult) || pipe.appealStatus !== 'final') return false;
    const filer = resolveCassationFilerActor(pipe);
    if (filer === 'debtor') return false;
    if (filer === 'lawyer') return true;
    return (phys === 'approved' || phys === 'alternative') && pipe.executorOutcome === 'rejected';
}

function isDebtorCassationRadUpheld(pipe: Decision, hub: Decision): boolean {
    if (!isCassationAffirmResult(pipe.appealResult) || pipe.appealStatus !== 'final') return false;
    const filer = resolveCassationFilerActor(pipe);
    if (filer === 'lawyer') return false;
    if (pipe.executorOutcome === 'approved' || pipe.executorOutcome === 'alternative') return true;
    return hub.executorOutcome === 'approved' || hub.executorOutcome === 'alternative';
}

export function effectiveExecutorOutcomeForCreditorHubPill(
    hubRow: Decision,
    pipeline: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): Decision['executorOutcome'] | undefined {
    const phys = hubRow.executorOutcome;
    if (!isCreditorPartyRequest(hubRow, perspective)) return phys;
    if (phys !== 'approved' && phys !== 'alternative') return phys;

    const p = pipeline;

    if (p.appealWorkflowState === 'REVOKED_BY_APPEAL') {
        return 'rejected';
    }
    if (p.appealResult === 'نقض القرار' && p.appealStatus === 'final') {
        return isLawyerCassationNaqdResume(p, hubRow) ? phys : 'rejected';
    }
    if (p.executorOutcome === 'rejected' && p.appealStatus === 'final') {
        return 'rejected';
    }

    if (isCassationAffirmResult(p.appealResult) && p.appealStatus === 'final') {
        if (isLawyerCassationRadReset(p, phys)) return 'rejected';
        if (isDebtorCassationRadUpheld(p, hubRow)) return phys;
        return p.executorOutcome ?? phys;
    }

    if (p.appealResult === 'قبول التظلم' && p.appealStatus === 'final') {
        return 'rejected';
    }

    if (p.appealResult === 'رد التظلم') {
        if (p.appealStatus === 'final') {
            return phys;
        }
        if (
            p.appealActor === 'debtor' &&
            (hubRow.appealBaseBranch === 'after_approval' ||
                (hubRow.appealBaseBranch == null && phys === 'approved'))
        ) {
            return phys;
        }
        if (p.grievanceRejectedAwaitingTamyeez && p.awaitingCassationEntryBy) {
            return phys;
        }
        return 'rejected';
    }

    return phys;
}

