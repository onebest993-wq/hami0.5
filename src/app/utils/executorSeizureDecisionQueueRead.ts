/**
 * Read / query helpers for the executor seizure decision queue.
 * Thin barrel — governing and resolve peels live in sibling modules.
 */

import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type SeizureRequestSubtype,
    type UnifiedCollectionDecisionState,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueueTypes';

export {
    getGoverningSeizureDecisionBySubtypeFromDecisions,
    getGoverningSeizureDecisionBySubtype,
    isExecutorHubRowInactiveForGoverning,
    getPersonalCoerciveSubtypeAppealRowFromDecisions,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    getNewestPersonalCoerciveSubtypeRow,
    isPersonalCoerciveSubtypeRowPending,
    getGoverningDossierPresentationRow,
    getDossierPresentationOutcome,
    getGoverningPersonalCoerciveSubtypeRow,
    hasActivePersonalCoerciveSubtypeCardFromDecisions,
    hasActivePersonalCoerciveSubtypeCard,
    getPersonalCoerciveSubtypeOutcome,
    getNewestEvictionProcedureRowForMatch,
    listSeizureHubRows,
    listGuarantorHubRows,
    listEvictionProcedureHubRowsForBranch,
    listEvictionProcedureHubRowsForMatch,
    getNewestEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForMatch,
    getGoverningEncroachmentProcedureRowForMatch,
    getGoverningEvictionProcedureRowForNewRequest,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueueReadGoverning';

export {
    getExecutorDecisionRowById,
    resolveExecutorDecisionRowContext,
    findLatestHeirSubstitutionDecisionNeedingEntry,
    hasPendingCreditorDeathOnlyReport,
    hasPendingCreditorPartyDeathRequest,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
    findApprovedFieldVisitNeedingSchedule,
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
    resolvePersonalCoerciveDecisionsNavFromDecisions,
    resolvePersonalCoerciveDecisionsNav,
    hasBlockingEvictionProcedureDuplicate,
    evictionBranchGateInput,
    isEvictionBranchBlockingNewRequest,
    isEvictionBranchResendBlocked,
} from '@/app/utils/executorSeizureDecisionQueueReadResolve';

export function getLatestSeizureDecisionBySubtype(
    executionId: string | undefined,
    subtype: SeizureRequestSubtype
): Record<string, unknown> | null {
    const rows = readExecutorDecisionsArray(executionId);
    const filtered = rows.filter(
        (r) => r.requestKind === 'seizure' && String((r as any).seizureSubtype || '') === subtype
    );
    if (filtered.length === 0) return null;
    const first = filtered[0];
    if (!first) return null;
    return filtered.reduce((acc, cur) => {
        const a = String((acc as any).resolvedAt ?? (acc as any).date ?? '');
        const b = String((cur as any).resolvedAt ?? (cur as any).date ?? '');
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, first);
}

export function getGuarantorRequestOutcome(
    executionId: string | undefined
): { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean } {
    const rows = readExecutorDecisionsArray(executionId).filter((r) =>
        isGuarantorRequestDecisionRow(r as Record<string, unknown>)
    );
    const last = rows[0] as Record<string, unknown> | undefined;
    if (!last) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    const out = String((last as { executorOutcome?: string }).executorOutcome || 'pending');
    if (out === 'pending') {
        return { pending: true, approved: false, rejected: false, alternative: false };
    }
    if (out === 'alternative') {
        return { pending: false, approved: false, rejected: false, alternative: true };
    }
    if (isExecutorRowEffectivelyApproved(last)) {
        return { pending: false, approved: true, rejected: false, alternative: false };
    }
    if (isExecutorRowRejectedAndFinal(last)) {
        return { pending: false, approved: false, rejected: true, alternative: false };
    }
    return { pending: false, approved: false, rejected: false, alternative: false };
}

function readDecisionsArray(executionId: string | undefined): unknown[] {
    return readExecutorDecisionsArray(executionId);
}

/** هل وافق المنفذ سابقاً على طلب صرف أتعاب محكومة؟ — يمنع إعادة الطلب */
export function hasApprovedLawyerFeePayout(executionId: string | undefined): boolean {
    const arr = readDecisionsArray(executionId);
    return arr.some(
        (x) =>
            (x as { requestKind?: string }).requestKind === 'lawyer_fee_payout' &&
            isExecutorRowEffectivelyApproved(x as Record<string, unknown>)
    );
}

/** موافقة منفذ العدل على طلب استحصال الوعاء الموحّد — تُفعّل خيارات التحصيل */
export function hasApprovedUnifiedCollection(executionId: string | undefined): boolean {
    const arr = readDecisionsArray(executionId);
    return arr.some(
        (x) =>
            (x as { requestKind?: string }).requestKind === 'unified_collection' &&
            isExecutorRowEffectivelyApproved(x as Record<string, unknown>)
    );
}

export function getLatestUnifiedCollectionDecisionState(
    executionId: string | undefined
): UnifiedCollectionDecisionState {
    const arr = readExecutorDecisionsArray(executionId);
    const row = arr.find(
        (x) => String((x as { requestKind?: string }).requestKind || '') === 'unified_collection'
    );
    if (!row) return 'none';
    if (isExecutorRowEffectivelyApproved(row)) return 'approved';
    if (isExecutorRowRejectedAndFinal(row)) return 'rejected';
    return 'pending';
}
