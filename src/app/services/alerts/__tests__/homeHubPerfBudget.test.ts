import { describe, expect, it } from 'vitest';
import { HOME_HUB_PERF_BUDGET, type HomeHubPerfBudgetKey } from '@/app/services/alerts/homeHubPerfBudget';

describe('homeHubPerfBudget', () => {
    it('CI limits tighter than a cold hang and looser than the target', () => {
        const keys: HomeHubPerfBudgetKey[] = ['target', 'ciColdMax', 'ciCachedMax'];
        const { target, ciColdMax, ciCachedMax } = HOME_HUB_PERF_BUDGET.openToInteractiveMs;
        expect(keys).toEqual(Object.keys(HOME_HUB_PERF_BUDGET.openToInteractiveMs));
        expect(ciColdMax).toBeGreaterThan(target);
        expect(ciCachedMax).toBeLessThan(ciColdMax);
        expect(target).toBeLessThan(ciCachedMax);
    });
});
