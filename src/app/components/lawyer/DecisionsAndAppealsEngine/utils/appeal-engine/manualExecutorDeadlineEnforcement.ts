import type { Decision } from '../../types';
import { appealWindowsForDecision, isOpenGrievancePipeline, decisionHasAppealClock } from './appealDates';
import { buildGrievanceResolutionPatch } from './appealGrievanceResolution';
import {
    buildManualExecutorGrievanceOutcomePatch,
    manualExecutorTimelineLog,
} from './manualExecutorGrievanceOutcome';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
} from './manualExecutorIdentity';

function appealDeadlineTimelineLog(
    message: string,
    tone: 'emerald' | 'rose' | 'amber' | 'slate' = 'slate'
): NonNullable<Decision['appealTimelineLogs']>[number] {
    return manualExecutorTimelineLog(message, tone);
}

function shouldApplyPerpetualEnforcementAfterCassationLapse(row: Decision): boolean {
    if (row.appealDeadlinePerpetuallyEnforced || row.isArchived) return false;
    if (row.appealSourceDecisionId) return false;
    if (!decisionHasAppealClock(row)) return false;
    if (isManualExecutorLedgerDecision(row) && resolveExecutorDecisionStatusFlag(row) === 3) {
        return false;
    }
    if (row.appealStatus === 'final' && row.appealDeadlinePerpetuallyEnforced) return false;
    return true;
}

/** بعد انقضاء مهلة التمييز (7 أيام) — أرشفة + نفاذ نهائي */
export function buildAppealPerpetualEnforcementPatch(row: Decision): Partial<Decision> {
    const message =
        'انقضت مهلة التمييز (7 أيام) — القرار نافذٌ نهائياً وأُرشف تلقائياً';
    const log = appealDeadlineTimelineLog(message, 'slate');
    const now = new Date().toISOString();
    const archivePatch = {
        appealDeadlinePerpetuallyEnforced: true,
        isArchived: true,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: now,
        appealPhase: null,
        awaitingCassationEntryBy: null,
        grievanceRejectedAwaitingTamyeez: false,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        appealTimelineLogs: [log, ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : [])],
    };

    if (isManualExecutorLedgerDecision(row)) {
        const workflowState =
            row.executorOutcome === 'rejected' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED';
        return {
            ...archivePatch,
            executorDecisionStatusFlag: 1,
            manualExecutorWorkflowPhase: undefined,
            manualExecutorGrievanceOutcome: undefined,
            appealStatus: 'final',
            appealWorkflowState: workflowState,
        };
    }

    const workflowState =
        row.executorOutcome === 'rejected' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED';
    return {
        ...archivePatch,
        appealStatus: 'final',
        appealWorkflowState: workflowState,
    };
}

/** بعد انقضاء مهلة التظلم (3 أيام) — إغلاق مسار التظلم للطرفين */
export function buildGrievanceDeadlineLapsePatch(
    row: Decision,
    all: Decision[]
): Partial<Decision> {
    const message = 'انقضت مهلة التظلم (3 أيام) — سقط حق التظلم';
    const log = appealDeadlineTimelineLog(message, 'amber');
    if (isManualExecutorLedgerDecision(row)) {
        return {
            ...buildManualExecutorGrievanceOutcomePatch(row, false),
            appealTimelineLogs: [
                log,
                ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
            ],
        };
    }
    return {
        ...buildGrievanceResolutionPatch(row, false, all),
        appealTimelineLogs: [
            log,
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

/**
 * عند انقضاء مهلة التظلم فقط — إغلاق مسار التظلم المعلّق.
 * مهلة التمييز: يُنتظر اختيار «إنهاء المدة» من الواجهة.
 */
export function reconcileAppealDeadlineEnforcement(all: Decision[]): {
    rows: Decision[];
    mutated: boolean;
} {
    let mutated = false;
    const rows = all.map((row) => {
        if (row.appealSourceDecisionId || row.appealDeadlinePerpetuallyEnforced) return row;
        const windows = appealWindowsForDecision(row);

        if (windows.isPastGrievanceDeadline && isOpenGrievancePipeline(row)) {
            mutated = true;
            return { ...row, ...buildGrievanceDeadlineLapsePatch(row, all) };
        }

        return row;
    });

    return { rows, mutated };
}

/** Kept for parity with prior module surface (used by cassation-lapse callers). */
export { shouldApplyPerpetualEnforcementAfterCassationLapse };
