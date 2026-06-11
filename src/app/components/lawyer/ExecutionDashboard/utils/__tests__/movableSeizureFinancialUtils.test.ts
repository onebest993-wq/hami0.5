import { describe, expect, it } from 'vitest';
import { storageCache } from '@/app/utils/storageCache';
import { emptyStore, storageKey, recomputeUnifiedLedgerPaymentSnapshots } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import {
    creditMovableSaleProceedsToTrustLedger,
    movableProceedsTrustPaymentId,
    resolveMovableSaleProceedsIqd,
} from '../movableSeizureFinancialUtils';
import type { SeizedMovable } from '@/app/types/execution';

const EX_ID = 'exec-test-movable-proceeds';
const MOV_ID = 'mov-1';

function soldMovable(amount: number): SeizedMovable {
    return {
        id: MOV_ID,
        movableDescription: 'سيارة',
        movableLocation: 'بغداد',
        judicialCustodianName: 'حارس',
        status: 'sold',
        seizedAtIso: new Date().toISOString(),
        finalAwardAmountIqd: amount,
        initialAwardAmountIqd: amount,
    };
}

describe('movable sale proceeds ledger sync', () => {
    it('resolveMovableSaleProceedsIqd prefers final award', () => {
        const m = soldMovable(5_000_000);
        expect(resolveMovableSaleProceedsIqd(m)).toBe(5_000_000);
    });

    it('credits trust and reduces remaining via collect', () => {
        storageCache.set(storageKey(EX_ID), emptyStore());
        const result = creditMovableSaleProceedsToTrustLedger({
            executionId: EX_ID,
            movable: soldMovable(2_000_000),
            totalOwedIqd: 5_000_000,
        });
        expect(result.created).toBe(true);
        expect(result.amount).toBe(2_000_000);

        const store = storageCache.get(storageKey(EX_ID)) as { payments: Array<{ amount: number; entryType?: string; trustBalanceAfter?: number; balanceAfter?: number }> };
        const row = store.payments.find((p) => p.amount === 2_000_000);
        expect(row?.entryType).toBe('collect');
        expect(row?.trustBalanceAfter).toBe(2_000_000);
        expect(row?.balanceAfter).toBe(3_000_000);
    });

    it('updates amount when sale price changes', () => {
        storageCache.set(storageKey(EX_ID), emptyStore());
        creditMovableSaleProceedsToTrustLedger({
            executionId: EX_ID,
            movable: soldMovable(101_202),
            totalOwedIqd: 5_055_556,
        });
        const updated = creditMovableSaleProceedsToTrustLedger({
            executionId: EX_ID,
            movable: soldMovable(5_000_000),
            totalOwedIqd: 5_055_556,
        });
        expect(updated.updated).toBe(true);
        expect(updated.amount).toBe(5_000_000);

        const store = storageCache.get(storageKey(EX_ID)) as { payments: Array<{ id: string; amount: number; balanceAfter?: number }> };
        const pid = movableProceedsTrustPaymentId(MOV_ID);
        const row = store.payments.find((p) => p.id === pid);
        expect(row?.amount).toBe(5_000_000);
        expect(row?.balanceAfter).toBe(55_556);
    });

    it('recomputeUnifiedLedgerPaymentSnapshots keeps trust and remaining aligned', () => {
        const store = recomputeUnifiedLedgerPaymentSnapshots(
            {
                ...emptyStore(),
                payments: [
                    {
                        id: 'p1',
                        amount: 1_000_000,
                        at: '2026-01-01T00:00:00.000Z',
                        kind: 'partial',
                        entryType: 'collect',
                        balanceAfter: 0,
                    },
                    {
                        id: 'p2',
                        amount: 500_000,
                        at: '2026-02-01T00:00:00.000Z',
                        kind: 'partial',
                        entryType: 'collect',
                        balanceAfter: 0,
                    },
                ],
            },
            4_000_000
        );
        const last = [...store.payments].sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1)!;
        expect(last.trustBalanceAfter).toBe(1_500_000);
        expect(last.balanceAfter).toBe(2_500_000);
    });
});
