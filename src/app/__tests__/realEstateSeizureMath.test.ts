import { describe, expect, it } from 'vitest';
import { computeNewDossierAmountAfterRealEstateSale } from '@/app/utils/realEstateSeizureMath';

describe('computeNewDossierAmountAfterRealEstateSale', () => {
    it('returns 0 when current amount is non-positive', () => {
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: 0, salePriceIqd: 1000 })
        ).toBe(0);
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: -10, salePriceIqd: 1000 })
        ).toBe(0);
    });

    it('returns current amount when sale price is invalid or non-positive', () => {
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: 5000, salePriceIqd: 0 })
        ).toBe(5000);
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: 5000, salePriceIqd: -1 })
        ).toBe(5000);
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: 5000, salePriceIqd: Number.NaN })
        ).toBe(5000);
    });

    it('subtracts sale price and clamps to zero', () => {
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: 10000, salePriceIqd: 2500 })
        ).toBe(7500);
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: 10000, salePriceIqd: 10000 })
        ).toBe(0);
        expect(
            computeNewDossierAmountAfterRealEstateSale({ currentDossierAmount: 10000, salePriceIqd: 15000 })
        ).toBe(0);
    });
});

