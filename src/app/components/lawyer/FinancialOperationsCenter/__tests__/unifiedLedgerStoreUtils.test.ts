import { describe, expect, it } from 'vitest';
import {
    computeTotalOwedUnifiedFromStore,
    emptyStore,
    freezeLedgerForCollection,
    parseUnifiedLedgerFromStorage,
    pickRicherLedgerStore,
    resolvePersistedLedgerStore,
    resolvePrincipalBasisFromStore,
    resolveSettlementGuarantorGateFromLedger,
} from '../utils';
import { resolveAmountGuarantorRequestVisible } from '../settlementGuarantorGate';
import { clearSettlementFromStore } from '../settlementSalaryExclusion';

const baseParams = {
    principal_amount: 150_000,
    courtOrderedFeesSafe: 0,
    evictionLawyerFeeWaivedAtIntake: false,
    executionExpensesSumSafe: 0,
    evictionCaseExpensesSumSafe: 0,
    seedLawyerId: 'seed-lawyer-ex-1',
    seedExpenseId: 'seed-exp-ex-1',
};

describe('resolvePrincipalBasisFromStore', () => {
    it('prefers live principal_amount over stale zero principalSnapshot', () => {
        const store = { ...emptyStore(), principalSnapshot: 0, seeded: true };
        expect(
            resolvePrincipalBasisFromStore(store, {
                ...baseParams,
                principal_amount: 2_189_220,
            }),
        ).toBe(2_189_220);
        expect(
            computeTotalOwedUnifiedFromStore(store, {
                ...baseParams,
                principal_amount: 2_189_220,
            }),
        ).toBe(2_189_220);
    });
});

describe('pickRicherLedgerStore', () => {
    it('preserves user-added fee rows when cached store is richer than stale react state', () => {
        const staleState = {
            ...emptyStore(),
            principalSnapshot: 150_000,
            lawyerFees: [
                {
                    id: 'seed-lawyer-ex-1',
                    amount: 0,
                    label: 'seed',
                    at: '2026-01-01T00:00:00.000Z',
                },
            ],
        };
        const cached = {
            ...staleState,
            lawyerFees: [
                ...staleState.lawyerFees,
                {
                    id: 'lf-user-1',
                    amount: 40_000,
                    label: 'أتعاب إضافية',
                    at: '2026-01-02T00:00:00.000Z',
                },
            ],
        };

        const merged = pickRicherLedgerStore(staleState, cached);
        expect(merged.lawyerFees).toHaveLength(2);
        expect(merged.lawyerFees.some((r) => r.id === 'lf-user-1' && r.amount === 40_000)).toBe(true);
    });

    it('keeps null pendingSettlement from state over cached settlement', () => {
        const pending = {
            id: 'stl-1',
            amount: 500_000,
            dueDate: '2026-07-01',
            createdAt: '2026-06-05T00:00:00.000Z',
        };
        const stateStore = { ...emptyStore(), pendingSettlement: null };
        const cached = { ...emptyStore(), pendingSettlement: pending };
        const merged = pickRicherLedgerStore(stateStore, cached);
        expect(merged.pendingSettlement).toBeNull();
    });
});

describe('freezeLedgerForCollection', () => {
    it('materializes dossier seed fees into frozen rows that survive prop changes', () => {
        const executionId = 'ex-1';
        const store = {
            ...emptyStore(),
            principalSnapshot: 150_000,
            lawyerFees: [
                {
                    id: `seed-lawyer-${executionId}`,
                    amount: 33_333,
                    label: 'أتعاب محكومة (من الإضبارة)',
                    at: '2026-01-01T00:00:00.000Z',
                },
            ],
        };
        const frozen = freezeLedgerForCollection(store, executionId, {
            ...baseParams,
            courtOrderedFeesSafe: 33_333,
        });
        expect(frozen.lawyerFees.some((r) => r.id === `frozen-lawyer-${executionId}` && r.amount === 33_333)).toBe(
            true
        );
        expect(frozen.lawyerFees.some((r) => r.id === `seed-lawyer-${executionId}`)).toBe(false);

        const afterPropsDrop = computeTotalOwedUnifiedFromStore(frozen, {
            ...baseParams,
            courtOrderedFeesSafe: 0,
        });
        expect(afterPropsDrop).toBe(183_333);
    });
});

