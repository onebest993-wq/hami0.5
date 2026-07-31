import { describe, expect, it } from 'vitest';
import {
    hydrateUnifiedLedgerFromRawStorage,
    normalizeStoredExpenseRows,
    normalizeStoredLawyerFeeRows,
    normalizeStoredPaymentRows,
    reseedDossierBaselineLedgerRows,
    seedUnifiedLedgerStoreForExecution,
    type UnifiedLedgerHydrateParams,
} from '../unifiedLedgerHydrate';
import { emptyStore } from '../utils';

const baseParams: UnifiedLedgerHydrateParams = {
    principal_amount: 150_000,
    courtOrderedFeesSafe: 0,
    evictionLawyerFeeWaivedAtIntake: false,
    executionExpensesSumSafe: 0,
    evictionCaseExpensesSumSafe: 0,
    seedLawyerId: 'seed-lawyer-ex-1',
    seedExpenseId: 'seed-exp-ex-1',
    executionId: 'ex-1',
};

describe('normalizeStoredLawyerFeeRows / normalizeStoredExpenseRows / normalizeStoredPaymentRows', () => {
    it('drops rows with non-positive or malformed amounts and fills sane defaults', () => {
        const fees = normalizeStoredLawyerFeeRows([
            { id: 'lf-1', amount: '25,000', label: 'أتعاب', at: '2026-01-01T00:00:00.000Z' },
            { id: 'lf-2', amount: 0, label: 'صفر' },
            { amount: 'ليس رقماً' },
        ]);
        expect(fees).toHaveLength(1);
        expect(fees[0]).toMatchObject({ id: 'lf-1', amount: 25_000 });

        const expenses = normalizeStoredExpenseRows([
            { id: 'ex-1', amount: 5_000, reason: 'مصاريف' },
            { id: 'ex-2', amount: -10 },
        ]);
        expect(expenses).toHaveLength(1);
        expect(expenses[0]).toMatchObject({ id: 'ex-1', amount: 5_000 });
    });

    it('coerces payment entryType/kind to safe fallbacks and clamps balanceAfter', () => {
        const payments = normalizeStoredPaymentRows([
            { id: 'pay-1', amount: 1_000, kind: 'full', entryType: 'disburse', balanceAfter: -50 },
            { id: 'pay-2', amount: 2_000, entryType: 'unknown-kind' },
        ]);
        expect(payments).toHaveLength(2);
        expect(payments[0]).toMatchObject({ kind: 'full', entryType: 'disburse', balanceAfter: 0 });
        expect(payments[1]).toMatchObject({ kind: 'partial', entryType: 'collect' });
    });

    it('returns empty arrays for non-array input instead of throwing', () => {
        expect(normalizeStoredLawyerFeeRows(null)).toEqual([]);
        expect(normalizeStoredExpenseRows(undefined)).toEqual([]);
        expect(normalizeStoredPaymentRows('not-an-array')).toEqual([]);
    });
});

describe('reseedDossierBaselineLedgerRows', () => {
    it('reseeds lawyer fee + expense baseline rows from dossier params, replacing stale seed amounts', () => {
        const lawyerFees = [
            { id: 'seed-lawyer-ex-1', amount: 10_000, label: 'قديم', at: '2026-01-01T00:00:00.000Z' },
            { id: 'lf-user-1', amount: 5_000, label: 'إضافية', at: '2026-01-02T00:00:00.000Z' },
        ];
        const expenses = [{ id: 'seed-exp-ex-1', amount: 1_000, reason: 'قديم', at: '2026-01-01T00:00:00.000Z' }];

        const { lawyerFees: nextLawyer, expenses: nextExpenses } = reseedDossierBaselineLedgerRows(
            lawyerFees,
            expenses,
            'ex-1',
            { ...baseParams, courtOrderedFeesSafe: 33_333, executionExpensesSumSafe: 7_000 }
        );

        expect(nextLawyer.find((r) => r.id === 'seed-lawyer-ex-1')?.amount).toBe(33_333);
        expect(nextLawyer.some((r) => r.id === 'lf-user-1')).toBe(true);
        expect(nextExpenses.find((r) => r.id === 'seed-exp-ex-1')?.amount).toBe(7_000);
    });

    it('drops the expense seed row entirely once dossier baseline drops to zero', () => {
        const expenses = [{ id: 'seed-exp-ex-1', amount: 4_000, reason: 'قديم', at: '2026-01-01T00:00:00.000Z' }];
        const { expenses: nextExpenses } = reseedDossierBaselineLedgerRows([], expenses, 'ex-1', {
            ...baseParams,
            executionExpensesSumSafe: 0,
            evictionCaseExpensesSumSafe: 0,
        });
        expect(nextExpenses).toHaveLength(0);
    });

    it('drops the lawyer seed row when the fee was waived at intake, even if courtOrderedFeesSafe > 0', () => {
        const lawyerFees = [{ id: 'seed-lawyer-ex-1', amount: 10_000, label: 'قديم', at: '2026-01-01T00:00:00.000Z' }];
        const { lawyerFees: nextLawyer } = reseedDossierBaselineLedgerRows([...lawyerFees], [], 'ex-1', {
            ...baseParams,
            courtOrderedFeesSafe: 20_000,
            evictionLawyerFeeWaivedAtIntake: true,
        });
        expect(nextLawyer).toHaveLength(0);
    });
});

