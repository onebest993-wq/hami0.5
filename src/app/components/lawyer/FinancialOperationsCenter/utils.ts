import type { UnifiedLedgerStore } from './types';

/** تحويل الرقم إلى صيغة IQD مع الفواصل */
export function formatIqdDisplay(value: number): string {
    const n = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.round(n).toLocaleString('en-US');
}

/** تحويل النص الرقمي (عربي/إنجليزي) إلى رقم حقيقي */
export function parseAmount(raw: string): number {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw))
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function parseStoredMoney(raw: unknown): number {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
    if (typeof raw !== 'string') return NaN;
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(raw)
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : NaN;
}

export function formatNumberInput(raw: string): string {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw))
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.')
        .replace(/[^0-9.]/g, '');
    if (!normalized) return '';
    const [intPartRaw, ...rest] = normalized.split('.');
    const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (!rest.length) return grouped;
    const decimal = rest.join('').replace(/\./g, '');
    return decimal ? `${grouped}.${decimal}` : grouped;
}

export function computeTrustBalanceFromPayments(payments: Array<{ amount?: unknown; entryType?: unknown }>): number {
    let trust = 0;
    for (const r of payments) {
        const amt = typeof r.amount === 'number' ? (Number.isFinite(r.amount) ? r.amount : 0) : parseStoredMoney(r.amount);
        const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement' | 'debt_adjustment';
        if (et === 'disburse') trust -= Number.isFinite(amt) ? amt : 0;
        else if (et === 'debt_adjustment') continue;
        else trust += Number.isFinite(amt) ? amt : 0;
    }
    return Math.max(0, trust);
}

export function resolvePrincipalBasisFromStore(
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams
): number {
    const fromParams =
        Number.isFinite(params.principal_amount) && params.principal_amount > 0
            ? Math.max(0, params.principal_amount)
            : 0;
    const snap =
        typeof store.principalSnapshot === 'number' && Number.isFinite(store.principalSnapshot)
            ? Math.max(0, store.principalSnapshot)
            : null;
    // قيمة حيّة من الإضبارة تتفوّق على لقطة صفرية قديمة (مثلاً أثاث زوجية بعد تعذّر التسليم)
    if (fromParams > 0 && (snap === null || snap === 0)) return fromParams;
    if (snap !== null) return snap;
    return fromParams;
}

export function computeNonPrincipalLedgerComponent(
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams
): number {
    const total = computeTotalOwedUnifiedFromStore(store, params);
    const principal = resolvePrincipalBasisFromStore(store, params);
    return Math.max(0, total - principal);
}

export type ManualDebtTotalsEditResult =
    | { ok: true; store: UnifiedLedgerStore }
    | { ok: false; reason: string };

/** تعديل يدوي لإجمالي الدين ومتبقي الوعاء — دون المساس برصيد الأمانات */
export function applyManualDebtTotalsEdit(
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams,
    newTotalRaw: number,
    newRemainingRaw: number
): ManualDebtTotalsEditResult {
    const newTotal = Math.max(0, Math.round(Number(newTotalRaw) || 0));
    const newRemaining = Math.max(0, Math.round(Number(newRemainingRaw) || 0));
    if (newRemaining > newTotal) {
        return { ok: false, reason: 'لا يمكن أن يتجاوز المتبقي إجمالي الدين.' };
    }
    if (newTotal <= 0 && newRemaining > 0) {
        return { ok: false, reason: 'أدخل إجمالي دين صحيحاً.' };
    }

    const nonPrincipal = computeNonPrincipalLedgerComponent(store, params);
    const newPrincipal = Math.max(0, newTotal - nonPrincipal);
    const currentPaid = sumDebtPaidFromLedgerPayments(store);
    const targetPaid = Math.max(0, newTotal - newRemaining);
    const delta = targetPaid - currentPaid;

    let payments = [...store.payments];
    if (Math.abs(delta) >= 1) {
        const debtAfter = newRemaining;
        const trustNow = computeTrustBalanceFromPayments(payments);
        payments = [
            {
                id: `pay-debt-adj-${Date.now()}`,
                amount: delta,
                at: new Date().toISOString(),
                kind: debtAfter === 0 && newTotal > 0 ? 'full' : 'partial',
                entryType: 'debt_adjustment',
                balanceAfter: debtAfter,
                debtBalanceAfter: debtAfter,
                trustBalanceAfter: trustNow,
            },
            ...payments,
        ];
    }

    return {
        ok: true,
        store: {
            ...store,
            principalSnapshot: newPrincipal,
            payments,
            completed: newTotal > 0 && newRemaining <= 0,
            collectionRequestActive: newRemaining <= 0 ? false : store.collectionRequestActive,
        },
    };
}

