import { describe, expect, it } from 'vitest';
import {
    applyOngoingAlimonyBreachAccrual,
    computeOngoingAlimonyAccrualByDays,
    resolveSettlementPeriodStartYmd,
} from '../alimonyOngoingAccrual';
import { emptyStore } from '../utils';
import type { PendingSettlement } from '../types';

describe('computeOngoingAlimonyAccrualByDays', () => {
    it('accrues pro-rata by days (monthly ÷ 30)', () => {
        const { billableDays, accruedAmount } = computeOngoingAlimonyAccrualByDays(
            300_000,
            '2026-05-01',
            '2026-06-01',
        );
        expect(billableDays).toBe(31);
        expect(accruedAmount).toBe(310_000);
    });

    it('returns zero when period end is not after start', () => {
        expect(computeOngoingAlimonyAccrualByDays(300_000, '2026-06-01', '2026-06-01')).toEqual({
            billableDays: 0,
            accruedAmount: 0,
        });
    });
});

describe('applyOngoingAlimonyBreachAccrual', () => {
    const pending: PendingSettlement = {
        id: 'stl-1',
        amount: 300_000,
        dueDate: '2026-06-01',
        createdAt: '2026-05-01T00:00:00.000Z',
        periodStartYmd: '2026-05-01',
        tracksOngoingAlimony: true,
    };

    it('adds unpaid ongoing alimony to principal and cancels settlement', () => {
        const store = {
            ...emptyStore(),
            principalSnapshot: 2_000_000,
            pendingSettlement: pending,
        };
        const result = applyOngoingAlimonyBreachAccrual({
            store,
            pending,
            monthlyAmount: 300_000,
            currentYmd: '2026-06-15',
            basePrincipal: 2_000_000,
            atIso: '2026-06-15T12:00:00.000Z',
        });

        expect(result.accruedAmount).toBeGreaterThan(0);
        expect(result.billableDays).toBe(45);
        expect(result.newPrincipalTotal).toBe(2_000_000 + result.accruedAmount);
        expect(result.store.pendingSettlement).toBeNull();
        expect(result.store.settlementBreachTriggeredAt).toBeTruthy();
        expect(result.store.principalSnapshot).toBe(result.newPrincipalTotal);
        expect(result.store.alimonyLastAccrualThroughYmd).toBe('2026-06-15');
    });

    it('uses month before due date when periodStartYmd is missing', () => {
        const start = resolveSettlementPeriodStartYmd({
            ...pending,
            periodStartYmd: undefined,
        });
        expect(start).toBe('2026-05-01');
    });
});
