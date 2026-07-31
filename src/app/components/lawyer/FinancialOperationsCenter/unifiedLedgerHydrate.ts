/**
 * منطق تحميل/تسوية/تطبيع الوعاء الموحّد من التخزين — مستخلص من FinancialOperationsCenter
 * ليبقى خالياً من React (دوال نقيّة قابلة للاختبار بمعزل عن المكوّن).
 */
import { emptyStore, isUnifiedLedgerLocked, parseStoredMoney, type UnifiedLedgerTotalParams } from './utils';
import type {
    ExpenseRow,
    LawyerFeeRow,
    LocalPaymentRow,
    PendingSettlement,
    UnifiedLedgerStore,
} from './types';
import type { UnifiedCollectionDecisionState } from '@/app/utils/executorSeizureDecisionQueue';

export type UnifiedLedgerHydrateParams = UnifiedLedgerTotalParams & {
    executionId: string;
};

export function normalizeStoredLawyerFeeRows(raw: unknown): LawyerFeeRow[] {
    return (Array.isArray(raw) ? raw : [])
        .map((row) => ({
            id: String((row as Partial<LawyerFeeRow>).id ?? `lf-${Date.now()}`),
            amount: parseStoredMoney((row as Partial<LawyerFeeRow>).amount),
            label: String((row as Partial<LawyerFeeRow>).label ?? 'أتعاب محاماة محكوم بها'),
            at: String((row as Partial<LawyerFeeRow>).at ?? new Date().toISOString()),
        }))
        .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
}

export function normalizeStoredExpenseRows(raw: unknown): ExpenseRow[] {
    return (Array.isArray(raw) ? raw : [])
        .map((row) => ({
            id: String((row as Partial<ExpenseRow>).id ?? `ex-${Date.now()}`),
            amount: parseStoredMoney((row as Partial<ExpenseRow>).amount),
            reason: String((row as Partial<ExpenseRow>).reason ?? 'مصاريف تنفيذية'),
            at: String((row as Partial<ExpenseRow>).at ?? new Date().toISOString()),
        }))
        .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
}

export function normalizeStoredPaymentRows(raw: unknown): LocalPaymentRow[] {
    return (Array.isArray(raw) ? raw : [])
        .map((row) => {
            const amount = parseStoredMoney((row as Partial<LocalPaymentRow>).amount);
            const balanceAfter = parseStoredMoney((row as Partial<LocalPaymentRow>).balanceAfter);
            const etRaw = (row as Partial<LocalPaymentRow>).entryType;
            const entryType =
                etRaw === 'disburse' || etRaw === 'settlement' || etRaw === 'collect' ? etRaw : 'collect';
            return {
                id: String((row as Partial<LocalPaymentRow>).id ?? `pay-${Date.now()}`),
                amount,
                at: String((row as Partial<LocalPaymentRow>).at ?? new Date().toISOString()),
                kind:
                    (row as Partial<LocalPaymentRow>).kind === 'full' ? ('full' as const) : ('partial' as const),
                entryType,
                balanceAfter: Number.isFinite(balanceAfter) ? Math.max(0, balanceAfter) : 0,
            };
        })
        .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
}

export function normalizeStoredPendingSettlement(raw: unknown): PendingSettlement | null {
    if (!raw || typeof raw !== 'object') return null;
    const ps = raw as Partial<PendingSettlement>;
    return {
        id: String(ps.id || `stl-${Date.now()}`),
        amount: Math.max(0, parseStoredMoney(ps.amount) || 0),
        dueDate: String(ps.dueDate || ''),
        createdAt: String(ps.createdAt || new Date().toISOString()),
    };
}

/** يعيد بذر أتعاب المحامي/المصاريف من قيم الإضبارة الحالية — يُستخدم عند التحميل وعند تغيّر خصائص الإضبارة */
export function reseedDossierBaselineLedgerRows(
    lawyerFees: LawyerFeeRow[],
    expenses: ExpenseRow[],
    executionId: string,
    params: UnifiedLedgerTotalParams
): { lawyerFees: LawyerFeeRow[]; expenses: ExpenseRow[] } {
    const seedLawyerId = params.seedLawyerId || `seed-lawyer-${executionId}`;
    const seedExpenseId = params.seedExpenseId || `seed-exp-${executionId}`;
    const baseExp = params.executionExpensesSumSafe + params.evictionCaseExpensesSumSafe;

    const lawyerWithoutSeed = lawyerFees.filter((r) => r.id !== seedLawyerId);
    let nextLawyer = lawyerFees;
    if (params.evictionLawyerFeeWaivedAtIntake) {
        nextLawyer = lawyerWithoutSeed;
    } else if (params.courtOrderedFeesSafe > 0) {
        nextLawyer = [
            {
                id: seedLawyerId,
                amount: params.courtOrderedFeesSafe,
                label: 'أتعاب محكومة (من الإضبارة)',
                at: new Date().toISOString(),
            },
            ...lawyerWithoutSeed,
        ];
    }

    const expensesWithoutSeed = expenses.filter((r) => r.id !== seedExpenseId);
    const nextExpenses =
        baseExp > 0
            ? [
                  {
                      id: seedExpenseId,
                      amount: baseExp,
                      reason: 'مصاريف تنفيذية مسجّلة من الإضبارة',
                      at: new Date().toISOString(),
                  },
                  ...expensesWithoutSeed,
              ]
            : expensesWithoutSeed;

    return { lawyerFees: nextLawyer, expenses: nextExpenses };
}

