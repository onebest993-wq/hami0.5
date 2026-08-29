/**
 * Patch / close-cycle / merge helpers for the executor seizure decision queue.
 */

import {
    isExecutorDecisionsStorageKey,
    readExecutorDecisionsUnionForExecution,
    resolveDecisionRowNamespaceSlug,
    executionDecisionsNamespaceStorageKey,
    flushExecutorDecisionsStorageImmediate,
} from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';
import { readSecureOrDrainLegacySync, writeSecureAndClearLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';
import { isStorageKeyVisibleToCurrentUser } from '@/app/utils/executionDeviceStorageScope';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type PersonalCoerciveSubtype,
    type SeizureRequestSubtype,
    buildPersonalCoerciveSubtypeMatcher,
    buildSeizureSubtypeMatcher,
    dispatchDecisionsReload,
    evictionProcedureRowsMatch,
    isEvictionProcedureHubRow,
    isExecutiveDossierPresentationSubtype,
    isExecutorHubRowSuperseded,
    isGuarantorRequestDecisionRow,
    parseStoredDecisionsArray,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
    supersedePriorExecutorHubRows,
    supersedeRejectedFinalExecutorHubRows,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import { resolveExecutorDecisionRowContext } from '@/app/utils/executorSeizureDecisionQueueRead';

/** إغلاق دورة طلب حجز في مركز القرارات — يعيد إمكانية تقديم طلب جديد */
export function closeSeizureSubtypeDecisionCycle(input: {
    executionId: string | undefined;
    subtype: SeizureRequestSubtype;
}): void {
    const executionId = input.executionId;
    if (!executionId) return;
    const matches = buildSeizureSubtypeMatcher(input.subtype);
    try {
        let arr = readActiveExecutorDecisionsForMutate(executionId);
        arr = supersedePriorExecutorHubRows(arr, matches);
        persistExecutorDecisionsArray(executionId, arr);
    } catch {
        /* ignore */
    }
}


export function patchExecutorDecisionRow(
    executionId: string | undefined,
    decisionId: string,
    patch: Record<string, unknown>
): boolean {
    const did = String(decisionId || '').trim();
    if (!did) return false;
    try {
        const data = readExecutionDataForDomainGate(executionId);
        const union = readExecutorDecisionsUnionForExecution(executionId, data);
        const target = union.find((row) => String((row as { id?: string }).id ?? '') === did);
        if (!target) return false;

        const slug = resolveDecisionRowNamespaceSlug(target, data, executionId);
        const bucketKey = executionDecisionsNamespaceStorageKey(executionId, slug);
        const bucketRaw = readSecureOrDrainLegacySync(bucketKey);
        const bucket = parseStoredDecisionsArray(bucketRaw) as Record<string, unknown>[];
        let found = false;
        const nextBucket = bucket.map((row) => {
            if (String((row as { id?: string }).id ?? '') !== did) return row;
            found = true;
            return { ...row, ...patch };
        });
        if (!found) {
            const active = readActiveExecutorDecisionsForMutate(executionId);
            const nextActive = active.map((row) => {
                if (String((row as { id?: string }).id ?? '') !== did) return row;
                found = true;
                return { ...row, ...patch };
            });
            if (!found) return false;
            persistExecutorDecisionsArray(executionId, nextActive);
            return true;
        }
        writeSecureAndClearLegacySync(bucketKey, JSON.stringify(nextBucket));
        flushExecutorDecisionsStorageImmediate(executionId, data);
        dispatchDecisionsReload();
        return true;
    } catch {
        return false;
    }
}

/** يحدّث الصف في المفتاح المفضّل أو يبحث في كل مفاتيح execution_*_decisions */
export function patchExecutorDecisionRowReliable(
    executionId: string | undefined,
    decisionId: string,
    patch: Record<string, unknown>
): { ok: boolean; storageExecutionId: string } {
    const preferred = String(executionId ?? '').trim();
    if (preferred && patchExecutorDecisionRow(preferred, decisionId, patch)) {
        return { ok: true, storageExecutionId: preferred };
    }
    const everywhere = patchExecutorDecisionRowEverywhere(decisionId, patch, preferred);
    if (everywhere.ok) {
        const ctx = resolveExecutorDecisionRowContext(preferred, decisionId);
        return {
            ok: true,
            storageExecutionId: String(ctx?.storageExecutionId || preferred).trim() || preferred,
        };
    }
    return { ok: false, storageExecutionId: preferred };
}

export function patchExecutorDecisionRowEverywhere(
    decisionId: string,
    patch: Record<string, unknown>,
    scopeExecutionId?: string,
): { ok: boolean; patchedKeys: number } {
    const did = String(decisionId || '').trim();
    if (!did) return { ok: false, patchedKeys: 0 };
    const scopeId = String(scopeExecutionId ?? '').trim();
    const scopePrefix = scopeId ? `${executionStorageKey(scopeId)}` : '';
    try {
        const keys = SecureStoreService.listKeysSync();
        let touched = 0;
        for (const k of keys) {
            const key = String(k || '').trim();
            if (!key || !isExecutorDecisionsStorageKey(key)) continue;
            if (!isStorageKeyVisibleToCurrentUser(key)) continue;
            if (scopePrefix && !key.startsWith(scopePrefix)) continue;
            const raw = readSecureOrDrainLegacySync(key);
            const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
            if (!arr.length) continue;
            let changed = false;
            const next = arr.map((row) => {
                if (String((row as any)?.id ?? '') !== did) return row;
                changed = true;
                return { ...row, ...patch };
            });
            if (!changed) continue;
            writeSecureAndClearLegacySync(key, JSON.stringify(next));
            touched += 1;
        }
        if (touched > 0) {
            flushExecutorDecisionsStorageImmediate(scopeId || undefined);
            dispatchDecisionsReload();
        }
        return { ok: touched > 0, patchedKeys: touched };
    } catch {
        return { ok: false, patchedKeys: 0 };
    }
}

export function mergeExecutorDecisionsInto(input: {
    targetExecutionId: string | undefined;
    sourceExecutionIds: Array<string | undefined>;
}): { merged: boolean; countBefore: number; countAfter: number } {
    const targetId = String(input.targetExecutionId ?? '').trim();
    if (!targetId || targetId === 'default' || targetId === 'undefined') {
        return { merged: false, countBefore: 0, countAfter: 0 };
    }
    const sources = input.sourceExecutionIds
        .map((x) => String(x ?? '').trim())
        .filter((x) => x && x !== 'default' && x !== 'undefined' && x !== targetId);
    if (sources.length === 0) {
        const existing = readExecutorDecisionsArray(targetId);
        return { merged: false, countBefore: existing.length, countAfter: existing.length };
    }

    const countBefore = readExecutorDecisionsArray(targetId).length;

    const pickBest = (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const ao = String((a as any).executorOutcome ?? 'pending');
        const bo = String((b as any).executorOutcome ?? 'pending');
        const aResolved = ao !== 'pending' && ao !== '';
        const bResolved = bo !== 'pending' && bo !== '';
        if (aResolved !== bResolved) return bResolved ? b : a;
        const ad = String((a as any).resolvedAt ?? (a as any).date ?? '');
        const bd = String((b as any).resolvedAt ?? (b as any).date ?? '');
        return bd.localeCompare(ad, undefined, { numeric: true }) > 0 ? b : a;
    };

    try {
        const targetArr = readExecutorDecisionsArray(targetId);
        const byId = new Map<string, Record<string, unknown>>();
        for (const r of targetArr) {
            const id = String((r as any)?.id ?? '').trim();
            if (!id) continue;
            byId.set(id, r);
        }

        let touched = false;
        for (const srcId of sources) {
            const srcArr = readExecutorDecisionsArray(srcId);
            if (srcArr.length === 0) continue;
            for (const r of srcArr) {
                const id = String((r as any)?.id ?? '').trim();
                if (!id) continue;
                const prev = byId.get(id);
                if (!prev) {
                    byId.set(id, r);
                    touched = true;
                } else {
                    const next = pickBest(prev, r);
                    if (next !== prev) {
                        byId.set(id, next);
                        touched = true;
                    }
                }
            }
        }

        if (!touched) {
            return { merged: false, countBefore, countAfter: countBefore };
        }

        const mergedArr = Array.from(byId.values());
        mergedArr.sort((a, b) => {
            const ad = String((a as any).resolvedAt ?? (a as any).date ?? '');
            const bd = String((b as any).resolvedAt ?? (b as any).date ?? '');
            return bd.localeCompare(ad, undefined, { numeric: true });
        });
        persistExecutorDecisionsArray(targetId, mergedArr);
        return { merged: true, countBefore, countAfter: mergedArr.length };
    } catch {
        return { merged: false, countBefore, countAfter: countBefore };
    }
}

/** أرشفة صفوف دورة عرض الإضبارة + قرار القاضي عند إغلاق الدورة */
export function archiveExecutiveDetentionCycleDecisions(input: {
    executionId: string | undefined;
    debtorKey?: string;
    primaryDebtorKey?: string;
}): void {
    const executionId = input.executionId;
    if (!executionId) return;
    const normalizeDebtorKey = (v: unknown): string => String(v ?? '').trim();
    const targetDebtorKey = normalizeDebtorKey(input.debtorKey);
    const primaryDebtorKey = normalizeDebtorKey(input.primaryDebtorKey);
    const rowMatchesDebtorScope = (row: Record<string, unknown>): boolean => {
        if (!targetDebtorKey) return true;
        const rowDebtorKey = normalizeDebtorKey(
            (row as { personalCoerciveDebtorKey?: string }).personalCoerciveDebtorKey
        );
        if (rowDebtorKey) return rowDebtorKey === targetDebtorKey;
        return Boolean(primaryDebtorKey) && targetDebtorKey === primaryDebtorKey;
    };
    try {
        const arr = readActiveExecutorDecisionsForMutate(executionId);
        const now = new Date().toISOString();
        const next = arr.map((row) => {
            if (String(row.requestKind || '') !== 'personal_coercive') return row;
            if (!rowMatchesDebtorScope(row)) return row;
            const sub = String(row.personalCoerciveSubtype || '');
            if (
                !isExecutiveDossierPresentationSubtype(sub) &&
                sub !== 'executive_detention_judge'
            ) {
                return row;
            }
            if (isExecutorHubRowSuperseded(row)) return row;
            return {
                ...row,
                requestCycleSuperseded: true,
                requestCycleSupersededAt: now,
                isArchived: true,
            };
        });
        persistExecutorDecisionsArray(executionId, next);
    } catch {
        /* ignore */
    }
}

/** إغلاق دورة طلب تنفيذ جبري شخصي في مركز القرارات (أرشفة + استبدال) */
export function closePersonalCoerciveSubtypeDecisionCycle(input: {
    executionId: string | undefined;
    subtype: PersonalCoerciveSubtype;
    debtorKey?: string;
    primaryDebtorKey?: string;
}): void {
    const executionId = input.executionId;
    if (!executionId) return;
    const matches = buildPersonalCoerciveSubtypeMatcher(input);
    try {
        let arr = readActiveExecutorDecisionsForMutate(executionId);
        arr = supersedePriorExecutorHubRows(arr, matches);
        persistExecutorDecisionsArray(input.executionId, arr);
    } catch {
        /* ignore */
    }
}

/** إغلاق صفوف طلب الكفيل عند استبدال/فك الكفالة — يفتح دورة طلب جديدة في المحضر */
export function supersedeGuarantorRequestDecisionsForExecution(executionId: string | undefined): number {
    try {
        const arr = readActiveExecutorDecisionsForMutate(executionId);
        const now = new Date().toISOString();
        let count = 0;
        const next = arr.map((row) => {
            if (!isGuarantorRequestDecisionRow(row)) return row;
            if (isExecutorHubRowSuperseded(row)) return row;
            count += 1;
            return {
                ...row,
                requestCycleSuperseded: true,
                requestCycleSupersededAt: now,
                isArchived: true,
            };
        });
        if (count === 0) return 0;
        persistExecutorDecisionsArray(executionId, next);
        return count;
    } catch {
        return 0;
    }
}

/** أرشفة صفوف hub المرفوضة نهائياً قبل إرسال طلب إزالة تجاوز جديد لنفس الفرع */
export function supersedeEncroachmentRejectedHubRowsBeforeNewRequest(
    arr: Record<string, unknown>[],
    encroachmentWorkflowKey: string
): Record<string, unknown>[] {
    const key = String(encroachmentWorkflowKey || '').trim();
    if (!key) return arr;
    const matchInput = { encroachmentWorkflowKey: key };
    return supersedeRejectedFinalExecutorHubRows(arr, (row) => {
        if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
            return false;
        }
        if (!isEvictionProcedureHubRow(row)) return false;
        return evictionProcedureRowsMatch(row, matchInput);
    });
}