export function extractYmd(raw: string): string {
    const m = /^\d{4}-\d{2}-\d{2}/.exec(String(raw || '').trim());
    return m ? m[0] : '';
}

export function localYmdToDate(ymd: string): Date | null {
    const v = extractYmd(ymd);
    if (!v) return null;
    const dt = new Date(`${v}T12:00:00`);
    return Number.isFinite(dt.getTime()) ? dt : null;
}

function formatLocalYmd(dt: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export function addDaysToYmd(ymd: string, days: number): string {
    const base = localYmdToDate(ymd);
    if (!base) return '';
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    return formatLocalYmd(next);
}

export function diffDaysYmd(dueYmd: string, currentYmd: string): number | null {
    const a = localYmdToDate(dueYmd);
    const b = localYmdToDate(currentYmd);
    if (!a || !b) return null;
    return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

/** مرحلة استحقاق التسوية: انتظار | حلول الموعد | تجاوز الموعد */
export type SettlementDuePhase = 'waiting' | 'due' | 'overdue';

export function resolveSettlementDuePhase(dueYmd: string, currentYmd: string): SettlementDuePhase | null {
    const diff = diffDaysYmd(dueYmd, currentYmd);
    if (diff === null) return null;
    if (diff > 0) return 'waiting';
    if (diff === 0) return 'due';
    return 'overdue';
}

/** أزرار تم/لم يتم التسديد تظهر عند حلول موعد السداد أو بعده */
export function shouldShowSettlementDueActions(dueYmd: string, currentYmd: string): boolean {
    const diff = diffDaysYmd(dueYmd, currentYmd);
    return diff !== null && diff <= 0;
}

export function addMonthsToYmd(ymd: string, months: number): string {
    const v = extractYmd(ymd);
    if (!v) return '';
    const [yy, mm, dd] = v.split('-').map((x) => Number(x));
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return '';
    const targetMonthIndex = (mm - 1) + months;
    const base = new Date(yy, mm - 1, dd, 12, 0, 0);
    if (!Number.isFinite(base.getTime())) return '';
    const tentative = new Date(yy, targetMonthIndex, dd, 12, 0, 0);
    if (!Number.isFinite(tentative.getTime())) return '';
    if (tentative.getMonth() !== ((targetMonthIndex % 12) + 12) % 12) {
        const lastDay = new Date(yy, targetMonthIndex + 1, 0, 12, 0, 0);
        return formatLocalYmd(lastDay);
    }
    return formatLocalYmd(tentative);
}

export function isEmployeeDebtor(job: string, employmentType?: string): boolean {
    const et = String(employmentType || '').toLowerCase();
    if (et === 'employee' || et === 'موظف') return true;
    const j = String(job || '');
    return j.includes('موظف') || j.includes('حكومي');
}

export function invalidPositiveAmountMessage(fieldLabel: string): string {
    return `يرجى إدخال ${fieldLabel} بصيغة رقمية صحيحة أكبر من صفر.`;
}

import { unifiedFundsLedgerStorageKey } from '@/app/utils/unifiedFundsLedgerStorage';

export function storageKey(executionId: string): string {
    return unifiedFundsLedgerStorageKey(executionId);
}

export function emptyStore(): UnifiedLedgerStore {
    return {
        lawyerFees: [],
        expenses: [],
        payments: [],
        completed: false,
        garnishment: false,
        seeded: false,
        principalSnapshot: null,
        collectionRequestActive: false,
        collectionRequestedTotal: null,
        evictionLedgerActivated: false,
        pendingSettlement: null,
        settlementBreachTriggeredAt: null,
        alimonyLastAccrualThroughYmd: null,
    };
}

function mergeLedgerRowsById<T extends { id: string }>(a: T[], b: T[]): T[] {
    const map = new Map<string, T>();
    for (const row of a) map.set(String(row.id), row);
    for (const row of b) map.set(String(row.id), row);
    return Array.from(map.values());
}

/** دمج حالتي الوعاء — يحافظ على كل البنود من الذاكرة والتخزين */
export function pickRicherLedgerStore(
    stateStore: UnifiedLedgerStore,
    cachedStore: UnifiedLedgerStore
): UnifiedLedgerStore {
    return {
        ...cachedStore,
        ...stateStore,
        lawyerFees: mergeLedgerRowsById(stateStore.lawyerFees, cachedStore.lawyerFees),
        expenses: mergeLedgerRowsById(stateStore.expenses, cachedStore.expenses),
        payments: mergeLedgerRowsById(stateStore.payments, cachedStore.payments),
        collectionRequestedTotal: (() => {
            const a = stateStore.collectionRequestedTotal;
            const b = cachedStore.collectionRequestedTotal;
            if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
            return a ?? b ?? null;
        })(),
        evictionLedgerActivated: stateStore.evictionLedgerActivated,
        principalSnapshot: stateStore.principalSnapshot ?? cachedStore.principalSnapshot,
        garnishment: stateStore.garnishment,
        /** null صريح يُلغي التسوية — لا يُستبدل من الكاش */
        pendingSettlement: stateStore.pendingSettlement,
        settlementBreachTriggeredAt:
            stateStore.settlementBreachTriggeredAt ?? cachedStore.settlementBreachTriggeredAt ?? null,
        alimonyLastAccrualThroughYmd:
            stateStore.alimonyLastAccrualThroughYmd ?? cachedStore.alimonyLastAccrualThroughYmd ?? null,
        seeded: stateStore.seeded || cachedStore.seeded,
    };
}

export function parseUnifiedLedgerFromStorage(raw: unknown): UnifiedLedgerStore | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const p = raw as Partial<UnifiedLedgerStore>;
    return {
        ...emptyStore(),
        ...p,
        lawyerFees: Array.isArray(p.lawyerFees) ? p.lawyerFees : [],
        expenses: Array.isArray(p.expenses) ? p.expenses : [],
        payments: Array.isArray(p.payments) ? p.payments : [],
        seeded: Boolean(p.seeded),
        principalSnapshot:
            typeof p.principalSnapshot === 'number' && Number.isFinite(p.principalSnapshot)
                ? Math.max(0, p.principalSnapshot)
                : null,
        collectionRequestActive: Boolean(p.collectionRequestActive),
        collectionRequestedTotal:
            typeof p.collectionRequestedTotal === 'number' && Number.isFinite(p.collectionRequestedTotal)
                ? p.collectionRequestedTotal
                : null,
        evictionLedgerActivated: Boolean(p.evictionLedgerActivated),
        pendingSettlement:
            p.pendingSettlement && typeof p.pendingSettlement === 'object'
                ? (p.pendingSettlement as UnifiedLedgerStore['pendingSettlement'])
                : null,
        settlementBreachTriggeredAt:
            typeof p.settlementBreachTriggeredAt === 'string' &&
            String(p.settlementBreachTriggeredAt).trim()
                ? String(p.settlementBreachTriggeredAt).trim()
                : null,
        alimonyLastAccrualThroughYmd:
            typeof p.alimonyLastAccrualThroughYmd === 'string' &&
            String(p.alimonyLastAccrualThroughYmd).trim()
                ? String(p.alimonyLastAccrualThroughYmd).trim()
                : null,
    };
}

export type UnifiedLedgerTotalParams = {
    principal_amount: number;
    courtOrderedFeesSafe: number;
    evictionLawyerFeeWaivedAtIntake: boolean;
    executionExpensesSumSafe: number;
    evictionCaseExpensesSumSafe: number;
    seedLawyerId: string;
    seedExpenseId: string;
};

export function frozenLawyerFeeId(executionId: string): string {
    return `frozen-lawyer-${executionId}`;
}

export function frozenExpenseId(executionId: string): string {
    return `frozen-exp-${executionId}`;
}

export function hasFrozenLedgerRows(store: UnifiedLedgerStore, executionId: string): boolean {
    const frozenLawyer = frozenLawyerFeeId(executionId);
    const frozenExp = frozenExpenseId(executionId);
    return (
        store.lawyerFees.some((r) => r.id === frozenLawyer) || store.expenses.some((r) => r.id === frozenExp)
    );
}

/*
 * `isUnifiedLedgerLocked` انتقل إلى `./unifiedLedgerLock`. لا يُعاد تصديره من هنا
 * عن قصد: إعادة التصدير تُعيد ضلع الاستيراد إلى طابور قرارات الحجز، فيرجع وزنه
 * إلى كل من يمسّ هذا الملفّ — وهو ما نُقل لأجل إزالته.
 */

/** يحوّل بذور الإضبارة إلى بنود دائمة لا تُمسح عند تغيّر بيانات الإضبارة بعد الطلب */
export function freezeLedgerForCollection(
    store: UnifiedLedgerStore,
    executionId: string,
    params: UnifiedLedgerTotalParams
): UnifiedLedgerStore {
    const seedLawyerId = params.seedLawyerId || `seed-lawyer-${executionId}`;
    const seedExpenseId = params.seedExpenseId || `seed-exp-${executionId}`;
    const lawyerFrozenId = frozenLawyerFeeId(executionId);
    const expenseFrozenId = frozenExpenseId(executionId);

    let lawyerFees = [...store.lawyerFees];
    let expenses = [...store.expenses];

    const dossierLawyerAmount =
        !params.evictionLawyerFeeWaivedAtIntake && params.courtOrderedFeesSafe > 0
            ? params.courtOrderedFeesSafe
            : 0;
    const seedLawyer = lawyerFees.find((r) => r.id === seedLawyerId);
    const frozenLawyer = lawyerFees.find((r) => r.id === lawyerFrozenId);
    const lawyerAmountToFreeze = Math.max(
        frozenLawyer?.amount ?? 0,
        seedLawyer?.amount ?? 0,
        dossierLawyerAmount
    );
    if (lawyerAmountToFreeze > 0) {
        const frozenRow = {
            id: lawyerFrozenId,
            amount: lawyerAmountToFreeze,
            label: frozenLawyer?.label || seedLawyer?.label || 'أتعاب محكومة (مجمّدة عند الطلب)',
            at: frozenLawyer?.at || seedLawyer?.at || new Date().toISOString(),
        };
        lawyerFees = [
            frozenRow,
            ...lawyerFees.filter((r) => r.id !== lawyerFrozenId && r.id !== seedLawyerId),
        ];
    }

    const dossierExpenseAmount = params.executionExpensesSumSafe + params.evictionCaseExpensesSumSafe;
    const seedExpense = expenses.find((r) => r.id === seedExpenseId);
    const frozenExpense = expenses.find((r) => r.id === expenseFrozenId);
    const expenseAmountToFreeze = Math.max(
        frozenExpense?.amount ?? 0,
        seedExpense?.amount ?? 0,
        dossierExpenseAmount
    );
    if (expenseAmountToFreeze > 0) {
        const frozenRow = {
            id: expenseFrozenId,
            amount: expenseAmountToFreeze,
            reason: frozenExpense?.reason || seedExpense?.reason || 'مصاريف تنفيذية (مجمّدة عند الطلب)',
            at: frozenExpense?.at || seedExpense?.at || new Date().toISOString(),
        };
        expenses = [
            frozenRow,
            ...expenses.filter((r) => r.id !== expenseFrozenId && r.id !== seedExpenseId),
        ];
    }

    return { ...store, lawyerFees, expenses };
}

export function computeTotalOwedUnifiedFromStore(
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams
): number {
    const executionIdFromSeed = params.seedLawyerId.replace(/^seed-lawyer-/, '');
    const hasFrozenLawyer = store.lawyerFees.some(
        (r) => r.id === frozenLawyerFeeId(executionIdFromSeed) || String(r.id).startsWith('frozen-lawyer-')
    );
    const hasFrozenExpenses = store.expenses.some(
        (r) => r.id === frozenExpenseId(executionIdFromSeed) || String(r.id).startsWith('frozen-exp-')
    );
    const sumLawyerExtras = store.lawyerFees
        .filter((r) => (params.seedLawyerId ? r.id !== params.seedLawyerId : true))
        .reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);
    const sumExpenseExtras = store.expenses
        .filter((r) => (params.seedExpenseId ? r.id !== params.seedExpenseId : true))
        .reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);
    const principalBasisAmount = resolvePrincipalBasisFromStore(store, params);
    const baselineUnifiedAmount =
        principalBasisAmount +
        (hasFrozenLawyer || params.evictionLawyerFeeWaivedAtIntake ? 0 : params.courtOrderedFeesSafe) +
        (hasFrozenExpenses ? 0 : params.executionExpensesSumSafe + params.evictionCaseExpensesSumSafe);
    const computed = Number.isFinite(baselineUnifiedAmount + sumLawyerExtras + sumExpenseExtras)
        ? Math.max(0, baselineUnifiedAmount + sumLawyerExtras + sumExpenseExtras)
        : Math.max(0, baselineUnifiedAmount);
    const requestedSnapshotAmount =
        store.collectionRequestActive &&
        typeof store.collectionRequestedTotal === 'number' &&
        Number.isFinite(store.collectionRequestedTotal)
            ? Math.max(0, store.collectionRequestedTotal)
            : 0;
    return Math.max(computed, requestedSnapshotAmount);
}

