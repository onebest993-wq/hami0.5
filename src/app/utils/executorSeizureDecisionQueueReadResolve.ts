/**
 * Resolve / heir / eviction-gate helpers for the executor seizure decision queue.
 */

import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import { parseCreditorPartyDeathPayload } from '@/app/utils/creditorPartyDeathPersistence';
import {
    isExecutorDecisionsStorageKey,
    readExecutorDecisionsUnionAcrossCandidateIds,
} from '@/app/utils/executionDecisionsNamespace';
import { resolveExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isStorageKeyVisibleToCurrentUser } from '@/app/utils/executionDeviceStorageScope';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';
import {
    type CreditorHeirSubstitutionRequestStatus,
    type DebtorHeirSubstitutionRequestStatus,
    type PersonalCoerciveSubtype,
    isDebtorHeirSubstitutionDecisionRow,
    isEvictionProcedureRowPending,
    latestExecutorDecisionRow,
    readActiveExecutorDecisionsForMutate,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import {
    getGoverningEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForMatch,
    getGoverningEvictionProcedureRowForNewRequest,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getNewestEvictionProcedureRowForBranch,
    getNewestEvictionProcedureRowForMatch,
    isEvictionProcedureRowActive,
    isExecutorHubRowInactiveForGoverning,
    isPersonalCoerciveSubtypeRowPending,
} from '@/app/utils/executorSeizureDecisionQueueReadGoverning';

export function getExecutorDecisionRowById(
    executionId: string | undefined,
    decisionId: string
): Record<string, unknown> | null {
    const id = String(decisionId || '').trim();
    if (!id) return null;
    const rows = readExecutorDecisionsArray(executionId);
    const found = rows.find((r) => String(r.id) === id);
    return found ?? null;
}

/** يبحث عن صف القرار في المفتاح المفضّل ثم بقية مفاتيح execution_*_decisions */
export function resolveExecutorDecisionRowContext(
    executionId: string | undefined,
    decisionId: string
): { row: Record<string, unknown>; storageExecutionId: string } | null {
    const id = String(decisionId || '').trim();
    if (!id) return null;
    const preferred = String(executionId ?? '').trim();
    if (preferred) {
        const row = getExecutorDecisionRowById(preferred, id);
        if (row) return { row, storageExecutionId: preferred };
    }
    try {
        const keys = SecureStoreService.listKeysSync();
        for (const k of keys) {
            const key = String(k || '').trim();
            if (!isExecutorDecisionsStorageKey(key)) continue;
            if (!isStorageKeyVisibleToCurrentUser(key)) continue;
            let storageExecutionId = '';
            if (key.includes('_decisions_ns_')) {
                const base = key.slice('execution_'.length);
                storageExecutionId = base.split('_decisions_ns_')[0] || '';
            } else if (key.endsWith('_decisions')) {
                storageExecutionId = key.slice('execution_'.length, -'_decisions'.length);
            }
            if (!storageExecutionId || storageExecutionId === preferred) continue;
            const row = getExecutorDecisionRowById(storageExecutionId, id);
            if (row) return { row, storageExecutionId };
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function findLatestHeirSubstitutionDecisionNeedingEntry(
    executionId: string | undefined,
    party: 'creditor' | 'debtor'
): string | null {
    try {
        const arr = readActiveExecutorDecisionsForMutate(executionId);
        const list = arr.filter((row) => {
            const kind = String(row.requestKind || '');
            if (party === 'creditor') {
                if (kind !== 'creditor_party_death') return false;
                const out = String(row.executorOutcome || '');
                if (out !== 'approved' && out !== 'alternative') return false;
                const completed = String((row as any).heirSubstitutionCompletedAt || '').trim();
                if (completed) return false;
                const rawJson = String(row.creditorPartyDeathPayloadJson || '').trim() || String(row.body || '');
                const p = parseCreditorPartyDeathPayload(rawJson);
                return Boolean(p && p.action === 'heir_substitution');
            }
            if (kind !== 'debtor_party_death') return false;
            if (!isDebtorHeirSubstitutionDecisionRow(row)) return false;
            const out = String(row.executorOutcome || '');
            if (out !== 'approved' && out !== 'alternative') return false;
            const completed = String((row as any).heirSubstitutionCompletedAt || '').trim();
            if (completed) return false;
            return true;
        });
        if (list.length === 0) return null;
        const first = list[0];
        if (!first) return null;
        const best = list.reduce((acc, cur) => {
            if (!acc) return cur;
            const a = String((acc as any).resolvedAt || acc.date || '');
            const b = String((cur as any).resolvedAt || cur.date || '');
            return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
        }, first);
        const id = String(best.id || '').trim();
        return id || null;
    } catch {
        return null;
    }
}

/** طلب «إبلاغ وفاة فقط» قيد البت — يُستخدم لإخفاء واجهة الإبلاغ الأولى في المودال ولتسمية القائمة */
export function hasPendingCreditorDeathOnlyReport(executionId: string | undefined): boolean {
    const arr = readExecutorDecisionsArray(executionId);
    return arr.some((x) => {
        const kind = String((x as { requestKind?: string }).requestKind || '');
        const o = (x as { executorOutcome?: string }).executorOutcome;
        if (kind !== 'creditor_party_death') return false;
        if (o !== 'pending' && o !== undefined) return false;
        const pj = String((x as { creditorPartyDeathPayloadJson?: string }).creditorPartyDeathPayloadJson || '');
        const body = String((x as { body?: string }).body || '');
        const raw = pj.trim() ? pj : body;
        const p = parseCreditorPartyDeathPayload(raw);
        return p?.action === 'death_only';
    });
}

/** يوجد طلب دائن (وفاة / مورث) قيد البت لدى المنفذ */
export function hasPendingCreditorPartyDeathRequest(executionId: string | undefined): boolean {
    const arr = readExecutorDecisionsArray(executionId);
    return arr.some((x) => {
        const kind = String((x as { requestKind?: string }).requestKind || '');
        const o = String((x as { executorOutcome?: string }).executorOutcome || 'pending');
        return kind === 'creditor_party_death' && (o === 'pending' || o === undefined);
    });
}

/** حالة آخر طلب «إحلال ورثة الدائن» — يُستخدم لإظهار حاوية الأسماء بعد الموافقة فقط. */
export function getCreditorHeirSubstitutionRequestStatus(
    executionId: string | undefined
): CreditorHeirSubstitutionRequestStatus {
    const rows = readExecutorDecisionsArray(executionId);
    const matches = rows.filter((x) => {
        const kind = String((x as { requestKind?: string }).requestKind || '');
        if (kind !== 'creditor_party_death') return false;
        const raw =
            String((x as { creditorPartyDeathPayloadJson?: string }).creditorPartyDeathPayloadJson || '').trim() ||
            String((x as { body?: string }).body || '');
        const p = parseCreditorPartyDeathPayload(raw);
        return p?.action === 'heir_substitution';
    });
    if (matches.length === 0) return 'none';
    const last = latestExecutorDecisionRow(matches);
    if (!last) return 'none';
    const o = (last as { executorOutcome?: string }).executorOutcome;
    if (o === undefined || o === 'pending') return 'pending';
    if (o === 'alternative') return 'alternative';
    if (isExecutorRowEffectivelyApproved(last)) return 'approved';
    if (isExecutorRowRejectedAndFinal(last)) return 'rejected';
    return 'none';
}

/** حالة آخر طلب «إحلال ورثة المدين» — لواجهة المودال. */
export function getDebtorHeirSubstitutionRequestStatus(
    executionId: string | undefined
): DebtorHeirSubstitutionRequestStatus {
    const rows = readExecutorDecisionsArray(executionId);
    const matches = rows.filter((x) => isDebtorHeirSubstitutionDecisionRow(x as Record<string, unknown>));
    if (matches.length === 0) return 'none';
    const last = latestExecutorDecisionRow(matches);
    if (!last) return 'none';
    const o = (last as { executorOutcome?: string }).executorOutcome;
    if (o === undefined || o === 'pending') return 'pending';
    if (o === 'alternative') return 'alternative';
    if (isExecutorRowEffectivelyApproved(last)) return 'approved';
    if (isExecutorRowRejectedAndFinal(last)) return 'rejected';
    return 'none';
}

/**
 * موافقة منفذ على «تحديد موعد الخروج الميداني» دون تسمية مجدول بعد —
 * لإعادة فتح نافذة الموعد من تبويب الإجراءات دون إعادة تقديم الطلب.
 */
export function findApprovedFieldVisitNeedingSchedule(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): { decisionId: string; requestTitle: string } | null {
    const rows = executionData
        ? readExecutorDecisionsUnionAcrossCandidateIds(executionId, executionData)
        : readExecutorDecisionsArray(executionId);
    for (const r of rows) {
        if (String((r as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') continue;
        if (!isExecutorRowApprovedWorkflowActive(r as Record<string, unknown>, rows)) continue;
        if (String((r as { executorScheduleLabel?: string }).executorScheduleLabel || '').trim() !== '')
            continue;
        const title = String((r as { title?: string }).title || '');
        const wfKey = (r as { evictionWorkflowKey?: EvictionExecutorWorkflowKey }).evictionWorkflowKey;
        const branch = inferExecutorApprovalDecisionType({
            title,
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: wfKey,
        });
        if (branch !== 'Field Visit Date') continue;
        const decisionId = String((r as { id?: string }).id || '').trim();
        if (!decisionId) continue;
        return { decisionId, requestTitle: title };
    }
    return null;
}

/**
 * موافقة على كسر الأقفال والجرد دون إكمال حقل الجرد في الملاحظات بعد —
 * لإعادة فتح النافذة من تبويب الإجراءات دون إعادة تقديم الطلب.
 */
export function findApprovedBreakInventoryNeedingLedger(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): { decisionId: string; requestTitle: string } | null {
    const rows = executionData
        ? readExecutorDecisionsUnionAcrossCandidateIds(executionId, executionData)
        : readExecutorDecisionsArray(executionId);
    for (const r of rows) {
        if (String((r as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') continue;
        if (!isExecutorRowApprovedWorkflowActive(r as Record<string, unknown>, rows)) continue;
        const finalizedAt = String(
            (r as { breakInventoryFurnitureFinalizedAt?: string }).breakInventoryFurnitureFinalizedAt || ''
        ).trim();
        if (finalizedAt !== '') continue;
        const title = String((r as { title?: string }).title || '');
        const wfKey = (r as { evictionWorkflowKey?: EvictionExecutorWorkflowKey }).evictionWorkflowKey;
        const branch = inferExecutorApprovalDecisionType({
            title,
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: wfKey,
        });
        if (branch !== 'Lock Breaking & Inventory') continue;
        const decisionId = String((r as { id?: string }).id || '').trim();
        if (!decisionId) continue;
        return { decisionId, requestTitle: title };
    }
    return null;
}

/** موافقة على تنصيب حارس دون حفظ الاسم والراتب — إعادة فتح النافذة دون طلب جديد */
export function findApprovedCustodianNeedingDetails(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): { decisionId: string; requestTitle: string } | null {
    const rows = executionData
        ? readExecutorDecisionsUnionAcrossCandidateIds(executionId, executionData)
        : readExecutorDecisionsArray(executionId);
    const snap = executionData as {
        eviction_judicial_custodians?: Array<{ fullName?: string; decisionId?: string }>;
        eviction_judicial_custodian?: { fullName?: string; decisionId?: string } | null;
    } | null;
    const dossierCustodians = (() => {
        const arr = Array.isArray(snap?.eviction_judicial_custodians)
            ? snap!.eviction_judicial_custodians!
            : [];
        const list = arr
            .filter((c) => String(c?.fullName || '').trim())
            .map((c) => ({
                fullName: String(c.fullName || '').trim(),
                decisionId: String(c.decisionId || '').trim(),
            }));
        const legacy = snap?.eviction_judicial_custodian;
        if (legacy?.fullName && !list.length) {
            list.push({
                fullName: String(legacy.fullName).trim(),
                decisionId: String(legacy.decisionId || '').trim(),
            });
        }
        return list;
    })();
    for (const r of rows) {
        if (String((r as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') continue;
        if (!isExecutorRowApprovedWorkflowActive(r as Record<string, unknown>, rows)) continue;
        const savedAt = String(
            (r as { judicialCustodianDetailsSavedAt?: string }).judicialCustodianDetailsSavedAt || ''
        ).trim();
        if (savedAt !== '') continue;
        const title = String((r as { title?: string }).title || '');
        const wfKey = (r as { evictionWorkflowKey?: EvictionExecutorWorkflowKey }).evictionWorkflowKey;
        const branch = inferExecutorApprovalDecisionType({
            title,
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: wfKey,
        });
        if (branch !== 'Judicial Custodian') continue;
        const decisionId = String((r as { id?: string }).id || '').trim();
        if (!decisionId) continue;
        const dossierHit = dossierCustodians.some(
            (c) => c.decisionId === decisionId && c.fullName,
        );
        if (dossierHit) continue;
        return { decisionId, requestTitle: title };
    }
    return null;
}

export function resolvePersonalCoerciveDecisionsNavFromDecisions(
    allDecisions: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): { decisionsTab: 'current' | 'previous'; decisionId?: string } {
    const row = getGoverningPersonalCoerciveSubtypeRowFromDecisions(allDecisions, subtype, opts);
    const decisionId = row ? String((row as { id?: string }).id || '').trim() : '';
    if (!row || !decisionId) return { decisionsTab: 'current' };
    if (isPersonalCoerciveSubtypeRowPending(row)) {
        return { decisionsTab: 'current', decisionId };
    }
    return { decisionsTab: 'previous', decisionId };
}

export function resolvePersonalCoerciveDecisionsNav(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): { decisionsTab: 'current' | 'previous'; decisionId?: string } {
    return resolvePersonalCoerciveDecisionsNavFromDecisions(
        readExecutorDecisionsArray(executionId),
        subtype,
        opts,
    );
}

export function hasBlockingEvictionProcedureDuplicate(
    executionId: string | undefined,
    input: { evictionWorkflowKey?: string; title?: string },
    executionData?: Record<string, unknown> | null
): boolean {
    const data = resolveExecutionDataForDomainGate(executionId, executionData);
    const canonical = resolveDecisionsStorageExecutionId(executionId, data);
    const allRows =
        canonical !== 'default'
            ? readExecutorDecisionsUnionAcrossCandidateIds(canonical, data)
            : readExecutorDecisionsArray(executionId, data);
    const gateInput = evictionBranchGateInput(input);
    const governing = getGoverningEvictionProcedureRowForNewRequest(allRows, input);
    if (
        governing?.id &&
        !isExecutorHubRowInactiveForGoverning(governing, allRows) &&
        isEvictionProcedureRowPending(governing) &&
        isEvictionProcedureRowActive(governing, allRows)
    ) {
        return true;
    }
    if (isEvictionBranchBlockingNewRequest(allRows, gateInput)) {
        return true;
    }
    return isEvictionBranchResendBlocked(allRows, gateInput);
}


export function evictionBranchGateInput(input: {
    evictionWorkflowKey?: string;
    title?: string;
}): { evictionWorkflowKey?: string; title?: string; branch?: string } {
    const wf = String(input.evictionWorkflowKey || '').trim();
    const title = String(input.title || '').trim();
    const branch = wf
        ? inferExecutorApprovalDecisionType({
              title,
              requestKind: 'eviction_procedure',
              evictionWorkflowKey: wf as EvictionExecutorWorkflowKey,
          })
        : undefined;
    return {
        ...(wf ? { evictionWorkflowKey: wf } : {}),
        ...(title ? { title } : {}),
        ...(branch && branch !== 'other' ? { branch } : {}),
    };
}

/** هل يُحجز فرع التخلية عن طلب جديد؟ يُقيَّم أحدث صف hub فقط — الرفض النهائي أو إعادة الدورة لا تحجز. */
export function isEvictionBranchBlockingNewRequest(
    all: Record<string, unknown>[],
    input: { evictionWorkflowKey?: string; title?: string; branch?: string }
): boolean {
    const newest =
        input.branch != null && String(input.branch).trim()
            ? getNewestEvictionProcedureRowForBranch(all, String(input.branch).trim())
            : getNewestEvictionProcedureRowForMatch(all, input);
    if (!newest || isExecutorHubRowInactiveForGoverning(newest, all)) return false;
    return isEvictionProcedureRowActive(newest, all);
}

/** هل يوجد طلب hub قائم يمنع إرسالاً جديداً؟ — بعد اكتمال الإجراء تُعاد دورة الحياة. */
export function isEvictionBranchResendBlocked(
    all: Record<string, unknown>[],
    input: { evictionWorkflowKey?: string; encroachmentWorkflowKey?: string; title?: string; branch?: string }
): boolean {
    const governing =
        input.branch != null && String(input.branch).trim()
            ? getGoverningEvictionProcedureRowForBranch(all, String(input.branch).trim())
            : getGoverningEvictionProcedureRowForMatch(all, input);
    if (!governing?.id || isExecutorHubRowInactiveForGoverning(governing, all)) return false;
    if (isExecutorRequestAppealCycleSupersededFromRecord(governing, all)) return false;
    return isEvictionProcedureRowActive(governing, all);
}