export type UnifiedLedgerHydrateOutcome = {
    store: UnifiedLedgerStore;
    /** يجب حفظ الوعاء فوراً في التخزين (مثلاً عند إلغاء طلب تحصيل مرفوض كان محفوظاً) */
    persistImmediately: boolean;
};

/** يطبّع/يدمج وعاءً محفوظاً في التخزين مع قيم الإضبارة الحالية عند تحميل الإضبارة */
export function hydrateUnifiedLedgerFromRawStorage(
    raw: unknown,
    params: UnifiedLedgerHydrateParams,
    decisionState: UnifiedCollectionDecisionState | undefined
): UnifiedLedgerHydrateOutcome {
    const p =
        typeof raw === 'string' ? (JSON.parse(raw) as Partial<UnifiedLedgerStore>) : (raw as Partial<UnifiedLedgerStore>);

    let collectionRequestActive = Boolean(p.collectionRequestActive);
    if (decisionState === 'rejected') {
        collectionRequestActive = false;
    }

    const merged: UnifiedLedgerStore = {
        ...emptyStore(),
        ...p,
        lawyerFees: normalizeStoredLawyerFeeRows(p.lawyerFees),
        expenses: normalizeStoredExpenseRows(p.expenses),
        payments: normalizeStoredPaymentRows(p.payments),
        seeded: Boolean(p.seeded),
        principalSnapshot:
            typeof p.principalSnapshot === 'number' && Number.isFinite(p.principalSnapshot)
                ? Math.max(0, p.principalSnapshot)
                : null,
        collectionRequestActive,
        collectionRequestedTotal:
            typeof p.collectionRequestedTotal === 'number' ? Number(p.collectionRequestedTotal) : null,
        evictionLedgerActivated: Boolean(p.evictionLedgerActivated),
        pendingSettlement: normalizeStoredPendingSettlement(p.pendingSettlement),
        settlementBreachTriggeredAt:
            typeof p.settlementBreachTriggeredAt === 'string' && String(p.settlementBreachTriggeredAt).trim()
                ? String(p.settlementBreachTriggeredAt).trim()
                : null,
    };

    const ledgerLocked = isUnifiedLedgerLocked(params.executionId, merged, decisionState);
    if (!ledgerLocked) {
        const { lawyerFees, expenses } = reseedDossierBaselineLedgerRows(
            merged.lawyerFees,
            merged.expenses,
            params.executionId,
            params
        );
        merged.lawyerFees = lawyerFees;
        merged.expenses = expenses;
    }
    merged.seeded = merged.lawyerFees.length > 0 || merged.expenses.length > 0;

    return {
        store: merged,
        persistImmediately: !collectionRequestActive && Boolean(p.collectionRequestActive),
    };
}

/** يبني وعاءً موحّداً جديداً مبذوراً من قيم الإضبارة عند غياب أي تخزين سابق */
export function seedUnifiedLedgerStoreForExecution(params: UnifiedLedgerHydrateParams): UnifiedLedgerStore {
    const baseExp = params.executionExpensesSumSafe + params.evictionCaseExpensesSumSafe;
    const next: UnifiedLedgerStore = {
        ...emptyStore(),
        seeded: true,
        principalSnapshot:
            Number.isFinite(params.principal_amount) && params.principal_amount > 0
                ? Math.max(0, params.principal_amount)
                : null,
    };
    if (params.courtOrderedFeesSafe > 0 && !params.evictionLawyerFeeWaivedAtIntake) {
        next.lawyerFees = [
            {
                id: `seed-lawyer-${params.executionId}`,
                amount: params.courtOrderedFeesSafe,
                label: 'أتعاب محكومة (من الإضبارة)',
                at: new Date().toISOString(),
            },
        ];
    }
    if (baseExp > 0) {
        next.expenses = [
            {
                id: `seed-exp-${params.executionId}`,
                amount: baseExp,
                reason: 'مصاريف تنفيذية مسجّلة من الإضبارة',
                at: new Date().toISOString(),
            },
        ];
    }
    return next;
}
