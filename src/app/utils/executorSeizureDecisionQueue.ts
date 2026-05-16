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
import { executionDecisionsStorageKey } from '@/app/utils/executionStorageKeys';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import SecureStoreService from '@/app/services/SecureStoreService';

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
    | 'executive_detention'
    | 'release_debtor';

export type SeizureRequestSubtype =
    | 'movable'
    | 'movable_auction'
    | 'property'
    | 'salary'
    | 'notice'
    | 'third_party';

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

/** طلب خاص من تبويب «الطلبات الخاصة» في محضر المتابعة — بانتظار موافقة أو رفض الطلب من المنفذ */
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
    const key = executionDecisionsStorageKey(input.executionId);
    const trimmed = input.content.trim();
    const body = `بتاريخ ${input.requestDate}:\n\n${trimmed}`;
    const rowId = newExecutorDecisionId('special_followup');
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
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
    const key = executionDecisionsStorageKey(input.executionId);
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

/** طلب صرف الأمانات التنفيذية من محضر المتابعة — يُعرَض على منفذ العدل للبتّ */
export function appendTrustDisburseRequest(input: {
    executionId: string | undefined;
}): { ok: boolean; decisionId?: string } {
    const key = executionDecisionsStorageKey(input.executionId);
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
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
    const key = executionDecisionsStorageKey(input.executionId);
    const seizureId = String(input.thirdPartySeizureId || '').trim();
    if (!seizureId) return { ok: false };
    const amt = Math.max(0, Math.trunc(Number(input.transferredAmountIqd || 0)));
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false };
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
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
    const key = executionDecisionsStorageKey(input.executionId);
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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
            personalCoerciveSubtype: input.subtype,
            ...(targetDebtorKey ? { personalCoerciveDebtorKey: targetDebtorKey } : {}),
            ...(String(input.encryptedPayloadJson || '').trim()
                ? { encryptedPayloadJson: input.encryptedPayloadJson }
                : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export function appendPendingExecutorSeizureDecision(input: {
    executionId: string | undefined;
    requestTitle: string;
    requestBody: string;
    seizureSubtype?: SeizureRequestSubtype;
    seizurePayloadJson?: string;
}): string | null {
    const key = executionDecisionsStorageKey(input.executionId);
    const decisionId = newExecutorDecisionId('seizure_req');
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr: unknown[] = parseStoredDecisionsArray(raw);

        const dup = (arr as Array<Record<string, unknown>>).find((r) => {
            if (String(r.requestKind || '') !== 'seizure') return false;
            const out = String((r as any).executorOutcome ?? 'pending');
            if (out !== 'pending') return false;
            const a = String((r as any).seizureSubtype || '').trim();
            const b = String(input.seizureSubtype || '').trim();
            if (b && a && a !== b) return false;
            if (b && !a) return false;
            const t1 = String(r.title || '').trim();
            const t2 = String(input.requestTitle || '').trim();
            if (b) return true;
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
            ...(input.seizureSubtype ? { seizureSubtype: input.seizureSubtype } : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
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
): void {
    const key = executionDecisionsStorageKey(executionId);
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
        const next = arr.map((row) =>
            String(row.id) === decisionId ? { ...row, ...patch } : row
        );
        SecureStoreService.setItemSync(key, JSON.stringify(next));
        dispatchDecisionsReload();
    } catch {
        /* ignore */
    }
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
            if (!key) continue;
            if (!key.endsWith('_decisions')) continue;
            if (!key.startsWith('execution_')) continue;
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
    const key = executionDecisionsStorageKey(executionId);
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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
    const key = executionDecisionsStorageKey(input.executionId);
    const decisionId = newExecutorDecisionId('creditor_death_req');
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
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
    const key = executionDecisionsStorageKey(input.executionId);
    const decisionId = newExecutorDecisionId('debtor_heir_req');
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr = parseStoredDecisionsArray(raw) as Record<string, unknown>[];
        const row = {
            id: decisionId,
            title: 'طلب — إحلال الورثة محل المدين المتوفى',
            body: `المدين: ${input.debtorNameSnapshot || 'المدين'}.`,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'debtor_party_death' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
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
    const matches = rows.filter(
        (x) => String((x as { requestKind?: string }).requestKind || '') === 'debtor_party_death'
    );
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
    const key = executionDecisionsStorageKey(executionId);
    try {
        const raw = SecureStoreService.getItemSync(key);
        return parseStoredDecisionsArray(raw) as Record<string, unknown>[];
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

    const key = executionDecisionsStorageKey(targetId);
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
        const targetRaw = SecureStoreService.getItemSync(key);
        const targetArr = parseStoredDecisionsArray(targetRaw) as Record<string, unknown>[];
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
        SecureStoreService.setItemSync(key, JSON.stringify(mergedArr));
        dispatchDecisionsReload();
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

/** نتيجة طعن/تمييز نقضت رفض الطلب (بما في ذلك مسار التمييز الذي يُخزّن appealResult = «نقض القرار») */
function executorRowAppealOverturnsRejection(row: Record<string, unknown>): boolean {
    if (isExecutorRowAppealOverturned(row)) return true;
    return String((row as { appealResult?: string }).appealResult || '').trim() === 'نقض القرار';
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

/** حالة آخر طلب تنفيذ جبري شخصي من نفس النوع (للشارات والواجهة) */
export function getPersonalCoerciveSubtypeOutcome(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string }
): { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean } {
    const normalizeDebtorKey = (v: unknown): string =>
        String(v ?? '').trim();
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
    const rows = readExecutorDecisionsArray(executionId);
    const matches = rows.filter(
        (r) =>
            String((r as { requestKind?: string }).requestKind || '') === 'personal_coercive' &&
            String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || '') === subtype &&
            rowMatchesDebtorScope(r as Record<string, unknown>)
    );
    const last = matches[0] as Record<string, unknown> | undefined;
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

/** طلبات تخلية / صرف أتعاب — تظهر في «القرارات والطعون» مع قبول/رفض الطلب. يُرجَع true عند إدراج صف جديد. */
export function appendEvictionExecutorRequest(input: {
    executionId: string | undefined;
    title: string;
    body: string;
    requestKind: EvictionRequestKind;
    /** يُملأ لطلبات التخلية الميدانية لتمكين المسار الآلي بعد قبول المنفذ */
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
}): boolean {
    const key = executionDecisionsStorageKey(input.executionId);
    try {
        const raw = SecureStoreService.getItemSync(key);
        const arr: unknown[] = parseStoredDecisionsArray(raw);

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
            const dupPending = arr.some((x) => {
                const row = x as Record<string, unknown>;
                if (!isPending(row)) return false;
                if (String((row as any).requestKind || '') !== 'eviction_procedure') return false;
                const rowWf = String((row as any).evictionWorkflowKey || '').trim();
                if (wf && rowWf && rowWf === wf) return true;
                const rowTitle = String((row as any).title || '').trim();
                return Boolean(title && rowTitle && rowTitle === title);
            });
            if (dupPending) {
                dispatchDecisionsReload();
                return false;
            }
        }

        const row = {
            id: newExecutorDecisionId('eviction_req'),
            title: input.title,
            body: input.body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: input.requestKind,
            ...(input.evictionWorkflowKey
                ? { evictionWorkflowKey: input.evictionWorkflowKey }
                : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        SecureStoreService.setItemSync(key, JSON.stringify(arr));
        dispatchDecisionsReload();
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
