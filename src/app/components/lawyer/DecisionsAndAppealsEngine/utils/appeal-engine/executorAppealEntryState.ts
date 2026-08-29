import type { Decision } from '../../types';
import { EXECUTOR_QUEUE_REQUEST_KINDS } from '../appealRequestOrigin';
import { hasManualExecutorAppealAppellants } from './appealProceedingsTypes';
import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';

/** طلب محضر مُسوّى (قبول/رفض/بديل) — يدخل مسار الطعن عبر محرك الطلبات */
export function isSettledExecutorQueueRequest(hub: Decision): boolean {
    return (
        Boolean(hub.requestKind && EXECUTOR_QUEUE_REQUEST_KINDS.includes(hub.requestKind)) &&
        (hub.executorOutcome === 'approved' ||
            hub.executorOutcome === 'rejected' ||
            hub.executorOutcome === 'alternative')
    );
}

/** قرار منفذ أو طلب محضر بلا طعن مسجّل — يُعرض زر الطعن بغضّ النظر عن مهلة التاريخ */
export function isExecutorSideAwaitingAppealEntry(
    hub: Decision,
    pipeline: Decision = hub
): boolean {
    if (isManualExecutorLedgerDecision(hub)) return false;
    if (hub.isArchived) return false;
    if (hub.noAppealChosen === true || pipeline.noAppealChosen === true) return false;
    if (hub.personalCoerciveSubtype === 'release_debtor') return false;
    if (
        (hub.personalCoerciveSubtype === 'executive_detention' ||
            hub.personalCoerciveSubtype === 'executive_dossier_presentation') &&
        hub.executorDetentionHandedToJudge === true
    ) {
        return false;
    }

    const isExecutorSide = hub.appealRequestOrigin === 'executor_side';
    const isSettledQueueRequest = isSettledExecutorQueueRequest(hub);

    if (!isExecutorSide && !isSettledQueueRequest) return false;
    const st = pipeline.appealStatus ?? hub.appealStatus;
    if (st === 'final') return false;
    if (st === 'tadhallum_filed' || st === 'tamyeez_filed') return false;
    if (pipeline.appealPhase === 'grievance' || pipeline.appealPhase === 'cassation') {
        return false;
    }
    if (hub.activeAppealCopyId) return false;
    if (
        hub.appealActor ||
        pipeline.appealActor ||
        hub.appealMethod ||
        pipeline.appealMethod ||
        hasManualExecutorAppealAppellants(hub) ||
        hasManualExecutorAppealAppellants(pipeline)
    ) {
        return false;
    }
    return st === 'pending' || !st;
}