describe('hydrateUnifiedLedgerFromRawStorage', () => {
    it('normalizes a stored ledger, reseeds unlocked baseline rows, and marks it seeded', () => {
        const raw = {
            lawyerFees: [{ id: 'lf-user-1', amount: 12_000, label: 'إضافية', at: '2026-01-02T00:00:00.000Z' }],
            expenses: [],
            payments: [],
            collectionRequestActive: false,
        };
        const { store, persistImmediately } = hydrateUnifiedLedgerFromRawStorage(
            raw,
            { ...baseParams, courtOrderedFeesSafe: 30_000, executionExpensesSumSafe: 5_000 },
            undefined
        );
        expect(store.lawyerFees.some((r) => r.id === 'seed-lawyer-ex-1' && r.amount === 30_000)).toBe(true);
        expect(store.lawyerFees.some((r) => r.id === 'lf-user-1')).toBe(true);
        expect(store.expenses.some((r) => r.id === 'seed-exp-ex-1' && r.amount === 5_000)).toBe(true);
        expect(store.seeded).toBe(true);
        expect(persistImmediately).toBe(false);
    });

    it('clears a rejected collection request and signals immediate persistence of the cleared state', () => {
        const raw = { ...emptyStore(), collectionRequestActive: true, collectionRequestedTotal: 200_000 };
        const { store, persistImmediately } = hydrateUnifiedLedgerFromRawStorage(raw, baseParams, 'rejected');
        expect(store.collectionRequestActive).toBe(false);
        expect(persistImmediately).toBe(true);
    });

    it('does not reseed baseline rows while the ledger is locked by an active collection request', () => {
        const raw = {
            ...emptyStore(),
            collectionRequestActive: true,
            lawyerFees: [],
        };
        const { store } = hydrateUnifiedLedgerFromRawStorage(
            raw,
            { ...baseParams, courtOrderedFeesSafe: 40_000 },
            undefined
        );
        expect(store.lawyerFees.some((r) => r.id === 'seed-lawyer-ex-1')).toBe(false);
    });
});

describe('seedUnifiedLedgerStoreForExecution', () => {
    it('seeds a fresh store with dossier baseline lawyer fee, expense, and principal snapshot', () => {
        const next = seedUnifiedLedgerStoreForExecution({
            ...baseParams,
            principal_amount: 150_000,
            courtOrderedFeesSafe: 30_000,
            executionExpensesSumSafe: 5_000,
        });
        expect(next.principalSnapshot).toBe(150_000);
        expect(next.lawyerFees).toHaveLength(1);
        expect(next.lawyerFees[0]).toMatchObject({ id: 'seed-lawyer-ex-1', amount: 30_000 });
        expect(next.expenses[0]).toMatchObject({ id: 'seed-exp-ex-1', amount: 5_000 });
        expect(next.seeded).toBe(true);
    });

    it('leaves lawyer fees empty when the fee was waived at intake, regardless of courtOrderedFeesSafe', () => {
        const next = seedUnifiedLedgerStoreForExecution({
            ...baseParams,
            courtOrderedFeesSafe: 30_000,
            evictionLawyerFeeWaivedAtIntake: true,
        });
        expect(next.lawyerFees).toHaveLength(0);
    });
});
