import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    clearGlobalSearchPerfMarks,
    getGlobalSearchOpenToInteractiveMs,
    markGlobalSearchPerfPhase,
    reportGlobalSearchPerf,
} from '@/app/services/search/globalSearchPerfMetrics';
import { resetGlobalSearchSentryModuleForTests } from '@/app/services/search/globalSearchSentryReporting';

describe('globalSearchPerfMetrics', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
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

    it('يستخدم آخر marks عند تعدد الفتحات داخل الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:global-search:open-request') {
                return [{ startTime: 1000 }, { startTime: 2600 }] as PerformanceEntryList;
            }
            if (name === 'hami:global-search:interactive') {
                return [{ startTime: 1350 }, { startTime: 3015 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getGlobalSearchOpenToInteractiveMs()).toBe(415);
    });

    it('يعيد null عند غياب علامة interactive (fallback للعلامة واحدة مفقودة)', () => {
        markGlobalSearchPerfPhase('open-request');
        expect(getGlobalSearchOpenToInteractiveMs()).toBeNull();
    });

    it('clearGlobalSearchPerfMarks يُحذف جميع العلامات السابقة ويجعل القارئ يعيد null', () => {
        markGlobalSearchPerfPhase('open-request');
        markGlobalSearchPerfPhase('interactive');
        expect(getGlobalSearchOpenToInteractiveMs()).not.toBeNull();
        clearGlobalSearchPerfMarks();
        expect(getGlobalSearchOpenToInteractiveMs()).toBeNull();
    });
});
