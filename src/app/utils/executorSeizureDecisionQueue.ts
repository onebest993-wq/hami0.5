// @ts-nocheck
/**
 * عند تقديم طلب حجز (راتب / عقار / مال منقول) يُسجَّل مسودة قرار قيد البت
 * في تخزين «القرارات والطعون» ليُكمِل المحامي بقرار منفذ العدل لاحقاً.
 */

import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
    stringifyCreditorPartyDeathPayload,
    type CreditorPartyDeathStoredAction,
} from '@/app/utils/creditorPartyDeathPersistence';
import {
    isExecutorDecisionsStorageKey,
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';
import {
    dispatchDomainIsolationBlocked,
    gateExecutorRequestPersist,
} from '@/app/utils/executionDomainIsolation';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    isCassationAffirmResult,
    isExecutorRequestAppealCycleSupersededFromRecord,
    isExecutorRequestFollowupBlockedFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';

export const DECISIONS_RELOAD_EVENT = 'hami-decisions-reload';

const RELOAD_EVENT = DECISIONS_RELOAD_EVENT;

function newExecutorDecisionId(prefix: string): string {
    const c = (globalThis as any).crypto as { randomUUID?: () => string } | undefined;
    const uuid = c?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** قراءة آمنة لمصفوفة القرارات من JSON — لا ترمي؛ تُرجع [] إن لم يكن المصفوفة */
function parseStoredDecisionsArray(raw: string | null): unknown[] {
    if (!raw) return [];
    try {
        const v = JSON.parse(raw) as unknown;
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

export function dispatchDecisionsReload(): void {
    try {
        window.dispatchEvent(new CustomEvent(RELOAD_EVENT));
    } catch {
        /* ignore */
    }
}

function persistExecutorDecisionsArray(
    executionId: string | undefined,
    arr: Record<string, unknown>[]
): void {
    writeExecutorDecisionsArray(executionId, arr);
    dispatchDecisionsReload();
}

/** حقول افتراضية لصفوف مركز القرارات (فرز التبويبات + مرحلة الطعن) */
export function executorDecisionRowHubDefaults(): { status: 'pending'; appealPhase: null } {
    return { status: 'pending', appealPhase: null };
}

export type PersonalCoerciveSubtype =
    | 'forced_bring_in'
    | 'arrest_warrant_investigation'
    /** مفاتحة ضمن مسار تكليف الحضور (موظف/كاسب) — منفصل عن طلب المفاتحة العام في محضر المتابعة */
    | 'employee_assignment_investigation'
    | 'travel_ban'
    /** @deprecated — استخدم executive_dossier_presentation؛ يُبقى للطلبات القديمة */
    | 'executive_detention'
    /** طلب عرض الإضبارة على قاضي البداءة — قرار المنفذ فقط */
    | 'executive_dossier_presentation'
    /** قرار قاضي البداءة بالحبس — منفصل عن طلب عرض الإضبارة لدى المنفذ */
    | 'executive_detention_judge'
    | 'release_debtor';

export const EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES: readonly PersonalCoerciveSubtype[] = [
    'executive_dossier_presentation',
    'executive_detention',
] as const;

export function isExecutiveDossierPresentationSubtype(
    subtype: string | null | undefined
): subtype is PersonalCoerciveSubtype {
    return EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES.includes(
        String(subtype || '').trim() as PersonalCoerciveSubtype
    );
}

export type SeizureRequestSubtype =
    | 'movable'
    | 'movable_auction'
    | 'property'
    | 'salary'
    | 'notice'
    | 'third_party';

export type SeizureRequestTarget = 'debtor' | 'guarantor';

export function readSeizureRequestTarget(row: Record<string, unknown> | null | undefined): SeizureRequestTarget {
    if (!row) return 'debtor';
    const direct = String((row as { seizureTarget?: string }).seizureTarget || '').trim();
    if (direct === 'guarantor' || direct === 'debtor') return direct;
    const rawJson = String((row as { seizurePayloadJson?: string }).seizurePayloadJson || '').trim();
    if (rawJson) {
        try {
            const v = JSON.parse(rawJson) as { seizureTarget?: string };
            if (v?.seizureTarget === 'guarantor') return 'guarantor';
            if (v?.seizureTarget === 'debtor') return 'debtor';
        } catch {
            /* ignore */
        }
    }
    const text = `${String((row as { title?: string }).title || '')}\n${String((row as { body?: string }).body || '')}`;
    if (/الكفيل|كفيل|الضامن/i.test(text) && /حجز/i.test(text)) return 'guarantor';
    return 'debtor';
}

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

function buildSeizureSubtypeMatcher(subtype: SeizureRequestSubtype): (row: Record<string, unknown>) => boolean {
    const st = String(subtype || '').trim();
    return (row) =>
        String((row as { requestKind?: string }).requestKind || '') === 'seizure' &&
        String((row as { seizureSubtype?: string }).seizureSubtype || '').trim() === st;
}

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

/** إغلاق دورة طلب حجز في مركز القرارات — يعيد إمكانية تقديم طلب جديد */
export function closeSeizureSubtypeDecisionCycle(input: {
    executionId: string | undefined;
    subtype: SeizureRequestSubtype;
}): void {
    const executionId = input.executionId;
    if (!executionId) return;
    const matches = buildSeizureSubtypeMatcher(input.subtype);
    try {
        let arr = readExecutorDecisionsArray(executionId);
        arr = supersedePriorExecutorHubRows(arr, matches);
        persistExecutorDecisionsArray(executionId, arr);
    } catch {
        /* ignore */
    }
}

/** طلب خاص من تبويب «الطلبات الخاصة» في محضر المتابعة — بانتظار موافقة أو رفض الطلب من المنفذ */
function assertDomainGate(
    executionId: string | undefined,
    requestKind: string,
    meta?: { personalCoerciveSubtype?: string }
): boolean {
    const gate = gateExecutorRequestPersist(executionId, requestKind, meta);
    if (!gate.allowed) {
        dispatchDomainIsolationBlocked(gate.reasonAr || 'الطلب غير مسموح في هذا المسار', requestKind);
        return false;
    }
    return true;
}

export function appendSpecialFollowupRequest(input: {
    executionId: string | undefined;
    requestDate: string;
    content: string;
    /** طلبات «تحركات الطرف الآخر» تُحسب لصالح المدين في مسار الطعن */
    appealRequestOrigin?: 'creditor_side' | 'debtor_side' | 'executor_side';
    /** عنوان صف مركز القرارات (افتراضي: طلب تنفيذي خاص) */
    decisionTitle?: string;
    /** حمولة منظمة لطلبات خاصة (مثل التوحيد) */
    payloadJson?: string;
}): string | null {
    if (!assertDomainGate(input.executionId, 'special_followup')) {
        return null;
    }
    const trimmed = input.content.trim();
    const body = `بتاريخ ${input.requestDate}:\n\n${trimmed}`;
    const rowId = newExecutorDecisionId('special_followup');
    try {
        const arr = readExecutorDecisionsArray(input.executionId);
        const titleTrim = String(input.decisionTitle ?? '').trim();
        const resolvedTitle = titleTrim || 'طلب تنفيذي خاص';
        const dupPending = arr.some((r) => {
            const pending = (r as any).executorOutcome === 'pending' || (r as any).executorOutcome === undefined;
            if (!pending) return false;
            if (String((r as any).requestKind || '') !== 'special_followup') return false;
            const t = String((r as any).title || '').trim();
            const b = String((r as any).body || '').trim();
            const p = String((r as any).payloadJson || '').trim();
            return t === resolvedTitle && b === body && p === String(input.payloadJson || '').trim();
        });
        if (dupPending) {
            dispatchDecisionsReload();
            return null;
        }
        const row = {
            id: rowId,
            title: resolvedTitle,
            body,
            date: input.requestDate,
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            ...(String(input.payloadJson || '').trim() ? { payloadJson: String(input.payloadJson).trim() } : {}),
            ...(input.appealRequestOrigin ? { appealRequestOrigin: input.appealRequestOrigin } : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return rowId;
    } catch {
        return null;
    }
}

/** طلب كفيل ضامن من محضر المتابعة — يُعرَض على منفذ العدل للبتّ */
export function appendGuarantorFollowupRequest(input: {
    executionId: string | undefined;
    /** @deprecated يُتجاهل في النص المعروض؛ يُحفَظ التوافق مع الاستدعاءات القديمة */
    debtorName?: string;
}): { ok: boolean; decisionId?: string } {
    if (!assertDomainGate(input.executionId, 'guarantor_request')) {
        return { ok: false };
    }
    try {
        const arr = readExecutorDecisionsArray(input.executionId);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some((x) => isPending(x) && isGuarantorRequestDecisionRow(x));
        if (dup) {
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('guarantor_req');
        const row = {
            id: decisionId,
            title: 'طلب إدخال كفيل ضامن',
            body: 'قدم المدين طلباً لإدخال كفيل ضامن في الإضبارة.',
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'guarantor_request' as const,
            /** طلب من مسار المدين — الطعن يُنسَب للمدين عند الرفض وللمحامي عند القبول */
            appealRequestOrigin: 'debtor_side' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

/** طلب صرف الأمانات التنفيذية من محضر المتابعة — يُعرَض على منفذ العدل للبتّ */
export function appendTrustDisburseRequest(input: {
    executionId: string | undefined;
}): { ok: boolean; decisionId?: string } {
    if (!assertDomainGate(input.executionId, 'trust_disburse')) {
        return { ok: false };
    }
    try {
        const arr = readExecutorDecisionsArray(input.executionId);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some((x) => isPending(x) && x.requestKind === 'trust_disburse');
        if (dup) {
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('trust_disburse');
        const row = {
            id: decisionId,
            title: 'طلب صرف الأمانات التنفيذية',
            body: 'طلب صرف مبلغ من رصيد الأمانات التنفيذية وفقاً للإجراءات القانونية، مع بيان المبلغ وجهة الصرف وإرفاق السند عند اللزوم.',
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'trust_disburse' as const,
            appealRequestOrigin: 'creditor_side' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export function appendThirdPartyFundsReceivedDecision(input: {
    executionId: string | undefined;
    thirdPartySeizureId: string;
    thirdPartyName: string;
    transferredAmountIqd: number;
}): { ok: boolean; decisionId?: string } {
    const seizureId = String(input.thirdPartySeizureId || '').trim();
    if (!seizureId) return { ok: false };
    const amt = Math.max(0, Math.trunc(Number(input.transferredAmountIqd || 0)));
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false };
    if (!assertDomainGate(input.executionId, 'third_party_funds_received')) {
        return { ok: false };
    }
    try {
        const arr = readExecutorDecisionsArray(input.executionId);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some((x) => {
            if (!isPending(x)) return false;
            if (String(x.requestKind || '') !== 'third_party_funds_received') return false;
            const p = String((x as any).payloadJson || '').trim();
            if (!p) return false;
            try {
                const v = JSON.parse(p) as any;
                return String(v?.thirdPartySeizureId || '').trim() === seizureId;
            } catch {
                return false;
            }
        });
        if (dup) {
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('third_party_funds_received');
        const thirdPartyName = String(input.thirdPartyName || '').trim() || 'جهة ثالثة';
        const row = {
            id: decisionId,
            title: 'طلب تثبيت استلام وتحويل أموال محجوزة لدى الغير',
            body: `طلب تثبيت استلام مبلغ محجوز لدى الغير وتحويله إلى الإضبارة.\nالجهة: ${thirdPartyName}\nالمبلغ: ${amt.toLocaleString(
                'ar-IQ'
            )} د.ع.`,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'third_party_funds_received' as const,
            payloadJson: JSON.stringify({
                thirdPartySeizureId: seizureId,
                thirdPartyName,
                transferredAmountIqd: amt,
            }),
            appealRequestOrigin: 'creditor_side' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export function appendPersonalCoerciveExecutorRequest(input: {
    executionId: string | undefined;
    subtype: PersonalCoerciveSubtype;
    title: string;
    body: string;
    /** ذمة مقسومة: مفتاح المدين المستهدف (اختياري للتوافق مع الطلبات القديمة) */
    debtorKey?: string;
    /** مفتاح المدين الأساسي (لتفسير الطلبات القديمة غير المقيّدة بمفتاح) */
    primaryDebtorKey?: string;
    encryptedPayloadJson?: string;
}): { ok: boolean; decisionId?: string } {
    if (
        !assertDomainGate(input.executionId, 'personal_coercive', {
            personalCoerciveSubtype: input.subtype,
        })
    ) {
        return { ok: false };
    }
    const normalizeDebtorKey = (v: unknown): string =>
        String(v ?? '').trim();
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
        let arr = readExecutorDecisionsArray(input.executionId);
        const matchesPersonalCoerciveScope = (x: Record<string, unknown>) => {
            if (String(x.requestKind || '') !== 'personal_coercive') return false;
            if (!rowMatchesDebtorScope(x)) return false;
            const sub = String(x.personalCoerciveSubtype || '');
            if (sub === input.subtype) return true;
            if (
                (input.subtype === 'executive_detention' ||
                    input.subtype === 'executive_dossier_presentation') &&
                (sub === 'executive_detention_judge' ||
                    sub === 'executive_detention' ||
                    sub === 'executive_dossier_presentation')
            ) {
                return (
                    sub === 'executive_detention_judge' ||
                    isExecutiveDossierPresentationSubtype(sub)
                );
            }
            return false;
        };
        arr = supersedePriorExecutorHubRows(arr, matchesPersonalCoerciveScope);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some(
            (x) =>
                isPending(x) &&
                x.requestKind === 'personal_coercive' &&
                x.personalCoerciveSubtype === input.subtype &&
                rowMatchesDebtorScope(x)
        );
        if (dup) {
            const existing = arr.find(
                (x) =>
                    isPending(x) &&
                    x.requestKind === 'personal_coercive' &&
                    x.personalCoerciveSubtype === input.subtype &&
                    rowMatchesDebtorScope(x)
            ) as { id?: string } | undefined;
            const existingId = String(existing?.id ?? '').trim();
            if (existingId) {
                dispatchDecisionsReload();
                return { ok: true, decisionId: existingId };
            }
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('personal_coercive');
        const row = {
            id: decisionId,
            title: input.title,
            body: input.body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'personal_coercive' as const,
            appealRequestOrigin: 'creditor_side' as const,
            personalCoerciveSubtype: input.subtype,
            ...(targetDebtorKey ? { personalCoerciveDebtorKey: targetDebtorKey } : {}),
            ...(String(input.encryptedPayloadJson || '').trim()
                ? { encryptedPayloadJson: input.encryptedPayloadJson }
                : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

/** تسجيل قرار قاضي البداءة بالحبس — صف مستقل عن موافقة المنفذ على عرض الإضبارة */
export function appendExecutiveDetentionJudgeDecision(input: {
    executionId: string | undefined;
    parentExecutorDecisionId: string;
    outcome: 'approved' | 'rejected';
    rejectionReason?: string;
    debtorKey?: string;
}): { ok: boolean; decisionId?: string } {
    const executionId = input.executionId;
    const parentId = String(input.parentExecutorDecisionId || '').trim();
    if (!executionId || !parentId) return { ok: false };

    const normalizeDebtorKey = (v: unknown): string => String(v ?? '').trim();
    const targetDebtorKey = normalizeDebtorKey(input.debtorKey);

    try {
        let arr = readExecutorDecisionsArray(executionId);
        const now = new Date().toISOString();
        arr = arr.map((row) => {
            if (String(row.personalCoerciveSubtype || '') !== 'executive_detention_judge') {
                return row;
            }
            if (
                String((row as { parentExecutorDecisionId?: string }).parentExecutorDecisionId || '') !==
                parentId
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

        const existing = arr.find(
            (row) =>
                String(row.personalCoerciveSubtype || '') === 'executive_detention_judge' &&
                String((row as { parentExecutorDecisionId?: string }).parentExecutorDecisionId || '') ===
                    parentId &&
                !isExecutorHubRowSuperseded(row)
        ) as { id?: string } | undefined;
        if (existing) {
            dispatchDecisionsReload();
            return { ok: true, decisionId: String(existing.id || '').trim() || undefined };
        }

        const today = getLocalTodayYmd();
        const decisionId = newExecutorDecisionId('personal_coercive');
        const outcome = input.outcome;
        const reason = String(input.rejectionReason || '').trim();
        const row = {
            id: decisionId,
            title:
                outcome === 'approved'
                    ? 'قرار قاضي البداءة — الموافقة على حبس المدين'
                    : 'قرار قاضي البداءة — رفض حبس المدين',
            body:
                outcome === 'rejected' && reason
                    ? `سبب الرفض: ${reason}`
                    : outcome === 'approved'
                      ? 'وافق قاضي البداءة على حبس المدين التنفيذي بعد عرض الإضبارة.'
                      : 'رفض قاضي البداءة طلب حبس المدين التنفيذي.',
            date: today,
            resolvedAt: now,
            appealStatus: 'pending' as const,
            executorOutcome: outcome,
            status: outcome === 'approved' ? 'accepted' : 'rejected',
            requestKind: 'personal_coercive' as const,
            personalCoerciveSubtype: 'executive_detention_judge' as const,
            parentExecutorDecisionId: parentId,
            appealRequestOrigin: 'creditor_side' as const,
            appealBaseBranch: outcome === 'approved' ? 'after_approval' : 'after_rejection',
            cassationOnlyAppeal: true,
            executiveDetentionJudgeOutcome: outcome,
            appealPhase: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            noAppealChosen: false,
            ...(targetDebtorKey ? { personalCoerciveDebtorKey: targetDebtorKey } : {}),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

function parseSeizedMovableIdFromPayloadJson(raw: string | undefined): string {
    const rawJson = String(raw || '').trim();
    if (!rawJson) return '';
    try {
        const v = JSON.parse(rawJson) as { seizedMovableId?: string };
        return String(v?.seizedMovableId ?? '').trim();
    } catch {
        return '';
    }
}

export function appendPendingExecutorSeizureDecision(input: {
    executionId: string | undefined;
    requestTitle: string;
    requestBody: string;
    seizureSubtype?: SeizureRequestSubtype;
    seizureTarget?: SeizureRequestTarget;
    seizurePayloadJson?: string;
}): string | null {
    if (!assertDomainGate(input.executionId, 'seizure')) {
        return null;
    }
    const decisionId = newExecutorDecisionId('seizure_req');
    try {
        const targetB = String(input.seizureTarget || 'debtor').trim() as SeizureRequestTarget;
        const subtypeB = String(input.seizureSubtype || '').trim();
        let arr = readExecutorDecisionsArray(input.executionId);
        arr = supersedeRejectedFinalExecutorHubRows(arr, (r) => {
            if (String(r.requestKind || '') !== 'seizure') return false;
            if (readSeizureRequestTarget(r) !== targetB) return false;
            const a = String(r.seizureSubtype || '').trim();
            if (subtypeB && a && a !== subtypeB) return false;
            if (subtypeB && !a) return false;
            const t1 = String(r.title || '').trim();
            const t2 = String(input.requestTitle || '').trim();
            if (subtypeB) return true;
            if (!t1 || !t2) return false;
            return t1 === t2;
        });

        const inputMovableId = parseSeizedMovableIdFromPayloadJson(input.seizurePayloadJson);
        const dup = arr.find((r) => {
            if (isExecutorHubRowInactiveForGoverning(r, arr)) return false;
            if (String(r.requestKind || '') !== 'seizure') return false;
            const out = String((r as any).executorOutcome ?? 'pending');
            if (out !== 'pending') return false;
            if (readSeizureRequestTarget(r) !== targetB) return false;
            const a = String((r as any).seizureSubtype || '').trim();
            const b = String(input.seizureSubtype || '').trim();
            if (b && a && a !== b) return false;
            if (b && !a) return false;
            const rowMovableId = parseSeizedMovableIdFromPayloadJson(
                String((r as any).seizurePayloadJson || '')
            );
            if (inputMovableId && rowMovableId && inputMovableId !== rowMovableId) return false;
            const t1 = String(r.title || '').trim();
            const t2 = String(input.requestTitle || '').trim();
            if (b) {
                if (inputMovableId || rowMovableId) {
                    return Boolean(inputMovableId) && inputMovableId === rowMovableId;
                }
                return true;
            }
            if (!t1 || !t2) return false;
            return t1 === t2;
        });
        if (dup && String((dup as any).id || '').trim()) {
            return null;
        }

        const row = {
            id: decisionId,
            title: input.requestTitle,
            body: input.requestBody,
            ...(String(input.seizurePayloadJson || '').trim()
                ? { seizurePayloadJson: String(input.seizurePayloadJson || '').trim() }
                : {}),
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'seizure' as const,
            appealRequestOrigin: 'creditor_side' as const,
            ...(input.seizureSubtype ? { seizureSubtype: input.seizureSubtype } : {}),
            ...(input.seizureTarget ? { seizureTarget: input.seizureTarget } : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return decisionId;
    } catch {
        return null;
    }
}

export type EvictionRequestKind =
    | 'eviction_procedure'
    | 'lawyer_fee_payout'
    | 'case_expense'
    | 'unified_collection';

export function patchExecutorDecisionRow(
    executionId: string | undefined,
    decisionId: string,
    patch: Record<string, unknown>
): boolean {
    const did = String(decisionId || '').trim();
    if (!did) return false;
    try {
        const arr = readExecutorDecisionsArray(executionId);
        let found = false;
        const next = arr.map((row) => {
            if (String((row as { id?: string }).id ?? '') !== did) return row;
            found = true;
            return { ...row, ...patch };
        });
        if (!found) return false;
        persistExecutorDecisionsArray(executionId, next);
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
    const everywhere = patchExecutorDecisionRowEverywhere(decisionId, patch);
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
    patch: Record<string, unknown>
): { ok: boolean; patchedKeys: number } {
    const did = String(decisionId || '').trim();
    if (!did) return { ok: false, patchedKeys: 0 };
    try {
        const keys = SecureStoreService.listKeysSync();
        let touched = 0;
        for (const k of keys) {
            const key = String(k || '').trim();
            if (!key || !isExecutorDecisionsStorageKey(key)) continue;
            const raw = SecureStoreService.getItemSync(key);
            const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
            if (!arr.length) continue;
            let changed = false;
            const next = arr.map((row) => {
                if (String((row as any)?.id ?? '') !== did) return row;
                changed = true;
                return { ...row, ...patch };
            });
            if (!changed) continue;
            SecureStoreService.setItemSync(key, JSON.stringify(next));
            touched += 1;
        }
        if (touched > 0) dispatchDecisionsReload();
        return { ok: touched > 0, patchedKeys: touched };
    } catch {
        return { ok: false, patchedKeys: 0 };
    }
}

export function findLatestHeirSubstitutionDecisionNeedingEntry(
    executionId: string | undefined,
    party: 'creditor' | 'debtor'
): string | null {
    try {
        const arr = readExecutorDecisionsArray(executionId);
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

/** مسار التوجيه الذكي لآثار قرار المنفذ (مركز القرارات والطعون) */
export type ExecutorDispatcherRoute = 'Notification' | 'BreakLocks' | 'SalaryGarnishment';

/**
 * صف «طلب كفيل» في مركز القرارات — قد يفقد requestKind في بيانات قديمة أو بعد نسخ JSON.
 * بدون هذا لا يُدمَج guarantor_followup في الملف عند الموافقة (يبقى السجل الزمني فقط).
 */
export function isGuarantorRequestDecisionRow(row: Record<string, unknown>): boolean {
    const kind = String(row.requestKind || '');
    if (kind === 'guarantor_request') return true;
    const id = String(row.id || '');
    if (/^guarantor_req_/i.test(id)) return true;
    const title = String(row.title || '');
    if (/طلب إدخال كفيل ضامن|إدخال كفيل ضامن|طلب كفيل/i.test(title)) return true;
    const body = String(row.body || '');
    if (/كفيل ضامن في الإضبارة|طلباً لإدخال كفيل/i.test(body)) return true;
    return false;
}

/** يُحدَّد من الحقل الاختياري dispatcherRoute أو من نوع الطلب والنص (طلبات قديمة). */
export function inferExecutorDispatcherRoute(row: Record<string, unknown>): ExecutorDispatcherRoute | null {
    const explicit = row.dispatcherRoute as string | undefined;
    if (explicit === 'Notification' || explicit === 'BreakLocks' || explicit === 'SalaryGarnishment') {
        return explicit;
    }
    const kind = String(row.requestKind || '');
    const title = String(row.title || '');
    const body = String(row.body || '');
    const blob = `${title} ${body}`;
    if (kind === 'seizure' && /راتب|خُمس|خمس|الراتب|salary|garnish|حجز راتب/i.test(blob)) {
        return 'SalaryGarnishment';
    }
    if (kind === 'eviction_procedure' && /كسر|أقفال|قفل|جرد|أثاث|محرر كسر|كسر أقفال/i.test(blob)) {
        return 'BreakLocks';
    }
    if (
        /تبليغ|إخبار|إخطار|بلاغ تنفيذ|notification|إشعار المدين/i.test(blob) ||
        (kind === 'special_followup' && /تبليغ|إخبار|إخطار/i.test(blob))
    ) {
        return 'Notification';
    }
    return null;
}

function creditorPartyDeathDecisionTitle(action: CreditorPartyDeathStoredAction): string {
    switch (action) {
        case 'death_only':
            return 'طلب — إبلاغ وفاة الدائن';
        case 'no_heirs':
            return 'طلب — وفاة الدائن دون ورثة وإغلاق الإضبارة';
        case 'heir_substitution':
            return 'طلب — إحلال الورثة محل الدائن المتوفى';
        case 'seek_heir':
            return 'طلب — تسجيل وريث بعد مسار دون ورثة';
        default:
            return 'طلب — وفاة الدائن / إحلال الورثة';
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

export type CreditorHeirSubstitutionRequestStatus =
    | 'none'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'alternative';

function latestExecutorDecisionRow(rows: Record<string, unknown>[]): Record<string, unknown> | undefined {
    if (rows.length === 0) return undefined;
    return rows.reduce((acc, cur) => {
        const a = String((acc as any).resolvedAt || (acc as any).date || '');
        const b = String((cur as any).resolvedAt || (cur as any).date || '');
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, rows[0]);
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

/** يُسجَّل في «القرارات والطعون»؛ لا يُحدِّث بطاقة الخصوم إلا بعد موافقة المنفذ */
export function appendCreditorPartyDeathRequest(input: {
    executionId: string | undefined;
    action: CreditorPartyDeathStoredAction;
    creditorNameSnapshot: string;
    heirNames: string[];
}): { ok: boolean; decisionId?: string } {
    if (hasPendingCreditorPartyDeathRequest(input.executionId)) {
        dispatchDecisionsReload();
        return { ok: false };
    }
    const decisionId = newExecutorDecisionId('creditor_death_req');
    try {
        const arr = readExecutorDecisionsArray(input.executionId);
        const storedPayload = {
            action: input.action,
            creditorNameSnapshot: input.creditorNameSnapshot,
            heir_names: input.heirNames.filter((s) => /\S/.test(String(s))),
        };
        const payloadJson = stringifyCreditorPartyDeathPayload(storedPayload);
        const row = {
            id: decisionId,
            title: creditorPartyDeathDecisionTitle(input.action),
            body: formatCreditorPartyDeathSummaryAr(storedPayload),
            creditorPartyDeathPayloadJson: payloadJson,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'creditor_party_death' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export type DebtorHeirSubstitutionRequestStatus =
    | 'none'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'alternative';

function parseDebtorPartyDeathPayload(raw: string): {
    action?: string;
    debtorNameSnapshot?: string;
    heir_names?: string[];
} | null {
    const t = String(raw || '').trim();
    if (!t) return null;
    try {
        const p = JSON.parse(t) as { action?: string; debtorNameSnapshot?: string; heir_names?: string[] };
        return p && typeof p === 'object' ? p : null;
    } catch {
        return null;
    }
}

function stringifyDebtorPartyDeathPayload(payload: {
    action: 'heir_substitution';
    debtorNameSnapshot: string;
    heir_names: string[];
}): string {
    return JSON.stringify(payload);
}

/** صف طلب إحلال ورثة المدين (يُميَّز عن صفوف أخرى بنفس requestKind إن وُجدت لاحقاً) */
export function isDebtorHeirSubstitutionDecisionRow(row: Record<string, unknown>): boolean {
    const kind = String(row.requestKind || '');
    if (kind !== 'debtor_party_death') return false;
    const payloadRaw = String((row as { debtorPartyDeathPayloadJson?: string }).debtorPartyDeathPayloadJson || '').trim();
    const p = parseDebtorPartyDeathPayload(payloadRaw);
    if (p?.action === 'heir_substitution') return true;
    return String(row.title || '').includes('إحلال');
}

/** طلب «إحلال ورثة المدين» إلى المنفذ (لا أثر على ملف التنفيذ قبل البت). */
export function appendDebtorHeirSubstitutionRequest(input: {
    executionId: string | undefined;
    debtorNameSnapshot: string;
}): { ok: boolean; decisionId?: string } {
    const status = getDebtorHeirSubstitutionRequestStatus(input.executionId);
    if (status === 'pending') {
        dispatchDecisionsReload();
        return { ok: false };
    }
    const decisionId = newExecutorDecisionId('debtor_heir_req');
    const payloadJson = stringifyDebtorPartyDeathPayload({
        action: 'heir_substitution',
        debtorNameSnapshot: input.debtorNameSnapshot,
        heir_names: [],
    });
    try {
        const arr = readExecutorDecisionsArray(input.executionId);
        const row = {
            id: decisionId,
            title: 'طلب — إحلال الورثة محل المدين المتوفى',
            body: `المدين: ${input.debtorNameSnapshot || 'المدين'}.`,
            debtorPartyDeathPayloadJson: payloadJson,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'debtor_party_death' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
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

export function readExecutorDecisionsArray(executionId: string | undefined): Record<string, unknown>[] {
    try {
        return readExecutorDecisionsFromActiveNamespace(executionId);
    } catch {
        return [];
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

/**
 * موافقة منفذ على «تحديد موعد الخروج الميداني» دون تسمية مجدول بعد —
 * لإعادة فتح نافذة الموعد من تبويب الإجراءات دون إعادة تقديم الطلب.
 */
export function findApprovedFieldVisitNeedingSchedule(
    executionId: string | undefined
): { decisionId: string; requestTitle: string } | null {
    const rows = readExecutorDecisionsArray(executionId);
    for (const r of rows) {
        if (String((r as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') continue;
        if (!isExecutorRowEffectivelyApproved(r as Record<string, unknown>)) continue;
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
    executionId: string | undefined
): { decisionId: string; requestTitle: string } | null {
    const rows = readExecutorDecisionsArray(executionId);
    for (const r of rows) {
        if (String((r as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') continue;
        if (!isExecutorRowEffectivelyApproved(r as Record<string, unknown>)) continue;
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
    executionId: string | undefined
): { decisionId: string; requestTitle: string } | null {
    const rows = readExecutorDecisionsArray(executionId);
    for (const r of rows) {
        if (String((r as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') continue;
        if (!isExecutorRowEffectivelyApproved(r as Record<string, unknown>)) continue;
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
        return { decisionId, requestTitle: title };
    }
    return null;
}

/** نقض/إلغاء رفض الطلب أمام التمييز أو الطعن — يُعامل كموافقة للآثار العملية */
export function isExecutorRowAppealOverturned(row: Record<string, unknown>): boolean {
    return String((row as { appealStatus?: string }).appealStatus || '') === 'overturned';
}

/** نتيجة طعن/تمييز نقضت رفض الطلب فعلياً (الطلب صار مقبولاً وليس مجرد حقل appealResult عالقاً) */
function executorRowAppealOverturnsRejection(row: Record<string, unknown>): boolean {
    if (isExecutorRowAppealOverturned(row)) return true;
    const result = String((row as { appealResult?: string }).appealResult || '').trim();
    if (result !== 'نقض القرار') return false;
    const outcome = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (outcome === 'approved' || outcome === 'alternative') return true;
    const ws = String((row as { appealWorkflowState?: string }).appealWorkflowState || '').trim();
    if (ws === 'FINAL_ACCEPTED' || ws === 'REVOKED_BY_APPEAL') return true;
    const appealStatus = String((row as { appealStatus?: string }).appealStatus || '').trim();
    /** نقض نهائي لرفض سابق — يُعاد القبول عملياً حتى قبل مزامنة executorOutcome */
    return appealStatus === 'final' && outcome === 'rejected';
}

/** موافقة فعلية: موافقة المنفذ أو بديله، أو رفض أُلغي بنقض */
export function isExecutorRowEffectivelyApproved(row: Record<string, unknown>): boolean {
    const o = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (o === 'approved') return true;
    if (o === 'rejected' && executorRowAppealOverturnsRejection(row)) return true;
    return false;
}

/** رفض ما زال سارياً (لم يُنقض) */
export function isExecutorRowRejectedAndFinal(row: Record<string, unknown>): boolean {
    const o = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (o !== 'rejected') return false;
    return !executorRowAppealOverturnsRejection(row);
}

/** طلب مُغلق نهائياً بعد تقديم طلب جديد لنفس الإجراء */
export function isExecutorHubRowSuperseded(row: Record<string, unknown> | null | undefined): boolean {
    if (!row || typeof row !== 'object') return false;
    return (row as { requestCycleSuperseded?: boolean }).requestCycleSuperseded === true;
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

function buildPersonalCoerciveSubtypeMatcher(input: {
    subtype: PersonalCoerciveSubtype;
    debtorKey?: string;
    primaryDebtorKey?: string;
}): (row: Record<string, unknown>) => boolean {
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
    return (row: Record<string, unknown>) =>
        String(row.requestKind || '') === 'personal_coercive' &&
        String(row.personalCoerciveSubtype || '') === input.subtype &&
        rowMatchesDebtorScope(row);
}

function supersedeRejectedFinalExecutorHubRows(
    arr: Record<string, unknown>[],
    matches: (row: Record<string, unknown>) => boolean
): Record<string, unknown>[] {
    const now = new Date().toISOString();
    return arr.map((row) => {
        if (!matches(row)) return row;
        if (isExecutorHubRowSuperseded(row)) return row;
        if (!isExecutorRowRejectedAndFinal(row)) return row;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: now,
            isArchived: true,
        };
    });
}

/** إغلاق كل صفوف hub السابقة (موافق/مرفوض) عند تقديم طلب جديد لنفس الإجراء */
function supersedePriorExecutorHubRows(
    arr: Record<string, unknown>[],
    matches: (row: Record<string, unknown>) => boolean
): Record<string, unknown>[] {
    const now = new Date().toISOString();
    return arr.map((row) => {
        if (!matches(row)) return row;
        if (isExecutorHubRowSuperseded(row)) return row;
        const pending =
            row.executorOutcome === 'pending' ||
            row.executorOutcome === undefined ||
            row.executorOutcome === '';
        if (pending) return row;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: now,
            isArchived: true,
        };
    });
}

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

function isPersonalCoerciveSubtypeRowPending(row: Record<string, unknown>): boolean {
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
        const arr = readExecutorDecisionsArray(executionId);
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
export function hasActivePersonalCoerciveSubtypeCard(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): boolean {
    const row = getGoverningPersonalCoerciveSubtypeRow(executionId, subtype, opts);
    if (!row) return false;
    if ((row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) return false;
    const out = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (out === 'withdrawn') return false;
    const all = readExecutorDecisionsArray(executionId);
    if (isExecutorHubRowInactiveForGoverning(row, all)) return false;
    if (isPersonalCoerciveSubtypeRowPending(row)) return true;
    if (isExecutorRowRejectedAndFinal(row)) return true;
    if (isExecutorRequestAppealCycleSupersededFromRecord(row, all)) return false;
    if (isExecutorRequestFollowupBlockedFromRecord(row, all)) return true;
    return false;
}

/** تبويب القرارات المناسب للبطاقة الحاكمة */
export function resolvePersonalCoerciveDecisionsNav(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): { decisionsTab: 'current' | 'previous'; decisionId?: string } {
    const row = getGoverningPersonalCoerciveSubtypeRow(executionId, subtype, opts);
    const decisionId = row ? String((row as { id?: string }).id || '').trim() : '';
    if (!row || !decisionId) return { decisionsTab: 'current' };
    if (isPersonalCoerciveSubtypeRowPending(row)) {
        return { decisionsTab: 'current', decisionId };
    }
    return { decisionsTab: 'previous', decisionId };
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
        let arr = readExecutorDecisionsArray(executionId);
        arr = supersedePriorExecutorHubRows(arr, matches);
        persistExecutorDecisionsArray(input.executionId, arr);
    } catch {
        /* ignore */
    }
}

/** تفعيل مسار جبري بقرار المنفذ مسبقاً — دون انتظار طلب الدائن */
export function appendPersonalCoerciveByExecutorOrder(input: {
    executionId: string | undefined;
    subtype: PersonalCoerciveSubtype;
    title: string;
    body: string;
    debtorKey?: string;
    primaryDebtorKey?: string;
}): { ok: boolean; decisionId?: string } {
    if (
        !assertDomainGate(input.executionId, 'personal_coercive', {
            personalCoerciveSubtype: input.subtype,
        })
    ) {
        return { ok: false };
    }
    const governing = getGoverningPersonalCoerciveSubtypeRow(input.executionId, input.subtype, {
        debtorKey: input.debtorKey,
        primaryDebtorKey: input.primaryDebtorKey,
    });
    if (governing && isPersonalCoerciveSubtypeRowPending(governing)) {
        dispatchDecisionsReload();
        return { ok: false };
    }

    const normalizeDebtorKey = (v: unknown): string => String(v ?? '').trim();
    const targetDebtorKey = normalizeDebtorKey(input.debtorKey);
    const matches = buildPersonalCoerciveSubtypeMatcher(input);
    try {
        let arr = readExecutorDecisionsArray(input.executionId);
        arr = supersedePriorExecutorHubRows(arr, matches);
        arr = supersedeRejectedFinalExecutorHubRows(arr, matches);
        const nowIso = new Date().toISOString();
        const today = getLocalTodayYmd();
        const decisionId = newExecutorDecisionId('personal_coercive');
        const row = {
            id: decisionId,
            title: input.title,
            body: input.body,
            date: today,
            resolvedAt: nowIso,
            appealStatus: 'pending' as const,
            executorOutcome: 'approved' as const,
            status: 'accepted' as const,
            appealBaseBranch: 'after_approval' as const,
            appealRequestOrigin: 'executor_side' as const,
            activatedByExecutorOrder: true,
            requestKind: 'personal_coercive' as const,
            personalCoerciveSubtype: input.subtype,
            appealPhase: null,
            ...(targetDebtorKey ? { personalCoerciveDebtorKey: targetDebtorKey } : {}),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
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

/** إغلاق صفوف طلب الكفيل عند استبدال/فك الكفالة — يفتح دورة طلب جديدة في المحضر */
export function supersedeGuarantorRequestDecisionsForExecution(executionId: string | undefined): number {
    try {
        const arr = readExecutorDecisionsArray(executionId);
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

/** حالة آخر طلب كفيل ضامن (محضر المتابعة) */
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

/** أحدث طلب استحصال وعاء موحّد في التخزين (الأحدث = أول عنصر بعد unshift) */
export type UnifiedCollectionDecisionState = 'none' | 'pending' | 'approved' | 'rejected';

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

/** إزالة بادئة الرموز التعبيرية/الزخرفية قبل مطابقة عنوان الطلب */
export function normalizeEvictionProcedureTitle(title: string): string {
    return String(title || '')
        .trim()
        .replace(/^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]+/u, '')
        .trim();
}

function evictionProcedureTitlesMatch(a: string, b: string): boolean {
    const na = normalizeEvictionProcedureTitle(a);
    const nb = normalizeEvictionProcedureTitle(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    return na.includes(nb) || nb.includes(na);
}

export function evictionProcedureRowsMatch(
    row: Record<string, unknown>,
    input: { evictionWorkflowKey?: string; encroachmentWorkflowKey?: string; title?: string }
): boolean {
    const encWf = String(input.encroachmentWorkflowKey || '').trim();
    if (encWf) {
        const rowEncWf = String(
            (row as { encroachmentWorkflowKey?: string }).encroachmentWorkflowKey || ''
        ).trim();
        if (rowEncWf === encWf) return true;
    }
    const wf = String(input.evictionWorkflowKey || '').trim();
    const title = String(input.title || '').trim();
    const rowWf = String((row as { evictionWorkflowKey?: string }).evictionWorkflowKey || '').trim();
    if (wf && rowWf && rowWf === wf) return true;
    const rowTitle = String((row as { title?: string }).title || '').trim();
    return evictionProcedureTitlesMatch(title, rowTitle);
}

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

/** صف الطلب الأصلي — لا نسخة مسار الطعن المشتقة */
export function isEvictionProcedureHubRow(row: Record<string, unknown> | null | undefined): boolean {
    if (!row || typeof row !== 'object') return false;
    return !String((row as { appealSourceDecisionId?: string }).appealSourceDecisionId || '').trim();
}

export function isEvictionProcedureRowPending(row: Record<string, unknown> | null | undefined): boolean {
    if (!row || typeof row !== 'object') return false;
    const outcome = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending');
    return outcome === 'pending' || outcome === '';
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

/** صف يحكم واجهة الفرع: نشط أولاً، وإلا أحدث صف hub للعرض (مثل الرفض النهائي). */
export function getGoverningEvictionProcedureRowForBranch(
    all: Record<string, unknown>[],
    branch: string
): Record<string, unknown> | null {
    const sorted = sortEvictionProcedureRowsNewestFirst(
        evictionProcedureHubRowsForBranch(all, branch).filter(
            (row) => !isExecutorHubRowSuperseded(row)
        )
    );
    const active = sorted.find((row) => isEvictionProcedureRowActive(row, all));
    if (active) return active;
    return sorted[0] ?? null;
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
    const sorted = sortEvictionProcedureRowsNewestFirst(matching);
    const active = sorted.find((row) => isEvictionProcedureRowActive(row, all));
    if (active) return active;
    return sorted[0] ?? null;
}

/** صف hub الحاكم لطلبات إزالة التجاوز (انتداب مساح / إذن آليات) */
export function getGoverningEncroachmentProcedureRowForMatch(
    all: Record<string, unknown>[],
    encroachmentWorkflowKey: string
): Record<string, unknown> | null {
    const key = String(encroachmentWorkflowKey || '').trim();
    if (!key) return null;
    return getGoverningEvictionProcedureRowForMatch(all, { encroachmentWorkflowKey: key });
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

function evictionBranchGateInput(input: {
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
    if (!newest) return false;
    return isEvictionProcedureRowActive(newest, all);
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

/** هل يوجد طلب hub قائم يمنع إرسالاً جديداً؟ — بعد اكتمال الإجراء تُعاد دورة الحياة. */
export function isEvictionBranchResendBlocked(
    all: Record<string, unknown>[],
    input: { evictionWorkflowKey?: string; encroachmentWorkflowKey?: string; title?: string; branch?: string }
): boolean {
    const governing =
        input.branch != null && String(input.branch).trim()
            ? getGoverningEvictionProcedureRowForBranch(all, String(input.branch).trim())
            : getGoverningEvictionProcedureRowForMatch(all, input);
    if (!governing?.id) return false;
    if (isExecutorRequestAppealCycleSupersededFromRecord(governing, all)) return false;
    return isEvictionProcedureRowActive(governing, all);
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
        evictionWorkflowKey: (row as { evictionWorkflowKey?: string }).evictionWorkflowKey,
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

/** طلبات تخلية / صرف أتعاب — تظهر في «القرارات والطعون» مع قبول/رفض الطلب. يُرجَع true عند إدراج صف جديد. */
export function appendEvictionExecutorRequest(input: {
    executionId: string | undefined;
    title: string;
    body: string;
    requestKind: EvictionRequestKind;
    /** يُملأ لطلبات التخلية الميدانية لتمكين المسار الآلي بعد قبول المنفذ */
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    /** بعد اكتمال مسار سابق — أرشفة الصف الحاكم وتقديم طلب hub جديد */
    supersedeCompletedHub?: boolean;
}): boolean {
    if (!assertDomainGate(input.executionId, input.requestKind)) {
        return false;
    }
    try {
        let arr: Record<string, unknown>[] = readExecutorDecisionsArray(input.executionId);

        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;

        if (input.requestKind === 'lawyer_fee_payout') {
            const alreadyApproved = arr.some(
                (x) =>
                    (x as { requestKind?: string }).requestKind === 'lawyer_fee_payout' &&
                    isExecutorRowEffectivelyApproved(x as Record<string, unknown>)
            );
            if (alreadyApproved) {
                dispatchDecisionsReload();
                return false;
            }
            const dup = arr.some(
                (x) =>
                    isPending(x as Record<string, unknown>) &&
                    (x as { requestKind?: string }).requestKind === 'lawyer_fee_payout'
            );
            if (dup) {
                dispatchDecisionsReload();
                return false;
            }
        }

        if (input.requestKind === 'unified_collection') {
            const dupPending = arr.some(
                (x) =>
                    isPending(x as Record<string, unknown>) &&
                    (x as { requestKind?: string }).requestKind === 'unified_collection'
            );
            if (dupPending) {
                dispatchDecisionsReload();
                return false;
            }
        }

        if (input.requestKind === 'eviction_procedure') {
            const wf = String(input.evictionWorkflowKey || '').trim();
            const title = String(input.title || '').trim();
            const matchInput = { evictionWorkflowKey: wf, title };

            arr = supersedeRejectedFinalExecutorHubRows(arr as Record<string, unknown>[], (row) => {
                if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
                    return false;
                }
                return evictionProcedureRowsMatch(row, matchInput) && isEvictionProcedureHubRow(row);
            }) as unknown[];

            const hubMatches = (row: Record<string, unknown>) =>
                String((row as { requestKind?: string }).requestKind || '') === 'eviction_procedure' &&
                evictionProcedureRowsMatch(row, matchInput) &&
                isEvictionProcedureHubRow(row);

            const allRows = arr as Record<string, unknown>[];
            const gateInput = evictionBranchGateInput(matchInput);
            const governing = getGoverningEvictionProcedureRowForNewRequest(allRows, matchInput);
            const governingPending =
                governing?.id &&
                isEvictionProcedureRowPending(governing) &&
                isEvictionProcedureRowActive(governing, allRows);
            if (governingPending) {
                dispatchDecisionsReload();
                return false;
            }

            if (input.supersedeCompletedHub) {
                arr = supersedePriorExecutorHubRows(arr as Record<string, unknown>[], hubMatches) as unknown[];
            } else if (governing?.id) {
                if (isEvictionBranchBlockingNewRequest(allRows, gateInput)) {
                    dispatchDecisionsReload();
                    return false;
                }
                if (isEvictionBranchResendBlocked(allRows, gateInput)) {
                    dispatchDecisionsReload();
                    return false;
                }
                if (!isEvictionProcedureRowActive(governing, allRows)) {
                    arr = supersedePriorExecutorHubRows(
                        arr as Record<string, unknown>[],
                        hubMatches
                    ) as unknown[];
                }
            }

            arr = arr.filter((x) => {
                const row = x as Record<string, unknown>;
                if (!isPending(row)) return true;
                if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
                    return true;
                }
                return !evictionProcedureRowsMatch(row, matchInput);
            });
        }

        const row = {
            id: newExecutorDecisionId('eviction_req'),
            title: input.title,
            body: input.body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: input.requestKind,
            appealRequestOrigin: 'creditor_side' as const,
            ...(input.evictionWorkflowKey
                ? { evictionWorkflowKey: input.evictionWorkflowKey }
                : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return true;
    } catch {
        return false;
    }
}

/**
 * دمج موافقة الكفيل من تخزين القرارات إلى ملف التنفيذ — يُستدعى من ExecutionDashboard.
 * TODO: استكمال المنطق عند توفر مواصفات الدمج الكاملة.
 */
export function computeGuarantorApprovalMergePatch(
    _decisionsStorageExecutionId: string | undefined,
    _executionData: unknown,
): Record<string, unknown> {
    return {};
}
