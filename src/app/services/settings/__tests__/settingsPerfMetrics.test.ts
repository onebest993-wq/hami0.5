import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    clearSettingsPerfMarks,
    getSettingsOpenToInteractiveMs,
    markSettingsPerfPhase,
    reportSettingsPerf,
} from '@/app/services/settings/settingsPerfMetrics';

vi.mock('@/app/services/settings/settingsSentryReporting', () => ({
    reportSettingsOpenToSentry: vi.fn(),
}));

import { reportSettingsOpenToSentry } from '@/app/services/settings/settingsSentryReporting';

describe('settingsPerfMetrics', () => {
    afterEach(() => {
        clearSettingsPerfMarks();
        vi.restoreAllMocks();
    });

    it('يقيس open-request → interactive', () => {
        markSettingsPerfPhase('open-request');
        markSettingsPerfPhase('interactive');
        expect(getSettingsOpenToInteractiveMs()).toBeGreaterThanOrEqual(0);
    });

    it('يرجع null بدون marks', () => {
        expect(getSettingsOpenToInteractiveMs()).toBeNull();
    });

    it('يستخدم آخر marks عند تعدد الفتحات داخل الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:settings:open-request') {
                return [{ startTime: 1000 }, { startTime: 2500 }] as PerformanceEntryList;
            }
            if (name === 'hami:settings:interactive') {
                return [{ startTime: 1400 }, { startTime: 2915 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getSettingsOpenToInteractiveMs()).toBe(415);
    });

    it('reportSettingsPerf يستدعي Sentry reporter', () => {
        vi.mocked(reportSettingsOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:settings:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:settings:interactive') {
                return [{ startTime: 1400 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportSettingsPerf({ activeSection: 'appearance', hadChunkCached: true });

        expect(reportSettingsOpenToSentry).toHaveBeenCalledWith(400, {
            activeSection: 'appearance',
            hadChunkCached: true,
        });
    });
});