/**
 * دمج موافقة الكفيل من تخزين القرارات إلى ملف التنفيذ — يُستدعى من ExecutionDashboard.
 */
export function computeGuarantorApprovalMergePatch(
    decisionsStorageExecutionId: string | undefined,
    executionData: unknown,
): Record<string, unknown> {
    const execId = String(decisionsStorageExecutionId ?? '').trim();
    const data = executionData as Record<string, unknown> | null | undefined;
    if (!execId || !data) return {};

    const gf = data.guarantor_followup as Record<string, unknown> | undefined;
    if (gf?.executor_approved === true) return {};

    const decisions = readExecutorDecisionsArray(execId);
    const approvedRow = decisions.find((row) => {
        if (!isGuarantorRequestDecisionRow(row as Record<string, unknown>)) return false;
        const outcome = String((row as { executorOutcome?: string }).executorOutcome || '');
        return outcome === 'approved' || outcome === 'alternative';
    });
    if (!approvedRow) return {};

    const prevGf = gf;
    const merge: Record<string, unknown> = {
        hasGuarantor: true,
        guarantor_followup: {
            executor_approved: true,
            channel: 'financial',
            details_saved: prevGf?.details_saved === true,
            guarantee_type: prevGf?.guarantee_type ?? 'amount',
            guarantor_name: prevGf?.guarantor_name,
            guarantor_workplace: prevGf?.guarantor_workplace,
            guarantor_salary_iqd: prevGf?.guarantor_salary_iqd ?? null,
            guarantor_deduction_iqd: prevGf?.guarantor_deduction_iqd ?? null,
            creditor_notation_registered: prevGf?.creditor_notation_registered === true,
        },
    };

    const debtors = data.debtors;
    if (Array.isArray(debtors) && debtors.length > 0 && debtors[0]) {
        merge.debtors = [{ ...(debtors[0] as object), hasGuarantor: true }, ...debtors.slice(1)];
    }
    const creditors = data.creditors;
    if (Array.isArray(creditors) && creditors.length > 0 && creditors[0]) {
        merge.creditors = [
            { ...(creditors[0] as object), guarantorExecutionNotation: true },
            ...creditors.slice(1),
        ];
    }
    return merge;
}
