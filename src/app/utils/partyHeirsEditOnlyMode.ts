import type { ExecutionFile, Party } from '@/app/types/execution';
import { getPartyDeathCaseForRole, isPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import {
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionReadQueries';

function partyHasRegisteredHeirs(
    party: Party | undefined,
    file: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor',
): boolean {
    const partyHeirs = (party?.heirs || []).filter((s) => /\S/.test(String(s)));
    const partyDetails = Array.isArray(
        (party as { heirs_details?: unknown[] } | undefined)?.heirs_details,
    )
        ? (
              (party as { heirs_details: Array<{ name?: string }> }).heirs_details || []
          ).filter((h) => /\S/.test(String(h?.name || '')))
        : [];
    if (partyHeirs.length > 0 || partyDetails.length > 0) return true;
    const deathCase = getPartyDeathCaseForRole(file, role);
    const caseHeirs = (deathCase?.heir_names || []).filter((s) => /\S/.test(String(s)));
    const caseDetails = (deathCase?.heir_details || []).filter((h) =>
        /\S/.test(String(h?.name || '')),
    );
    return caseHeirs.length > 0 || caseDetails.length > 0;
}

export function isPrimaryPartyDeceased(
    role: 'creditor' | 'debtor',
    party: Party | undefined,
    file: ExecutionFile | null | undefined,
): boolean {
    if (party?.isDeceased) return true;
    if (isPartyDeathCaseForRole(file, role)) return true;
    if (role === 'debtor' && file?.is_debtor_deceased === true) return true;
    if (role === 'creditor' && file?.is_creditor_deceased === true) return true;
    return false;
}

/** بعد وفاة الطرف وتسجيل ورثة — التعديل يقتصر على بيانات الورثة */
export function isPartyHeirsEditOnlyMode(
    file: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor',
    party: Party | undefined,
    index: number,
    decisionsExecutionId: string,
): boolean {
    const deceased =
        index === 0 ? isPrimaryPartyDeceased(role, party, file) : Boolean(party?.isDeceased);
    if (!deceased) return false;

    const subSt =
        role === 'creditor'
            ? getCreditorHeirSubstitutionRequestStatus(decisionsExecutionId)
            : getDebtorHeirSubstitutionRequestStatus(decisionsExecutionId);
    if (subSt === 'approved' || subSt === 'alternative') return true;

    return partyHasRegisteredHeirs(party, file, role);
}
