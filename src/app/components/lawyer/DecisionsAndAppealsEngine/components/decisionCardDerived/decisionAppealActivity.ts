import type { Decision } from '../../types';

export function decisionHasAppealActivity(decision: Decision): boolean {
    const workflowState = decision.appealWorkflowState ?? 'NONE';
    return (
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
        workflowState === 'REVOKED_BY_APPEAL'
    );
}
