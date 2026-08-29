import { describe, expect, it } from 'vitest';
import { computeFocLedgerRemainingHint } from '../publishFocLedgerRemainingToIndex';
import { emptyStore } from '../utils';
import type { UnifiedLedgerTotalParams } from '../utils';

const params: UnifiedLedgerTotalParams = {
    principal_amount: 1_000_000,
    courtOrderedFeesSafe: 0,
    evictionLawyerFeeWaivedAtIntake: false,
    executionExpensesSumSafe: 0,
    evictionCaseExpensesSumSafe: 0,
    seedLawyerId: 'seed-lawyer-ex-remain',
    seedExpenseId: 'seed-exp-ex-remain',
};

describe('computeFocLedgerRemainingHint', () => {
    it('remaining equals total when the ledger has no collections', () => {
        const store = { ...emptyStore(), principalSnapshot: 1_000_000 };
        const hint = computeFocLedgerRemainingHint(store, params);
        expect(hint.totalOwed).toBe(1_000_000);
        expect(hint.remaining).toBe(1_000_000);
    });

    it('subtracts collect payments and can reach remaining 0', () => {
        const store = {
            ...emptyStore(),
            principalSnapshot: 1_000_000,
            payments: [
                {
                    id: 'pay-1',
                    amount: 400_000,
                    at: '2026-08-01T00:00:00.000Z',
                    kind: 'partial' as const,
                    entryType: 'collect' as const,
                    balanceAfter: 600_000,
                },
            ],
        };
        expect(computeFocLedgerRemainingHint(store, params).remaining).toBe(600_000);

        const paidOff = {
            ...store,
            payments: [
                {
                    ...store.payments[0],
                    id: 'pay-full',
                    amount: 1_000_000,
                    kind: 'full' as const,
                    balanceAfter: 0,
                },
            ],
        };
        expect(computeFocLedgerRemainingHint(paidOff, params).remaining).toBe(0);
    });
});
