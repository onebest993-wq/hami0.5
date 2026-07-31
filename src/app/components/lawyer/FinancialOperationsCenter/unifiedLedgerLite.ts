import type { UnifiedLedgerStore } from './types';
import { unifiedFundsLedgerStorageKey } from '@/app/utils/unifiedFundsLedgerStorage';

export type UnifiedLedgerTotalParams = {
    principal_amount: number;
    courtOrderedFeesSafe: number;
    evictionLawyerFeeWaivedAtIntake: boolean;
    executionExpensesSumSafe: number;
    evictionCaseExpensesSumSafe: number;
    seedLawyerId: string;
    seedExpenseId: string;
};

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

function frozenLawyerFeeId(executionId: string): string {
    return `frozen-lawyer-${executionId}`;
}

function frozenExpenseId(executionId: string): string {
    return `frozen-exp-${executionId}`;
}

function resolvePrincipalBasisFromStore(
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams,
): number {
    const fromParams =
        Number.isFinite(params.principal_amount) && params.principal_amount > 0
            ? Math.max(0, params.principal_amount)
            : 0;
    const snap =
        typeof store.principalSnapshot === 'number' && Number.isFinite(store.principalSnapshot)
            ? Math.max(0, store.principalSnapshot)
            : null;
    if (fromParams > 0 && (snap === null || snap === 0)) return fromParams;
    if (snap !== null) return snap;
    return fromParams;
}

export function computeTotalOwedUnifiedFromStore(
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams,
): number {
    const executionIdFromSeed = params.seedLawyerId.replace(/^seed-lawyer-/, '');
    const hasFrozenLawyer = store.lawyerFees.some(
        (r) => r.id === frozenLawyerFeeId(executionIdFromSeed) || String(r.id).startsWith('frozen-lawyer-'),
    );
    const hasFrozenExpenses = store.expenses.some(
        (r) => r.id === frozenExpenseId(executionIdFromSeed) || String(r.id).startsWith('frozen-exp-'),
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

function sumDebtPaidFromLedgerPayments(store: UnifiedLedgerStore): number {
    let debtPaid = 0;
    for (const r of store.payments) {
        const amt = Number.isFinite(r.amount) ? r.amount : 0;
        const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement' | 'debt_adjustment';
        if (et === 'disburse') continue;
        debtPaid += amt;
    }
    return debtPaid;
}

export function recomputeUnifiedLedgerPaymentSnapshots(
    store: UnifiedLedgerStore,
    totalOwedUnified: number,
): UnifiedLedgerStore {
    const payments = Array.isArray(store.payments) ? [...store.payments] : [];
    if (payments.length === 0) return store;

    const totalOwed = Math.max(0, Math.trunc(Number(totalOwedUnified) || 0));
    const sorted = [...payments].sort((a, b) =>
        String(a.at || '').localeCompare(String(b.at || ''), undefined, { numeric: true }),
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
    readRaw?: (key: string) => unknown,
): { totalOwedUnified: number; remainingUnified: number; debtPaid: number } {
    const raw = executionId && readRaw ? readRaw(storageKey(executionId)) : undefined;
    const store = parseUnifiedLedgerFromStorage(raw) ?? emptyStore();
    const totalOwedUnified = computeTotalOwedUnifiedFromStore(store, params);
    const debtPaidRaw = sumDebtPaidFromLedgerPayments(store);
    const debtPaid = Math.min(Math.max(0, debtPaidRaw), Math.max(0, totalOwedUnified));
    const remainingUnified = Math.max(0, totalOwedUnified - debtPaid);
    return { totalOwedUnified, remainingUnified, debtPaid };
}

export function notifyUnifiedLedgerUpdated(executionId?: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent('hami-unified-ledger-updated', {
                detail: { executionId: String(executionId ?? '').trim() },
            }),
        );
    } catch {
        /* ignore */
    }
}

/** متبقي الوعاء — المصدر الوحيد لمصفوفة الحجز */
export function resolveRemainingBalanceFromFinancialCenter(args: {
    executionId?: string;
    ledgerParams: UnifiedLedgerTotalParams;
    readRaw?: (key: string) => unknown;
}): number {
    const { remainingUnified } = resolveUnifiedLedgerFinancialTotals(
        args.executionId,
        args.ledgerParams,
        args.readRaw,
    );
    return Math.max(0, Math.round(remainingUnified));
}

/** قراءة حالة إخلال التسوية من الوعاء الموحّد */
export function resolveSettlementGuarantorGateFromLedger(args: {
    executionId?: string;
    readRaw?: (key: string) => unknown;
}): {
    settlementBreachTriggeredAt: string | null;
    pendingSettlement: UnifiedLedgerStore['pendingSettlement'];
} {
    const raw =
        args.executionId && args.readRaw ? args.readRaw(storageKey(args.executionId)) : undefined;
    const store = parseUnifiedLedgerFromStorage(raw) ?? emptyStore();
    return {
        settlementBreachTriggeredAt: store.settlementBreachTriggeredAt,
        pendingSettlement: store.pendingSettlement,
    };
}
