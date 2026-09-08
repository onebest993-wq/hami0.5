import { describe, expect, it, beforeEach } from 'vitest';
import { REPOSITORY_PERF_BUDGET } from '@/app/services/repository/repositoryPerfBudget';
import { clearRepositoryPerfMarks } from '@/app/services/repository/repositoryPerfMetrics';

describe('repositoryPerfBudget', () => {
    beforeEach(() => {
        clearRepositoryPerfMarks();
        if (typeof performance !== 'undefined' && typeof performance.clearMarks === 'function') {
            performance.clearMarks();
        }
        if (typeof performance !== 'undefined' && typeof performance.clearMeasures === 'function') {
            performance.clearMeasures();
        }
    });
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
