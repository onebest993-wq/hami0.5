/**
 * Hub / seizure governing selectors for the executor seizure decision queue.
 */

import {
    isExecutorRequestAppealCycleSupersededFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { isExecutorRowEffectivelyApproved } from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type SeizureRequestSubtype,
    buildSeizureSubtypeMatcher,
    isEvictionProcedureHubRow,
    isExecutorHubRowSuperseded,
} from '@/app/utils/executorSeizureDecisionQueueTypes';

/** صف حجز يحكم واجهة الطلب — يستثني المؤرشف والمُستبدَل */
export function getGoverningSeizureDecisionBySubtypeFromDecisions(
    allDecisions: Record<string, unknown>[],
    subtype: SeizureRequestSubtype
): Record<string, unknown> | null {
    const active = allDecisions.filter(
        (row) =>
            buildSeizureSubtypeMatcher(subtype)(row) &&
            !isExecutorHubRowInactiveForGoverning(row, allDecisions)
    );
    if (active.length === 0) return null;
    const sorted = sortHubDecisionRowsNewestFirst(active);
    const pending = sorted.find((row) => {
        const out = String((row as { executorOutcome?: string }).executorOutcome || 'pending');
        return !out || out === 'pending';
    });
    if (pending) return pending;
    return sorted[0] ?? null;
}

export function getGoverningSeizureDecisionBySubtype(
    executionId: string | undefined,
    subtype: SeizureRequestSubtype,
    allDecisions?: Record<string, unknown>[]
): Record<string, unknown> | null {
    const rows = allDecisions ?? readExecutorDecisionsArray(executionId);
    return getGoverningSeizureDecisionBySubtypeFromDecisions(rows, subtype);
}

/** صف لا يحكم الواجهة ولا يحجز طلباً جديداً (مؤرشف / مُستبدَل / منسحب / دورة طعن مُغلقة) */
export function isExecutorHubRowInactiveForGoverning(
    row: Record<string, unknown> | null | undefined,
    allDecisions?: Record<string, unknown>[]
): boolean {
    if (!row || typeof row !== 'object') return true;
    if (isExecutorHubRowSuperseded(row)) return true;
    if ((row as { domainIsolationSuppressed?: boolean }).domainIsolationSuppressed === true) {
        return true;
    }
    if ((row as { isArchived?: boolean }).isArchived === true) return true;
    if ((row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) return true;
    const out = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (out === 'withdrawn') return true;
    const pcSubtype = String((row as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || '');
    /** عرض الإضبارة — بعد موافقة المنفذ تُغلق دورة الطلب؛ مسار القاضي من البطاقة المستقلة */
    if (pcSubtype === 'executive_dossier_presentation') {
        if ((row as { dossierPresentationClosed?: boolean }).dossierPresentationClosed === true) {
            return true;
        }
        if (isExecutorRowEffectivelyApproved(row)) {
            return true;
        }
    }
    /** منع السفر — بعد الموافقة يُدار النفاذ من ملف التنفيذ لا من بطاقة طلب عالقة */
    if (pcSubtype === 'travel_ban' && isExecutorRowEffectivelyApproved(row)) {
        return true;
    }
    /** الحبس القديم (executive_detention) — يبقى حاكماً حتى أرشفة صريحة */
    if (pcSubtype === 'executive_detention' && isExecutorRowEffectivelyApproved(row)) {
        return false;
    }
    const all = allDecisions ?? [];
    if (all.length > 0 && isExecutorRequestAppealCycleSupersededFromRecord(row, all)) {
        return true;
    }
    return false;
}

function hubDecisionRowSortKey(row: Record<string, unknown>): string {
    return String((row as { resolvedAt?: string; date?: string }).resolvedAt ?? (row as { date?: string }).date ?? '');
}

function sortHubDecisionRowsNewestFirst(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return [...rows].sort((a, b) =>
        hubDecisionRowSortKey(b).localeCompare(hubDecisionRowSortKey(a), undefined, {
            numeric: true,
        })
    );
}

/** كل صفوف hub لنوع حجز — نشطة ومؤرشفة — الأحدث أولاً */
export function listSeizureHubRows(
    all: Record<string, unknown>[],
    subtype: string
): Record<string, unknown>[] {
    const st = String(subtype || '').trim();
    return sortHubDecisionRowsNewestFirst(
        all.filter(
            (row) =>
                String((row as { requestKind?: string }).requestKind || '') === 'seizure' &&
                isEvictionProcedureHubRow(row) &&
                String((row as { seizureSubtype?: string }).seizureSubtype || '').trim() === st
        )
    );
}

/** كل صفوف hub لطلب الكفيل — الأحدث أولاً */
export function listGuarantorHubRows(all: Record<string, unknown>[]): Record<string, unknown>[] {
    return sortHubDecisionRowsNewestFirst(
        all.filter(
            (row) =>
                String((row as { requestKind?: string }).requestKind || '') === 'guarantor_request' &&
                isEvictionProcedureHubRow(row)
        )
    );
}
