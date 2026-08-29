import { describe, expect, it } from 'vitest';
import { getFinancialSplitHint } from '../useImprisonmentEligibility';

describe('getFinancialSplitHint', () => {
    it('null إن كان المدينون أقل من اثنين أو كلهم متضامنين', () => {
        expect(getFinancialSplitHint('استحصال دين مالي', [{ isSolidaryLiability: false }])).toBeNull();
        expect(
            getFinancialSplitHint('استحصال دين مالي', [
                { isSolidaryLiability: true },
                { isSolidaryLiability: true },
            ]),
        ).toBeNull();
    });

    it('يطلب مبلغ المستقلين عند مطالبة مالية ومدينين مختلطين', () => {
        const hint = getFinancialSplitHint('استحصال دين مالي', [
            { isSolidaryLiability: false },
            { isSolidaryLiability: true },
        ]);
        expect(hint).toContain('مدين مستقل');
    });
});
