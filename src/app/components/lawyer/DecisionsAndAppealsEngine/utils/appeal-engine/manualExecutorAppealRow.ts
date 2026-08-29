import type { Decision } from '../../types';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    manualExecutorAwaitingCassationParty,
    resolveManualExecutorGrievanceResult,
} from './manualExecutorAppealActors';
import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';

/** قرار «إضافة قرار» — النسخة أو الأصل المرتبط */
export function isManualExecutorAppealRow(row: Decision, all: Decision[]): boolean {
    if (isManualExecutorLedgerDecision(row)) return true;
    if (!row.appealSourceDecisionId) return false;
    const hub = resolveUnderlyingDecisionHub(row, all);
    return isManualExecutorLedgerDecision(hub);
}

/** يصحّح حقول الانتظار القديمة لقرار «إضافة قرار» بعد نتيجة التظلم */
export function repairManualExecutorAppealAwaitingFields(
    row: Decision,
    all: Decision[]
): Decision {
    if (!isManualExecutorAppealRow(row, all)) return row;
    const party = manualExecutorAwaitingCassationParty(row);
    const grievanceResult = resolveManualExecutorGrievanceResult(row);
    if (!party && !grievanceResult) return row;
    const next: Decision = { ...row };
    if (grievanceResult === 'قبول التظلم' || grievanceResult === 'رد التظلم') {
        next.appealResult = grievanceResult as Decision['appealResult'];
    }
    if (party) {
        next.awaitingCassationEntryBy = party;
        next.appealWorkflowState =
            party === 'debtor' ? 'PENDING_APPEAL_DEBTOR' : 'PENDING_APPEAL_LAWYER';
        next.grievanceAcceptedAwaitingDebtorTamyeez = false;
        next.grievanceRejectedAwaitingTamyeez = grievanceResult === 'رد التظلم';
    }
    return next;
}

/** قرار «إضافة قرار» فقط — لا مسار طعن */
export function isExecutorManualLedgerHub(hub: Decision): boolean {
    return isManualExecutorLedgerDecision(hub);
}
