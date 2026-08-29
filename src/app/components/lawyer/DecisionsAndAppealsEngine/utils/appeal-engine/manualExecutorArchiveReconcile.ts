import type { Decision } from '../../types';
import {
    EXECUTOR_QUEUE_REQUEST_KINDS,
    hubWithInferredAppealOrigin,
} from '../appealRequestOrigin';
import { appealWindowsForDecision } from './appealDates';
import { appealPipelineRowForCard } from './appealPipelineRow';
import { isExecutorDecisionAppealFinal } from './executorAppealFinality';
import { isExecutorSideAwaitingAppealEntry } from './executorAppealEntryState';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
} from './manualExecutorIdentity';
import { canArchiveExecutorDecisionCard } from './manualExecutorDisplayLabels';

export function manualExecutorArchiveClosurePatch(): Partial<Decision> {
    const now = new Date().toISOString();
    return {
        isArchived: true,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: now,
    };
}

/** قرار «إضافة قرار» منتهٍ (علم 3) — يُؤرشف تلقائياً في سجل الأرشيف */
export function isManualExecutorDecisionTerminated(d: Decision): boolean {
    return (
        isManualExecutorLedgerDecision(d) && resolveExecutorDecisionStatusFlag(d) === 3
    );
}

export function shouldAutoArchiveTerminatedDecision(hub: Decision): boolean {
    if (hub.isArchived || hub.appealSourceDecisionId) return false;
    return isManualExecutorDecisionTerminated(hub);
}

/** يُؤرشف قرارات «إضافة قرار» المنتهية (علم 3) القديمة تلقائياً */
export function reconcileTerminatedDecisionArchives(all: Decision[]): {
    rows: Decision[];
    mutated: boolean;
} {
    let mutated = false;
    const rows = all.map((row) => {
        if (!shouldAutoArchiveTerminatedDecision(row)) return row;
        mutated = true;
        return { ...row, ...manualExecutorArchiveClosurePatch() };
    });
    return { rows, mutated };
}

function isHubSettledForArchive(hub: Decision): boolean {
    if (hub.lawyerWithdrawn === true || hub.executorOutcome === 'withdrawn') return true;
    if (hub.requestKind && EXECUTOR_QUEUE_REQUEST_KINDS.includes(hub.requestKind)) {
        const ex = hub.executorOutcome;
        return ex === 'approved' || ex === 'rejected' || ex === 'alternative';
    }
    const ex = hub.executorOutcome;
    return ex !== undefined && ex !== 'pending';
}

/** قرار محسوم وطعنه نهائي — يُؤرشف تلقائياً في سجل الأرشيف */
export function shouldAutoArchiveAppealFinalDecision(hub: Decision, all: Decision[]): boolean {
    if (hub.isArchived || hub.appealSourceDecisionId) return false;
    if (shouldAutoArchiveTerminatedDecision(hub)) return false;

    const hubRow = hubWithInferredAppealOrigin(hub);
    if (!isHubSettledForArchive(hubRow)) return false;

    const pipe = appealPipelineRowForCard(hubRow, all);
    if (isExecutorSideAwaitingAppealEntry(hubRow, pipe)) return false;

    const windows = appealWindowsForDecision(hubRow);
    const appealLegallyFinal = isExecutorDecisionAppealFinal(hubRow, pipe, {
        appealWindowClosed: !windows.canTamyeez,
        appealTrackActive: false,
    });

    return canArchiveExecutorDecisionCard(hubRow, pipe, {
        hubTab: 'previous',
        settled: true,
        appealLegallyFinal,
    });
}

/** يُؤرشف القرارات الأصلية بعد اكتمال الطعن، ونسخ الطعن المرتبطة بها */
export function reconcileAppealFinalDecisionArchives(all: Decision[]): {
    rows: Decision[];
    mutated: boolean;
} {
    let mutated = false;
    let rows = all.map((row) => {
        if (!shouldAutoArchiveAppealFinalDecision(row, all)) return row;
        mutated = true;
        return { ...row, ...manualExecutorArchiveClosurePatch() };
    });
    rows = rows.map((row) => {
        if (row.isArchived || !row.appealSourceDecisionId) return row;
        const src = rows.find((d) => d.id === row.appealSourceDecisionId);
        if (!src?.isArchived) return row;
        mutated = true;
        return { ...row, ...manualExecutorArchiveClosurePatch() };
    });
    return { rows, mutated };
}
