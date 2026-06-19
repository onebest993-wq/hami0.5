import { describe, expect, it } from 'vitest';
import { resolveManualDebtorAllocatedShares } from '../executionFormUtils';

describe('resolveManualDebtorAllocatedShares', () => {
    it('assigns manual amounts to independent debtors and remainder to solidary', () => {
        const result = resolveManualDebtorAllocatedShares(
            5_000_000,
            [true, false, true],
            [0, 3_000_000, 0],
        );
        expect(result.independentSum).toBe(3_000_000);
        expect(result.solidaryRemainder).toBe(2_000_000);
        expect(result.shares).toEqual([2_000_000, 3_000_000, 2_000_000]);
    });

    it('gives each solidary debtor the full remainder (joint liability display)', () => {
        const result = resolveManualDebtorAllocatedShares(
            5_000_000,
            [true, true, false],
            [0, 0, 3_000_000],
        );
        expect(result.shares).toEqual([2_000_000, 2_000_000, 3_000_000]);
    });

    it('sums independent manual entries only', () => {
        const result = resolveManualDebtorAllocatedShares(
            10_000_000,
            [false, false],
            [4_000_000, 3_000_000],
        );
        expect(result.independentSum).toBe(7_000_000);
        expect(result.solidaryRemainder).toBe(3_000_000);
        expect(result.shares).toEqual([4_000_000, 3_000_000]);
    });
});
