import { describe, expect, it } from 'vitest';
import { PROFILE_PERF_BUDGET } from '@/app/services/profile/profilePerfBudget';

describe('profilePerfBudget', () => {
    it('يحدّد حدود cold/cached أعلى من target', () => {
        const { target, ciColdMax, ciCachedMax } = PROFILE_PERF_BUDGET.openToInteractiveMs;
        expect(ciColdMax).toBeGreaterThan(target);
        expect(ciCachedMax).toBeGreaterThan(target);
        expect(ciCachedMax).toBeLessThan(ciColdMax);
    });
});
