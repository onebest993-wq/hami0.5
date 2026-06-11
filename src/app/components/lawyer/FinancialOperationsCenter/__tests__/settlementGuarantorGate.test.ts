import { describe, expect, it } from 'vitest';
import {
    applyNewSettlementRegistration,
    applySettlementBreachCancellation,
    resolveAmountGuarantorRequestVisible,
} from '../settlementGuarantorGate';
import { emptyStore } from '../utils';
import { resolveSettlementUxTier } from '../settlementUxMatrix';
import { shouldShowSettlementDueActions } from '../utils';

const BALANCE_HIGH = 5_000_000;
const BREACH_AT = '2026-06-04T12:00:00.000Z';

describe('settlementGuarantorGate', () => {
    describe('resolveAmountGuarantorRequestVisible', () => {
        it('hides amount guarantor in financial path while settlement is in standby (no breach)', () => {
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: null,
                    pendingSettlement: null,
                })
            ).toBe(false);
        });

        it('hides amount guarantor while pending settlement awaits due date', () => {
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: null,
                    pendingSettlement: {
                        id: 'stl-1',
                        amount: 500_000,
                        dueDate: '2026-06-10',
                        createdAt: '2026-06-01T00:00:00.000Z',
                    },
                })
            ).toBe(false);
            expect(shouldShowSettlementDueActions('2026-06-10', '2026-06-04')).toBe(false);
        });

        it('hides amount guarantor when due actions are visible but breach not recorded yet', () => {
            const dueDate = '2026-06-04';
            expect(shouldShowSettlementDueActions(dueDate, '2026-06-04')).toBe(true);
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: null,
                    pendingSettlement: {
                        id: 'stl-2',
                        amount: 500_000,
                        dueDate,
                        createdAt: '2026-06-01T00:00:00.000Z',
                    },
                })
            ).toBe(false);
        });

        it('shows amount guarantor after settlement breach cancellation', () => {
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: BREACH_AT,
                    pendingSettlement: null,
                })
            ).toBe(true);
        });

        it('hides amount guarantor when balance is zero even after breach', () => {
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: 0,
                    settlementBreachTriggeredAt: BREACH_AT,
                    pendingSettlement: null,
                })
            ).toBe(false);
        });

        it('returns to standby when a new settlement is registered after breach', () => {
            const store = applyNewSettlementRegistration(
                applySettlementBreachCancellation(emptyStore(), BREACH_AT),
                {
                    id: 'stl-3',
                    amount: 1_000_000,
                    dueDate: '2026-07-01',
                    createdAt: '2026-06-05T00:00:00.000Z',
                }
            );
            expect(store.settlementBreachTriggeredAt).toBeNull();
            expect(store.pendingSettlement?.id).toBe('stl-3');
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: store.settlementBreachTriggeredAt,
                    pendingSettlement: store.pendingSettlement,
                })
            ).toBe(false);
        });

        it('never shows guarantor for employee financial collection (hideAllGuarantorPresence)', () => {
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: BREACH_AT,
                    pendingSettlement: null,
                    hideAllGuarantorPresence: true,
                })
            ).toBe(false);
        });

        it('requires settlement breach for all claim types including non-financial', () => {
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: false,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: null,
                    pendingSettlement: null,
                })
            ).toBe(false);
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: false,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: BREACH_AT,
                    pendingSettlement: null,
                })
            ).toBe(true);
        });

        it('settlement UX hidden does not auto-show guarantor — still requires breach', () => {
            const remaining = 300_000;
            expect(resolveSettlementUxTier(remaining)).toBe('buried');
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: remaining,
                    settlementBreachTriggeredAt: null,
                    pendingSettlement: null,
                })
            ).toBe(false);
        });
    });

    describe('applySettlementBreachCancellation', () => {
        it('clears pending settlement and records breach timestamp', () => {
            const store = {
                ...emptyStore(),
                pendingSettlement: {
                    id: 'stl-x',
                    amount: 750_000,
                    dueDate: '2026-06-04',
                    createdAt: '2026-05-01T00:00:00.000Z',
                },
            };
            const next = applySettlementBreachCancellation(store, BREACH_AT);
            expect(next.pendingSettlement).toBeNull();
            expect(next.settlementBreachTriggeredAt).toBe(BREACH_AT);
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: next.settlementBreachTriggeredAt,
                    pendingSettlement: next.pendingSettlement,
                })
            ).toBe(true);
        });
    });

    describe('settlement due actions vs guarantor visibility', () => {
        it('full breach lifecycle: due actions on → cancel → guarantor on', () => {
            const dueDate = '2026-06-04';
            const currentYmd = '2026-06-04';
            let store = {
                ...emptyStore(),
                pendingSettlement: {
                    id: 'stl-life',
                    amount: 900_000,
                    dueDate,
                    createdAt: '2026-05-15T00:00:00.000Z',
                },
            };

            expect(shouldShowSettlementDueActions(dueDate, currentYmd)).toBe(true);
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: store.settlementBreachTriggeredAt,
                    pendingSettlement: store.pendingSettlement,
                })
            ).toBe(false);

            store = applySettlementBreachCancellation(store, BREACH_AT);
            expect(
                resolveAmountGuarantorRequestVisible({
                    isFinancialDebtCollectionClaim: true,
                    financialCenterTotalIqd: BALANCE_HIGH,
                    settlementBreachTriggeredAt: store.settlementBreachTriggeredAt,
                    pendingSettlement: store.pendingSettlement,
                })
            ).toBe(true);
        });
    });
});
