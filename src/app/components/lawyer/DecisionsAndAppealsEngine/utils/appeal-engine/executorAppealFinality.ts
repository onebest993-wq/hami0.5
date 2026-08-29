import type { Decision } from '../../types';
import { isCassationAffirmResult } from './appealCassationResultLabels';
import { isExecutorSideAwaitingAppealEntry } from './executorAppealEntryState';

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

    if (opts.appealWindowClosed || opts.isPastTamyeezDeadline) {
        return st === 'pending' || !st || !phase;
    }

    return false;
}
