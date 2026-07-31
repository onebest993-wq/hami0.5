import { describe, expect, it } from 'vitest';
import {
    computePrincipalDebtAmount,
    hasEvictionDataSignals,
    parseExecutionMoneyLike,
    resolveExecutionClaimTypeFlags,
    resolveIsEvictionExecutionModule,
} from '../executionDashboardClaimFinancials';

describe('executionDashboardClaimFinancials', () => {
    it('parseExecutionMoneyLike normalizes Arabic digits', () => {
        expect(parseExecutionMoneyLike('١٢٣٤')).toBe(1234);
        expect(parseExecutionMoneyLike('invalid')).toBe(0);
    });

    it('computePrincipalDebtAmount returns 0 for non-financial claims', () => {
        expect(
            computePrincipalDebtAmount({
                executionData: { claimTypes: ['مشاهدة طفل'] },
                parsedDebtAmount: 5000,
                isNonFinancialClaim: true,
                isMaritalFurnitureClaim: false,
            }),
        ).toBe(0);
    });

    it('computePrincipalDebtAmount returns failed marital furniture total despite non-financial flag', () => {
        expect(
            computePrincipalDebtAmount({
                executionData: {
                    claimType: 'أثاث زوجية',
                    maritalFurnitureItems: [
                        {
                            id: 'a',
                            name: 'خزانة',
                            quantity: 1,
                            unitPriceIqd: 1_633_665,
                            delivered: false,
                            deliveryOutcome: 'failed',
                            deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                        },
                        {
                            id: 'b',
                            name: 'أريكة',
                            quantity: 1,
                            unitPriceIqd: 555_555,
                            delivered: false,
                            deliveryOutcome: 'failed',
                            deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                        },
                    ],
                },
                parsedDebtAmount: 0,
                isNonFinancialClaim: true,
                isMaritalFurnitureClaim: true,
            }),
        ).toBe(2_189_220);
    });

    it('hasEvictionDataSignals detects eviction boolean markers', () => {
        expect(hasEvictionDataSignals(null)).toBe(false);
        expect(
            hasEvictionDataSignals({
                eviction_executor_vacate_grant_approved: true,
            } as never),
        ).toBe(true);
    });

    it('resolveIsEvictionExecutionModule rejects specific delivery claims', () => {
        expect(
            resolveIsEvictionExecutionModule({
                claimTypeForExecutionModule: 'تسليم عيني',
                isMaritalFurnitureClaim: false,
                useEvictionFieldProcedures: true,
                hasEvictionSignals: true,
                hasEvictionTimelineSignals: false,
            }),
        ).toBe(false);
    });

    it('resolveIsEvictionExecutionModule rejects marital furniture even with eviction signals', () => {
        expect(
            resolveIsEvictionExecutionModule({
                claimTypeForExecutionModule: 'تخلية',
                isMaritalFurnitureClaim: true,
                useEvictionFieldProcedures: true,
                hasEvictionSignals: true,
                hasEvictionTimelineSignals: false,
            }),
        ).toBe(false);
    });
});
