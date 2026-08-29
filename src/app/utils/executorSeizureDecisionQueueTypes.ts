/**
 * Types, hub defaults, pure row predicates, and shared mutate/IO primitives
 * for the executor seizure decision queue.
 */

import {
    dispatchDomainIsolationBlocked,
    gateExecutorRequestPersist,
    resolveExecutionDataForDomainGate,
} from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import {
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
    flushExecutorDecisionsStorageImmediate,
} from '@/app/utils/executionDecisionsNamespace';
import { type CreditorPartyDeathStoredAction } from '@/app/utils/creditorPartyDeathPersistence';
import { isExecutorRowRejectedAndFinal } from '@/app/utils/executorDecisionRowApproval';

export const DECISIONS_RELOAD_EVENT = 'hami-decisions-reload';

const RELOAD_EVENT = DECISIONS_RELOAD_EVENT;

export function newExecutorDecisionId(prefix: string): string {
    const c = (globalThis as any).crypto as { randomUUID?: () => string } | undefined;
    const uuid = c?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** قراءة آمنة لمصفوفة القرارات من JSON — لا ترمي؛ تُرجع [] إن لم يكن المصفوفة */
export function parseStoredDecisionsArray(raw: string | null): unknown[] {
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

export function readActiveExecutorDecisionsForMutate(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): Record<string, unknown>[] {
    return readExecutorDecisionsFromActiveNamespace(
        executionId,
        resolveExecutionDataForDomainGate(executionId, executionData)
    );
}

export function persistExecutorDecisionsArray(
    executionId: string | undefined,
    arr: Record<string, unknown>[],
    executionData?: Record<string, unknown> | null
): void {
    const data = resolveExecutionDataForDomainGate(executionId, executionData);
    const persistId = resolveDecisionsStorageExecutionId(executionId, data);
    const persistKey = persistId !== 'default' ? persistId : executionId;
    writeExecutorDecisionsArray(persistKey, arr, data);
    flushExecutorDecisionsStorageImmediate(persistKey, data);
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


export function assertDomainGate(
    executionId: string | undefined,
    requestKind: string,
    meta?: {
        personalCoerciveSubtype?: string;
        executionData?: Record<string, unknown> | null;
        decisionTitle?: string;
        communicationJournal?: boolean;
        adminRequestsTab?: boolean;
        otherPartyFollowup?: boolean;
        payloadJson?: string;
    },
): boolean {
    const gate = gateExecutorRequestPersist(executionId, requestKind, meta);
    if (!gate.allowed) {
        dispatchDomainIsolationBlocked(gate.reasonAr || 'الطلب غير مسموح في هذا المسار', requestKind);
        return false;
    }
    return true;
}

export type EvictionRequestKind =
    | 'eviction_procedure'
    | 'lawyer_fee_payout'
    | 'case_expense'
    | 'unified_collection';

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

export function creditorPartyDeathDecisionTitle(action: CreditorPartyDeathStoredAction): string {
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

export type CreditorHeirSubstitutionRequestStatus =
    | 'none'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'alternative';

export function latestExecutorDecisionRow(rows: Record<string, unknown>[]): Record<string, unknown> | undefined {
    if (rows.length === 0) return undefined;
    return rows.reduce((acc, cur) => {
        const a = String((acc as any).resolvedAt || (acc as any).date || '');
        const b = String((cur as any).resolvedAt || (cur as any).date || '');
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, rows[0]);
}

export type DebtorHeirSubstitutionRequestStatus =
    | 'none'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'alternative';

export function parseDebtorPartyDeathPayload(raw: string): {
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

export function stringifyDebtorPartyDeathPayload(payload: {
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

export function isExecutorHubRowSuperseded(row: Record<string, unknown> | null | undefined): boolean {
    if (!row || typeof row !== 'object') return false;
    return (row as { requestCycleSuperseded?: boolean }).requestCycleSuperseded === true;
}

export function buildPersonalCoerciveSubtypeMatcher(input: {
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

export function supersedeRejectedFinalExecutorHubRows(
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
        };
    });
}

/** إغلاق كل صفوف hub السابقة (موافق/مرفوض) عند تقديم طلب جديد لنفس الإجراء */
export function supersedePriorExecutorHubRows(
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
        };
    });
}

/** أحدث طلب استحصال وعاء موحّد في التخزين (الأحدث = أول عنصر بعد unshift) */
export type UnifiedCollectionDecisionState = 'none' | 'pending' | 'approved' | 'rejected';

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

export function buildSeizureSubtypeMatcher(subtype: SeizureRequestSubtype): (row: Record<string, unknown>) => boolean {
    const st = String(subtype || '').trim();
    return (row) =>
        String((row as { requestKind?: string }).requestKind || '') === 'seizure' &&
        String((row as { seizureSubtype?: string }).seizureSubtype || '').trim() === st;
}

export function parseSeizedMovableIdFromPayloadJson(raw: string | undefined): string {
    const rawJson = String(raw || '').trim();
    if (!rawJson) return '';
    try {
        const v = JSON.parse(rawJson) as { seizedMovableId?: string };
        return String(v?.seizedMovableId ?? '').trim();
    } catch {
        return '';
    }
}

export function parseSeizedPropertyIdFromPayloadJson(raw: string | undefined): string {
    const rawJson = String(raw || '').trim();
    if (!rawJson) return '';
    try {
        const v = JSON.parse(rawJson) as { seizedPropertyId?: string };
        return String(v?.seizedPropertyId ?? '').trim();
    } catch {
        return '';
    }
}
