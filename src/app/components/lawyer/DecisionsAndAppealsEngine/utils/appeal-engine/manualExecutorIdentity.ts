import type { Decision } from '../../types';
import type { ExecutorDecisionStatusFlag, ManualExecutorWorkflowPhase } from './appealTypes';

export function isManualExecutorLedgerDecision(d: Decision): boolean {
    return d.manualExecutorLedgerEntry === true;
}

export function resolveExecutorDecisionStatusFlag(d: Decision): ExecutorDecisionStatusFlag {
    const raw = d.executorDecisionStatusFlag;
    if (raw === 1 || raw === 2 || raw === 3) return raw;
    return 1;
}

export function resolveManualExecutorWorkflowPhase(
    d: Decision
): ManualExecutorWorkflowPhase {
    const explicit = d.manualExecutorWorkflowPhase;
    if (
        explicit === 'grievance_pending' ||
        explicit === 'cassation_unlocked' ||
        explicit === 'cassation_pending'
    ) {
        return explicit;
    }
    if (d.manualExecutorAppealKind === 'tadhallum' && !d.manualExecutorGrievanceOutcome) {
        return 'grievance_pending';
    }
    if (d.manualExecutorGrievanceOutcome && d.manualExecutorAppealKind !== 'tamyeez') {
        return 'cassation_unlocked';
    }
    if (d.manualExecutorAppealKind === 'tamyeez') {
        return 'cassation_pending';
    }
    return 'idle';
}

export function isAppealDeadlinePerpetuallyEnforced(d: Decision): boolean {
    return d.appealDeadlinePerpetuallyEnforced === true;
}
