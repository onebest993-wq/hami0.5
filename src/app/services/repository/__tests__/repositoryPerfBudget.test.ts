import { describe, expect, it } from 'vitest';
import { REPOSITORY_PERF_BUDGET } from '@/app/services/repository/repositoryPerfBudget';

describe('repositoryPerfBudget', () => {
    it('يحدّد حدود cold/cached أعلى من target', () => {
        const { target, ciColdMax, ciCachedMax } = REPOSITORY_PERF_BUDGET.openToInteractiveMs;
        expect(ciColdMax).toBeGreaterThan(target);
        expect(ciCachedMax).toBeGreaterThan(target);
        expect(ciCachedMax).toBeLessThan(ciColdMax);
    });

    it('metric name متسق مع Sentry reporter', () => {
        expect(REPOSITORY_PERF_BUDGET.sentryMetric).toBe('repository.open_to_interactive_ms');
    });
});
