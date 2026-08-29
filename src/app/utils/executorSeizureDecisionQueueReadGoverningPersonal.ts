/**
 * Personal-coercive governing selectors for the executor seizure decision queue.
 */

import {
    isExecutorRequestAppealCycleSupersededFromRecord,
    isExecutorRequestFollowupBlockedFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type PersonalCoerciveSubtype,
    EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES,
    isExecutorHubRowSuperseded,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import { isExecutorHubRowInactiveForGoverning } from '@/app/utils/executorSeizureDecisionQueueReadGoverningHub';

function personalCoerciveRowSortKey(row: Record<string, unknown>): string {
    return String((row as { resolvedAt?: string; date?: string }).resolvedAt ?? (row as { date?: string }).date ?? '');
}

function sortPersonalCoerciveRowsNewestFirst(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return [...rows].sort((a, b) =>
        personalCoerciveRowSortKey(b).localeCompare(personalCoerciveRowSortKey(a), undefined, {
            numeric: true,
        })
    );
}

function filterPersonalCoerciveSubtypeRowsFromList(
    rows: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown>[] {
    const normalizeDebtorKey = (v: unknown): string => String(v ?? '').trim();
    const targetDebtorKey = normalizeDebtorKey(opts?.debtorKey);
    const primaryDebtorKey = normalizeDebtorKey(opts?.primaryDebtorKey);
    const rowMatchesDebtorScope = (row: Record<string, unknown>): boolean => {
        if (!targetDebtorKey) return true;
        const rowDebtorKey = normalizeDebtorKey(
            (row as { personalCoerciveDebtorKey?: string }).personalCoerciveDebtorKey
        );
        if (rowDebtorKey) return rowDebtorKey === targetDebtorKey;
        return Boolean(primaryDebtorKey) && targetDebtorKey === primaryDebtorKey;
    };
    return rows.filter(
        (r) =>
            String((r as { requestKind?: string }).requestKind || '') === 'personal_coercive' &&
            String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || '') === subtype &&
            rowMatchesDebtorScope(r as Record<string, unknown>)
    ) as Record<string, unknown>[];
}

function filterPersonalCoerciveSubtypeRows(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown>[] {
    return filterPersonalCoerciveSubtypeRowsFromList(
        readExecutorDecisionsArray(executionId),
        subtype,
        opts
    );
}

/** صف الطعن/المتابعة — يشمل الموافقات المغلقة واجهياً (مثل منع السفر بعد النفاذ) */
export function getPersonalCoerciveSubtypeAppealRowFromDecisions(
    allDecisions: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const sorted = sortPersonalCoerciveRowsNewestFirst(
        filterPersonalCoerciveSubtypeRowsFromList(allDecisions, subtype, opts).filter((row) => {
            if (isExecutorHubRowSuperseded(row)) return false;
            if ((row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) return false;
            const out = String((row as { executorOutcome?: string }).executorOutcome || '');
            if (out === 'withdrawn') return false;
            return true;
        })
    );
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    if (pending) return pending;
    return sorted[0] ?? null;
}

/** البطاقة الحاكمة من مصفوفة قرارات مُمرَّرة (مزامنة المحضر مع مركز القرارات) */
export function getGoverningPersonalCoerciveSubtypeRowFromDecisions(
    allDecisions: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const sorted = sortPersonalCoerciveRowsNewestFirst(
        filterPersonalCoerciveSubtypeRowsFromList(allDecisions, subtype, opts).filter(
            (row) => !isExecutorHubRowInactiveForGoverning(row, allDecisions)
        )
    );
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    if (pending) return pending;
    return sorted[0] ?? null;
}

/** بطاقة عرض الإضبارة الحاكمة من مصفوفة قرارات مُمرَّرة */
export function getGoverningDossierPresentationRowFromDecisions(
    allDecisions: Record<string, unknown>[],
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const merged = EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES.flatMap((subtype) =>
        filterPersonalCoerciveSubtypeRowsFromList(allDecisions, subtype, opts).filter(
            (row) => !isExecutorHubRowInactiveForGoverning(row, allDecisions)
        )
    );
    const sorted = sortPersonalCoerciveRowsNewestFirst(merged);
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    if (pending) return pending;
    return sorted[0] ?? null;
}

/** أحدث صف طلب تنفيذ جبري شخصي من نفس النوع (ترتيب زمني خام) */
export function getNewestPersonalCoerciveSubtypeRow(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const matches = filterPersonalCoerciveSubtypeRows(executionId, subtype, opts);
    return sortPersonalCoerciveRowsNewestFirst(matches)[0] ?? null;
}

export function isPersonalCoerciveSubtypeRowPending(row: Record<string, unknown>): boolean {
    const out = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending');
    return out === 'pending' || out === '';
}

/** صف يحكم طلب عرض الإضبارة (الجديد + القديم executive_detention) */
export function getGoverningDossierPresentationRow(
    executionId: string | undefined,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const all = readExecutorDecisionsArray(executionId);
    const merged = EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES.flatMap((subtype) =>
        filterPersonalCoerciveSubtypeRows(executionId, subtype, opts).filter(
            (row) => !isExecutorHubRowInactiveForGoverning(row, all)
        )
    );
    const sorted = sortPersonalCoerciveRowsNewestFirst(merged);
    const pending = sorted.find((row) => isPersonalCoerciveSubtypeRowPending(row));
    if (pending) return pending;
    return sorted[0] ?? null;
}

export function getDossierPresentationOutcome(
    executionId: string | undefined,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean } {
    const last = getGoverningDossierPresentationRow(executionId, opts);
    if (!last) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    if ((last as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    const out = String((last as { executorOutcome?: string }).executorOutcome || 'pending');
    if (out === 'withdrawn') {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
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


/** صف يحكم واجهة النوع: معلّق أولاً حتى لا يُستبدل بطلب موافق عليه أقدم بتاريخ أحدث */
export function getGoverningPersonalCoerciveSubtypeRow(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    return getGoverningPersonalCoerciveSubtypeRowFromDecisions(
        readExecutorDecisionsArray(executionId),
        subtype,
        opts
    );
}

/** بطاقة/قرار غير منتهٍ في مركز القرارات (لتنبيه الاستبدال عند إعادة الإرسال) */
export function hasActivePersonalCoerciveSubtypeCardFromDecisions(
    allDecisions: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): boolean {
    const row = getGoverningPersonalCoerciveSubtypeRowFromDecisions(allDecisions, subtype, opts);
    if (!row) return false;
    if ((row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) return false;
    const out = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (out === 'withdrawn') return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    if (isPersonalCoerciveSubtypeRowPending(row)) return true;
    if (isExecutorRowRejectedAndFinal(row)) return true;
    if (isExecutorRequestAppealCycleSupersededFromRecord(row, allDecisions)) return false;
    if (isExecutorRequestFollowupBlockedFromRecord(row, allDecisions)) return true;
    return false;
}

export function hasActivePersonalCoerciveSubtypeCard(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): boolean {
    return hasActivePersonalCoerciveSubtypeCardFromDecisions(
        readExecutorDecisionsArray(executionId),
        subtype,
        opts,
    );
}


/** حالة آخر طلب تنفيذ جبري شخصي من نفس النوع (للشارات والواجهة) */
export function getPersonalCoerciveSubtypeOutcome(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean } {
    const last = getGoverningPersonalCoerciveSubtypeRow(executionId, subtype, opts);
    if (!last) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    if ((last as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    const out = String((last as { executorOutcome?: string }).executorOutcome || 'pending');
    if (out === 'withdrawn') {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
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
