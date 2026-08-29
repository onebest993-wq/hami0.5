import type { Decision } from '../../types';
import {
    isManualExecutorLedgerDecision,
    resolveManualExecutorWorkflowPhase,
} from './manualExecutorIdentity';

export function resolveManualExecutorGrievanceResult(row: Decision): string {
    const direct = String(row.appealResult ?? '').trim();
    if (direct === 'قبول التظلم' || direct === 'رد التظلم') return direct;
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    for (let i = logs.length - 1; i >= 0; i--) {
        const m = String(logs[i]?.message ?? '');
        if (/قبول التظلم|قُبل التظلم/.test(m)) return 'قبول التظلم';
        if (/رد التظلم|رُد التظلم/.test(m)) return 'رد التظلم';
    }
    return '';
}

/** مُقدّم التظلم على قرار «إضافة قرار» اليدوي */
export function resolveManualExecutorGrievanceFiler(d: Decision): 'lawyer' | 'debtor' | null {
    if (isManualExecutorLedgerDecision(d)) {
        const phase = resolveManualExecutorWorkflowPhase(d);
        const grievanceFilerRelevant =
            d.manualExecutorAppealKind === 'tadhallum' ||
            d.manualExecutorGrievanceOutcome != null ||
            phase === 'grievance_pending' ||
            phase === 'cassation_unlocked';
        if (
            grievanceFilerRelevant &&
            (d.manualExecutorAppealAppellant === 'lawyer' ||
                d.manualExecutorAppealAppellant === 'debtor')
        ) {
            return d.manualExecutorAppealAppellant;
        }
    }
    const manual = d.manualGrievanceAppellants ?? [];
    if (manual.length === 1) return manual[0]!;
    if (manual.length > 1) {
        if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
        return null;
    }
    if (d.appealActor === 'lawyer' || d.appealActor === 'debtor') return d.appealActor;
    if (d.appealRequestOrigin === 'creditor_side') return 'lawyer';
    if (d.appealRequestOrigin === 'debtor_side') return 'debtor';
    return null;
}

/**
 * الطرف المخوّل بالتمييز بعد نتيجة التظلم — قرار «إضافة قرار» فقط.
 * قبول التظلم: المتضرر (الطرف الآخر) | رد التظلم: مقدّم التظلم.
 */
export function manualExecutorCassationPartyAfterGrievance(
    d: Decision,
    grievanceAccepted: boolean
): 'lawyer' | 'debtor' | null {
    const filer = resolveManualExecutorGrievanceFiler(d);
    if (!filer) return null;
    if (grievanceAccepted) return filer === 'debtor' ? 'lawyer' : 'debtor';
    return filer;
}

/** من يحق له تسجيل التمييز الآن على قرار «إضافة قرار» */
export function manualExecutorAwaitingCassationParty(d: Decision): 'lawyer' | 'debtor' | null {
    if (d.appealStatus === 'tamyeez_filed' || d.appealPhase === 'cassation') return null;
    if (resolveManualExecutorWorkflowPhase(d) === 'cassation_pending') return null;
    if (d.appealStatus === 'final') return null;

    const result = resolveManualExecutorGrievanceResult(d);
    if (result === 'قبول التظلم') {
        return manualExecutorCassationPartyAfterGrievance(d, true);
    }
    if (result === 'رد التظلم') {
        return manualExecutorCassationPartyAfterGrievance(d, false);
    }
    if (
        (d.appealStatus === 'tadhallum_filed' || d.appealPhase === 'grievance') &&
        !result
    ) {
        return null;
    }
    return null;
}