export function sumDebtPaidFromLedgerPayments(store: UnifiedLedgerStore): number {
    let debtPaid = 0;
    for (const r of store.payments) {
        const amt = Number.isFinite(r.amount) ? r.amount : 0;
        const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
        if (et === 'disburse') continue;
        debtPaid += amt;
    }
    return debtPaid;
}

/** إعادة حساب لقطات المتبقي/الأمانات بعد كل حركة — يُحافظ على ترتيب العرض */
export function recomputeUnifiedLedgerPaymentSnapshots(
    store: UnifiedLedgerStore,
    totalOwedUnified: number
): UnifiedLedgerStore {
    const payments = Array.isArray(store.payments) ? [...store.payments] : [];
    if (payments.length === 0) return store;

    const totalOwed = Math.max(0, Math.trunc(Number(totalOwedUnified) || 0));
    const sorted = [...payments].sort((a, b) =>
        String(a.at || '').localeCompare(String(b.at || ''), undefined, { numeric: true })
    );

    let debtPaidRunning = 0;
    let trustRunning = 0;
    const patchById = new Map<string, (typeof payments)[number]>();

    for (const r of sorted) {
        const amt = Number.isFinite(r.amount) ? Math.max(0, Math.trunc(r.amount)) : 0;
        const et = (r.entryType ?? 'collect') as
            | 'collect'
            | 'disburse'
            | 'settlement'
            | 'debt_adjustment';

        if (et === 'disburse') {
            trustRunning -= amt;
        } else if (et === 'debt_adjustment') {
            debtPaidRunning += amt;
        } else if (et === 'settlement') {
            debtPaidRunning += amt;
            trustRunning += amt;
        } else {
            debtPaidRunning += amt;
            trustRunning += amt;
        }

        const debtPaidClamped =
            totalOwed > 0
                ? Math.min(Math.max(0, debtPaidRunning), totalOwed)
                : Math.max(0, debtPaidRunning);
        const debtAfter = totalOwed > 0 ? Math.max(0, totalOwed - debtPaidClamped) : 0;
        const trustAfter = Math.max(0, trustRunning);

        patchById.set(String(r.id || ''), {
            ...r,
            balanceAfter: debtAfter,
            debtBalanceAfter: debtAfter,
            trustBalanceAfter: trustAfter,
        });
    }

    return {
        ...store,
        payments: payments.map((p) => patchById.get(String(p.id || '')) ?? p),
    };
}

