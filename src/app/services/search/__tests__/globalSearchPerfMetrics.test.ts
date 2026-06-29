import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearGlobalSearchPerfMarks,
    getGlobalSearchOpenToInteractiveMs,
    markGlobalSearchPerfPhase,
    reportGlobalSearchPerf,
} from '@/app/services/search/globalSearchPerfMetrics';
import { resetGlobalSearchSentryModuleForTests } from '@/app/services/search/globalSearchSentryReporting';

describe('globalSearchPerfMetrics', () => {
    beforeEach(() => {
        clearGlobalSearchPerfMarks();
        resetGlobalSearchSentryModuleForTests();
    });

    it('يحسب open→interactive عند تسجيل المرحلتين', () => {
        markGlobalSearchPerfPhase('open-request');
        markGlobalSearchPerfPhase('interactive');
        const ms = getGlobalSearchOpenToInteractiveMs();
        expect(ms).not.toBeNull();
        expect(ms!).toBeGreaterThanOrEqual(0);
    });

    it('reportGlobalSearchPerf لا يرمي عند سياق cache', () => {
        markGlobalSearchPerfPhase('open-request');
        markGlobalSearchPerfPhase('interactive');
        expect(() =>
            reportGlobalSearchPerf({ hadLocalCache: true, hadChunkCached: false }),
        ).not.toThrow();
    });
});
