/**
 * Eviction governing selectors for the executor seizure decision queue.
 */

import {
    coerceEvictionExecutorWorkflowKey,
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    isCassationAffirmResult,
    isExecutorRequestAppealCycleSupersededFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
import {
    evictionProcedureRowsMatch,
    isEvictionProcedureHubRow,
    isExecutorHubRowSuperseded,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import { isExecutorHubRowInactiveForGoverning } from '@/app/utils/executorSeizureDecisionQueueReadGoverningHub';

function evictionProcedureRowSortKey(row: Record<string, unknown>): string {
    return String((row as { resolvedAt?: string; date?: string }).resolvedAt ?? (row as { date?: string }).date ?? '');
}

function sortEvictionProcedureRowsNewestFirst(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return [...rows].sort((a, b) =>
        evictionProcedureRowSortKey(b).localeCompare(evictionProcedureRowSortKey(a), undefined, {
            numeric: true,
        })
    );
}

export function getNewestEvictionProcedureRowForMatch(
    all: Record<string, unknown>[],
    input: { evictionWorkflowKey?: string; title?: string }
): Record<string, unknown> | null {
    const matching = all.filter(
        (row) =>
            String((row as { requestKind?: string }).requestKind || '') === 'eviction_procedure' &&
            isEvictionProcedureHubRow(row) &&
            evictionProcedureRowsMatch(row, input)
    );
    return sortEvictionProcedureRowsNewestFirst(matching)[0] ?? null;
}

function evictionProcedureHubRowsForBranch(
    all: Record<string, unknown>[],
    branch: string
): Record<string, unknown>[] {
    return all.filter((row) => {
        if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
            return false;
        }
        if (!isEvictionProcedureHubRow(row)) return false;
        const rowBranch = inferExecutorApprovalDecisionType({
            title: String((row as { title?: string }).title || ''),
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: (row as { evictionWorkflowKey?: EvictionExecutorWorkflowKey })
                .evictionWorkflowKey,
        });
        return rowBranch === branch;
    });
}

/** كل صفوف hub لفرع إجراء (نشطة ومؤرشفة) — الأحدث أولاً */
export function listEvictionProcedureHubRowsForBranch(
    all: Record<string, unknown>[],
    branch: string
): Record<string, unknown>[] {
    return sortEvictionProcedureRowsNewestFirst(evictionProcedureHubRowsForBranch(all, branch));
}

/** كل صفوف hub المطابقة لمفتاح/عنوان — الأحدث أولاً */
export function listEvictionProcedureHubRowsForMatch(
    all: Record<string, unknown>[],
    input: { evictionWorkflowKey?: string; encroachmentWorkflowKey?: string; title?: string }
): Record<string, unknown>[] {
    const matching = all.filter(
        (row) =>
            String((row as { requestKind?: string }).requestKind || '') === 'eviction_procedure' &&
            isEvictionProcedureHubRow(row) &&
            evictionProcedureRowsMatch(row, input)
    );
    return sortEvictionProcedureRowsNewestFirst(matching);
}

export function getNewestEvictionProcedureRowForBranch(
    all: Record<string, unknown>[],
    branch: string
): Record<string, unknown> | null {
    const matching = evictionProcedureHubRowsForBranch(all, branch);
    return sortEvictionProcedureRowsNewestFirst(matching)[0] ?? null;
}

function evictionHubRowsEligibleForGoverning(
    all: Record<string, unknown>[],
    rows: Record<string, unknown>[]
): Record<string, unknown>[] {
    return rows.filter(
        (row) =>
            !isExecutorHubRowSuperseded(row) && !isExecutorHubRowInactiveForGoverning(row, all)
    );
}

/** صف يحكم واجهة الفرع: نشط أولاً، وإلا أحدث صف hub للعرض (مثل الرفض النهائي). */
export function getGoverningEvictionProcedureRowForBranch(
    all: Record<string, unknown>[],
    branch: string
): Record<string, unknown> | null {
    const branchRows = evictionProcedureHubRowsForBranch(all, branch);
    const sorted = sortEvictionProcedureRowsNewestFirst(
        evictionHubRowsEligibleForGoverning(all, branchRows)
    );
    const active = sorted.find((row) => isEvictionProcedureRowActive(row, all));
    if (active) return active;
    if (sorted[0]) return sorted[0];
    // دورة طعن مُغلقة تُستبعد من «eligible» — ما زال الصف يحكم مزامنة الفرع والعرض
    return sortEvictionProcedureRowsNewestFirst(branchRows)[0] ?? null;
}

export function getGoverningEvictionProcedureRowForMatch(
    all: Record<string, unknown>[],
    input: { evictionWorkflowKey?: string; encroachmentWorkflowKey?: string; title?: string }
): Record<string, unknown> | null {
    const matching = all.filter(
        (row) =>
            String((row as { requestKind?: string }).requestKind || '') === 'eviction_procedure' &&
            isEvictionProcedureHubRow(row) &&
            evictionProcedureRowsMatch(row, input)
    );
    const sorted = sortEvictionProcedureRowsNewestFirst(
        evictionHubRowsEligibleForGoverning(all, matching)
    );
    const active = sorted.find((row) => isEvictionProcedureRowActive(row, all));
    if (active) return active;
    return sorted[0] ?? null;
}


export function getGoverningEncroachmentProcedureRowForMatch(
    all: Record<string, unknown>[],
    encroachmentWorkflowKey: string
): Record<string, unknown> | null {
    const key = String(encroachmentWorkflowKey || '').trim();
    if (!key) return null;
    return getGoverningEvictionProcedureRowForMatch(all, { encroachmentWorkflowKey: key });
}

/** صف حاكم لطلب إخلاء جديد — يفضّل الفرع المستنتج من مفتاح المسار ثم المطابقة النصية. */
export function getGoverningEvictionProcedureRowForNewRequest(
    all: Record<string, unknown>[],
    input: { evictionWorkflowKey?: string; title?: string }
): Record<string, unknown> | null {
    const wf = String(input.evictionWorkflowKey || '').trim();
    if (wf) {
        const branch = inferExecutorApprovalDecisionType({
            title: String(input.title || ''),
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: wf as EvictionExecutorWorkflowKey,
        });
        if (branch && branch !== 'other') {
            const byBranch = getGoverningEvictionProcedureRowForBranch(all, branch);
            if (byBranch?.id) return byBranch;
        }
    }
    return getGoverningEvictionProcedureRowForMatch(all, input);
}

/** طلب تخلية ما زال قائماً (معلّق لدى المنفذ أو موافق عليه بانتظار إكمال المحضر). */
export function isEvictionProcedureRowActive(
    row: Record<string, unknown>,
    allDecisions?: Record<string, unknown>[]
): boolean {
    const all = allDecisions ?? [];
    if (all.length && isExecutorRequestAppealCycleSupersededFromRecord(row, all)) {
        return false;
    }
    const outcome = String((row as { executorOutcome?: string }).executorOutcome || '');
    const appealStatus = String((row as { appealStatus?: string }).appealStatus || '').trim();
    const appealResult = String((row as { appealResult?: string }).appealResult || '').trim();
    if (outcome === 'rejected') {
        if (appealStatus === 'final') {
            if (isCassationAffirmResult(appealResult) || appealResult === 'رد التظلم') {
                return false;
            }
            if (appealResult === 'نقض القرار') {
                return (
                    isExecutorRowEffectivelyApproved(row) &&
                    !isEvictionProcedureRowWorkflowComplete(row)
                );
            }
            return false;
        }
        if ((row as { noAppealChosen?: boolean }).noAppealChosen === true) {
            return false;
        }
    }
    if (isExecutorRowRejectedAndFinal(row)) return false;
    const pending =
        row.executorOutcome === 'pending' || row.executorOutcome === undefined || row.executorOutcome === '';
    if (pending) return true;
    if (isExecutorRowEffectivelyApproved(row)) {
        return !isEvictionProcedureRowWorkflowComplete(row);
    }
    return false;
}

/** اكتمال مسار الطلب داخل محضر المتابعة (بعد موافقة المنفذ وإدخال البيانات المطلوبة). */
export function isEvictionProcedureRowWorkflowComplete(row: Record<string, unknown>): boolean {
    if (isExecutorRowRejectedAndFinal(row)) return true;
    if (!isExecutorRowEffectivelyApproved(row)) return false;
    const encKey = String(
        (row as { encroachmentWorkflowKey?: string }).encroachmentWorkflowKey || ''
    ).trim();
    if (encKey) {
        return Boolean(
            String((row as { encroachmentRequestSavedAt?: string }).encroachmentRequestSavedAt || '').trim()
        );
    }
    const branch = inferExecutorApprovalDecisionType({
        title: String(row.title || ''),
        requestKind: 'eviction_procedure',
        evictionWorkflowKey: coerceEvictionExecutorWorkflowKey(
            (row as { evictionWorkflowKey?: string }).evictionWorkflowKey,
        ),
    });
    if (branch === 'Field Visit Date') {
        return Boolean(String((row as { executorScheduleLabel?: string }).executorScheduleLabel || '').trim());
    }
    if (branch === 'Police Assistance Request') {
        return Boolean(String((row as { policeAssistanceSavedAt?: string }).policeAssistanceSavedAt || '').trim());
    }
    if (branch === 'Lock Breaking & Inventory') {
        return Boolean(
            String((row as { breakInventoryFurnitureFinalizedAt?: string }).breakInventoryFurnitureFinalizedAt || '').trim()
        );
    }
    if (branch === 'Marital Furniture Delivery') {
        const scheduled = Boolean(
            String((row as { executorScheduleLabel?: string }).executorScheduleLabel || '').trim()
        );
        const finalized = Boolean(
            String((row as { breakInventoryFurnitureFinalizedAt?: string }).breakInventoryFurnitureFinalizedAt || '').trim()
        );
        return scheduled && finalized;
    }
    if (branch === 'Judicial Custodian') {
        return Boolean(String((row as { judicialCustodianDetailsSavedAt?: string }).judicialCustodianDetailsSavedAt || '').trim());
    }
    if (branch === 'Grace Period') {
        return Boolean(String((row as { evictionGraceSavedAt?: string }).evictionGraceSavedAt || '').trim());
    }
    if (branch === 'Eviction') {
        return true;
    }
    return false;
}