export function resolveUnifiedLedgerFinancialTotals(
    executionId: string | undefined,
    params: UnifiedLedgerTotalParams,
    readRaw?: (key: string) => unknown
): { totalOwedUnified: number; remainingUnified: number; debtPaid: number } {
    const raw = executionId && readRaw ? readRaw(storageKey(executionId)) : undefined;
    const store = parseUnifiedLedgerFromStorage(raw) ?? emptyStore();
    const totalOwedUnified = computeTotalOwedUnifiedFromStore(store, params);
    const debtPaidRaw = sumDebtPaidFromLedgerPayments(store);
    const debtPaid = Math.min(Math.max(0, debtPaidRaw), Math.max(0, totalOwedUnified));
    const remainingUnified = Math.max(0, totalOwedUnified - debtPaid);
    return { totalOwedUnified, remainingUnified, debtPaid };
}

/** متبقي الوعاء — المصدر الوحيد لمصفوفة الحجز */
export { resolveRemainingBalanceFromFinancialCenter } from './unifiedLedgerLite';

export function notifyUnifiedLedgerUpdated(executionId?: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent('hami-unified-ledger-updated', {
                detail: { executionId: String(executionId ?? '').trim() },
            })
        );
    } catch {
        /* ignore */
    }
}

export function resolvePersistedLedgerStore(
    stateStore: UnifiedLedgerStore,
    next: UnifiedLedgerStore,
    cached: UnifiedLedgerStore | null
): UnifiedLedgerStore {
    const base = cached ? pickRicherLedgerStore(stateStore, cached) : stateStore;
    const merged = pickRicherLedgerStore(base, next);
    return {
        ...merged,
        ...next,
        lawyerFees: next.lawyerFees,
        expenses: next.expenses,
        payments: next.payments,
        collectionRequestedTotal: (() => {
            const a = merged.collectionRequestedTotal;
            const b = next.collectionRequestedTotal;
            if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
            return next.collectionRequestedTotal ?? merged.collectionRequestedTotal ?? null;
        })(),
        collectionRequestActive: next.collectionRequestActive,
        evictionLedgerActivated: next.evictionLedgerActivated,
        completed: next.completed,
        garnishment: next.garnishment,
        pendingSettlement: next.pendingSettlement,
        settlementBreachTriggeredAt:
            next.settlementBreachTriggeredAt !== undefined
                ? next.settlementBreachTriggeredAt
                : merged.settlementBreachTriggeredAt ?? null,
        alimonyLastAccrualThroughYmd:
            next.alimonyLastAccrualThroughYmd !== undefined
                ? next.alimonyLastAccrualThroughYmd
                : merged.alimonyLastAccrualThroughYmd ?? null,
    };
}

/** قراءة حالة إخلال التسوية من الوعاء الموحّد */
export { resolveSettlementGuarantorGateFromLedger } from './unifiedLedgerLite';
