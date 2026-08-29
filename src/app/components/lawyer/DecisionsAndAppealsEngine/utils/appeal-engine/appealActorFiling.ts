import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';
import {
    manualExecutorCassationPartyAfterGrievance,
    resolveManualExecutorGrievanceFiler,
} from './manualExecutorAppealActors';

/** الطرف المتضرر الذي يحق له تقديم التظلم أو التمييز المباشر */
export function resolveHarmedPartyAppealActor(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    if (d.appealRequestOrigin === 'executor_side') {
        const ex = d.executorOutcome;
        if (d.activatedByExecutorOrder === true || d.requestKind === 'personal_coercive') {
            if (ex === 'approved' || ex === 'alternative') return 'debtor';
            if (ex === 'rejected') return 'lawyer';
        }
        return null;
    }
    const proponent = resolveRequestProponent(d, perspective);
    const ex = d.executorOutcome;
    if (ex === 'approved' || ex === 'alternative') {
        return proponent === 'creditor' ? 'debtor' : 'lawyer';
    }
    if (ex === 'rejected') {
        return proponent === 'creditor' ? 'lawyer' : 'debtor';
    }
    return null;
}

export function resolveAppealBaseBranch(d: Decision): 'after_approval' | 'after_rejection' {
    if (d.appealBaseBranch === 'after_rejection' || d.appealBaseBranch === 'after_approval') {
        return d.appealBaseBranch;
    }
    return d.executorOutcome === 'rejected' ? 'after_rejection' : 'after_approval';
}

/** مُقدّم التظلم — يُستنتج من نتيجة الطعن وفرع القرار (لا يعتمد على appealActor القديم وحده) */
export function resolveGrievanceFilerActor(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    if (isManualExecutorLedgerDecision(d)) {
        return resolveManualExecutorGrievanceFiler(d);
    }
    const hub = hubWithInferredAppealOrigin(d);
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);
    const branch = resolveAppealBaseBranch(hub);
    const result = String(d.appealResult ?? '').trim();

    if (result === 'قبول التظلم' || result === 'رد التظلم') {
        if (branch === 'after_approval' && creditorRow) return 'debtor';
        if (branch === 'after_rejection' && creditorRow) return 'lawyer';
        if (branch === 'after_approval' && !creditorRow) return 'lawyer';
        if (branch === 'after_rejection' && !creditorRow) return 'debtor';
    }

    if (d.appealStatus === 'tadhallum_filed' || d.appealPhase === 'grievance') {
        if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
        if (branch === 'after_approval' && creditorRow) return 'debtor';
        if (branch === 'after_rejection' && creditorRow) return 'lawyer';
    }

    if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
    return null;
}

/** الطرف المخالف الذي يحق له التمييز بعد قبول تظلم الطرف الآخر */
export function cassationEntryPartyAfterGrievanceGrant(d: Decision): 'lawyer' | 'debtor' | null {
    if (isManualExecutorLedgerDecision(d)) {
        return manualExecutorCassationPartyAfterGrievance(d, true);
    }
    const branch = resolveAppealBaseBranch(d);
    const filer = resolveGrievanceFilerActor(d);
    const filerIsDebtor = filer === 'debtor';
    const hub = hubWithInferredAppealOrigin(d);
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);
    if (branch === 'after_rejection' && creditorRow && filer === 'lawyer') return 'debtor';
    if (branch === 'after_approval' && creditorRow && filerIsDebtor) return 'lawyer';
    if (branch === 'after_rejection' && !creditorRow && filerIsDebtor) return 'lawyer';
    if (branch === 'after_approval' && !creditorRow && filer === 'lawyer') return 'debtor';
    return null;
}