describe('resolvePersistedLedgerStore', () => {
    it('honors payment removal on undo instead of re-merging cached rows', () => {
        const pay1 = {
            id: 'pay-1',
            amount: 10_000,
            at: '2026-01-01T00:00:00.000Z',
            kind: 'partial' as const,
            entryType: 'collect' as const,
            balanceAfter: 90_000,
        };
        const pay2 = {
            id: 'pay-2',
            amount: 5_000,
            at: '2026-01-02T00:00:00.000Z',
            kind: 'partial' as const,
            entryType: 'collect' as const,
            balanceAfter: 85_000,
        };
        const stateStore = { ...emptyStore(), payments: [pay2, pay1] };
        const cached = { ...emptyStore(), payments: [pay2, pay1] };
        const next = { ...stateStore, payments: [pay1] };
        const resolved = resolvePersistedLedgerStore(stateStore, next, cached);
        expect(resolved.payments).toHaveLength(1);
        expect(resolved.payments[0]?.id).toBe('pay-1');
    });

    it('honors collectionRequestActive false on retract', () => {
        const stateStore = { ...emptyStore(), collectionRequestActive: true };
        const cached = { ...emptyStore(), collectionRequestActive: true };
        const next = { ...stateStore, collectionRequestActive: false, collectionRequestedTotal: null };
        const resolved = resolvePersistedLedgerStore(stateStore, next, cached);
        expect(resolved.collectionRequestActive).toBe(false);
    });

    it('clears pending settlement when next explicitly sets null (not restored from cache)', () => {
        const pending = {
            id: 'stl-1',
            amount: 500_000,
            dueDate: '2026-07-01',
            createdAt: '2026-06-05T00:00:00.000Z',
        };
        const stateStore = { ...emptyStore(), pendingSettlement: pending };
        const cached = { ...emptyStore(), pendingSettlement: pending };
        const next = clearSettlementFromStore(stateStore);
        const resolved = resolvePersistedLedgerStore(stateStore, next, cached);
        expect(resolved.pendingSettlement).toBeNull();
        expect(resolved.settlementBreachTriggeredAt).toBeNull();
    });

    it('persists settlement breach flag and clears it on new settlement registration', () => {
        const breachAt = '2026-06-04T12:00:00.000Z';
        const stateStore = { ...emptyStore() };
        const cached = { ...emptyStore() };
        const breached = resolvePersistedLedgerStore(stateStore, {
            ...stateStore,
            pendingSettlement: null,
            settlementBreachTriggeredAt: breachAt,
        }, cached);
        expect(breached.settlementBreachTriggeredAt).toBe(breachAt);

        const reregistered = resolvePersistedLedgerStore(breached, {
            ...breached,
            pendingSettlement: {
                id: 'stl-1',
                amount: 500_000,
                dueDate: '2026-07-01',
                createdAt: '2026-06-05T00:00:00.000Z',
            },
            settlementBreachTriggeredAt: null,
        }, breached);
        expect(reregistered.settlementBreachTriggeredAt).toBeNull();
        expect(reregistered.pendingSettlement?.id).toBe('stl-1');
    });
});

describe('resolveSettlementGuarantorGateFromLedger', () => {
    it('reads breach and pending from the same ledger blob used by seizure sync', () => {
        const store = {
            ...emptyStore(),
            settlementBreachTriggeredAt: '2026-06-04T12:00:00.000Z',
        };
        const parsed = parseUnifiedLedgerFromStorage(store);
        expect(parsed?.settlementBreachTriggeredAt).toBe('2026-06-04T12:00:00.000Z');

        const gate = resolveSettlementGuarantorGateFromLedger({
            executionId: 'ex-sync',
            readRaw: () => store,
        });
        expect(gate.pendingSettlement).toBeNull();
        expect(
            resolveAmountGuarantorRequestVisible({
                isFinancialDebtCollectionClaim: true,
                financialCenterTotalIqd: 4_000_000,
                settlementBreachTriggeredAt: gate.settlementBreachTriggeredAt,
                pendingSettlement: gate.pendingSettlement,
            })
        ).toBe(true);
    });
});

describe('computeTotalOwedUnifiedFromStore', () => {
    it('includes extra lawyer fees beyond dossier baseline', () => {
        const store = {
            ...emptyStore(),
            principalSnapshot: 150_000,
            lawyerFees: [
                {
                    id: 'lf-user-1',
                    amount: 25_000,
                    label: 'أتعاب إضافية',
                    at: '2026-01-02T00:00:00.000Z',
                },
            ],
        };

        expect(computeTotalOwedUnifiedFromStore(store, baseParams)).toBe(175_000);
    });

    it('keeps submitted collection snapshot even if extras were removed from rows', () => {
        const store = {
            ...emptyStore(),
            principalSnapshot: 150_000,
            collectionRequestedTotal: 190_000,
            collectionRequestActive: true,
            lawyerFees: [],
        };

        expect(computeTotalOwedUnifiedFromStore(store, baseParams)).toBe(190_000);
    });
});
