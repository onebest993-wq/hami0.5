import { describe, expect, it } from 'vitest';
import {
    patchClearCollectionOnRejection,
    resolveCanApplySettlementAmount,
    resolveCollectionVesselMismatchPatch,
    resolveDebtEditLockReason,
} from '../focLedgerGuards';
import { emptyStore } from '../utils';

const baseParams = {
    principal_amount: 1_000_000,
    courtOrderedFeesSafe: 0,
    evictionLawyerFeeWaivedAtIntake: false,
    executionExpensesSumSafe: 0,
    evictionCaseExpensesSumSafe: 0,
    seedLawyerId: 'seed-lawyer-ex-1',
    seedExpenseId: 'seed-exp-ex-1',
};

describe('focLedgerGuards', () => {
    it('resolveDebtEditLockReason requires executionId', () => {
        expect(
            resolveDebtEditLockReason({
                store: emptyStore(),
                unifiedCollectionDecisionState: null,
            }),
        ).toContain('إضبارة');
    });

    it('patchClearCollectionOnRejection clears active collection on rejection', () => {
        const store = { ...emptyStore(), collectionRequestActive: true };
        const patched = patchClearCollectionOnRejection({ store, decisionState: 'rejected' });
        expect(patched?.collectionRequestActive).toBe(false);
    });

    it('resolveCanApplySettlementAmount allows alimony ongoing above remaining', () => {
        expect(
            resolveCanApplySettlementAmount({
                settlementAmount: 500_000,
                remainingUnified: 100_000,
                isAlimonyClaim: true,
                ongoingMonthlyAlimonyEffective: 250_000,
            }),
        ).toBe(true);
    });

    it('resolveCollectionVesselMismatchPatch adjusts frozen total after principal change', () => {
        const store = {
            ...emptyStore(),
            collectionRequestActive: true,
            collectionRequestedTotal: 1_000_000,
        };
        const patch = resolveCollectionVesselMismatchPatch({
            executionId: 'ex-1',
            store,
            ledgerTotalParams: { ...baseParams, principal_amount: 1_200_000 },
            unifiedCollectionExecutorApproved: true,
            currentTotal: 1_200_000,
            handledNoticeKey: null,
        });
        expect(patch?.store.collectionRequestActive).toBe(false);
        expect(patch?.store.collectionRequestedTotal).toBe(1_200_000);
    });
});
