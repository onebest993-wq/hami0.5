import { describe, expect, it } from 'vitest';
import { resolveSettlementUxTier } from '../settlementUxMatrix';

describe('settlementUxMatrix', () => {
    it('hidden when balance is zero', () => {
        expect(resolveSettlementUxTier(0)).toBe('hidden');
        expect(resolveSettlementUxTier(-100)).toBe('hidden');
    });

    it('buried for 1 to 500,000', () => {
        expect(resolveSettlementUxTier(1)).toBe('buried');
        expect(resolveSettlementUxTier(500_000)).toBe('buried');
    });

    it('secondary for 500,001 to 3,000,000', () => {
        expect(resolveSettlementUxTier(500_001)).toBe('secondary');
        expect(resolveSettlementUxTier(3_000_000)).toBe('secondary');
    });

    it('primary above 3,000,000', () => {
        expect(resolveSettlementUxTier(3_000_001)).toBe('primary');
        expect(resolveSettlementUxTier(16_000_000)).toBe('primary');
    });

    it('reactivity: payment crossing tier boundary', () => {
        expect(resolveSettlementUxTier(3_555_577)).toBe('primary');
        expect(resolveSettlementUxTier(2_900_000)).toBe('secondary');
        expect(resolveSettlementUxTier(400_000)).toBe('buried');
    });

    it('forceBuriedOnly keeps settlement in kebab regardless of remaining size', () => {
        const opts = { forceBuriedOnly: true };
        expect(resolveSettlementUxTier(1, opts)).toBe('buried');
        expect(resolveSettlementUxTier(500_000, opts)).toBe('buried');
        expect(resolveSettlementUxTier(2_000_000, opts)).toBe('buried');
        expect(resolveSettlementUxTier(16_000_000, opts)).toBe('buried');
        expect(resolveSettlementUxTier(0, opts)).toBe('hidden');
    });
});
