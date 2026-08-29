import { describe, expect, it } from 'vitest';
import { SETTINGS_PERF_BUDGET, SETTINGS_INTERACTIVE_FALLBACK_MS } from '@/app/services/settings/settingsPerfBudget';

describe('settingsPerfBudget', () => {
    it('يحدّد حدوداً واقعية للفتح البارد والمتكرر', () => {
        expect(SETTINGS_PERF_BUDGET.openToInteractiveMs.ciColdMax).toBeGreaterThan(
            SETTINGS_PERF_BUDGET.openToInteractiveMs.ciCachedMax,
        );
        expect(SETTINGS_PERF_BUDGET.openToInteractiveMs.target).toBeLessThan(
            SETTINGS_PERF_BUDGET.openToInteractiveMs.ciCachedMax,
        );
        expect(SETTINGS_PERF_BUDGET.sentryMetric).toBe('settings.open_to_interactive_ms');
        expect(SETTINGS_INTERACTIVE_FALLBACK_MS).toBeLessThanOrEqual(180);
        expect(SETTINGS_PERF_BUDGET.openToInteractiveMs.target).toBeLessThanOrEqual(800);
    });
});
