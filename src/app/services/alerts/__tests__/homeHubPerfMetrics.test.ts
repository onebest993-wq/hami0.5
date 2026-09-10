import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearHomeHubPerfMarks,
    getHomeHubOpenToInteractiveMs,
    markHomeHubPerfPhase,
    reportHomeHubPerf,
} from '@/app/services/alerts/homeHubPerfMetrics';

vi.mock('@/app/services/alerts/homeHubSentryReporting', () => ({
    reportHomeHubOpenToSentry: vi.fn(),
}));

import { reportHomeHubOpenToSentry } from '@/app/services/alerts/homeHubSentryReporting';

describe('homeHubPerfMetrics', () => {
    beforeEach(() => {
        clearHomeHubPerfMarks();
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 1400 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        markHomeHubPerfPhase('open-request');
        markHomeHubPerfPhase('interactive');

        expect(getHomeHubOpenToInteractiveMs()).toBe(400);
    });

    it('يرجع null بدون marks', () => {
        expect(getHomeHubOpenToInteractiveMs()).toBeNull();
    });

    it('يرجع null عندما interactive قبل open-request', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 1400 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getHomeHubOpenToInteractiveMs()).toBeNull();
    });

    it('يستخدم آخر marks عند تعدد الفتحات داخل الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 1000 }, { startTime: 1800 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 1400 }, { startTime: 2315 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getHomeHubOpenToInteractiveMs()).toBe(515);
    });

    it('reportHomeHubPerf لا يرمي بدون marks', () => {
        expect(() => reportHomeHubPerf({ alertsTabCount: 1 })).not.toThrow();
    });

    it('reportHomeHubPerf يستدعي Sentry reporter', () => {
        vi.mocked(reportHomeHubOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 200 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 550 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportHomeHubPerf({ alertsTabCount: 2, hadRadarCache: true });

        expect(reportHomeHubOpenToSentry).toHaveBeenCalledWith(350, {
            alertsTabCount: 2,
            hadRadarCache: true,
        });
    });

    /*
     * النيّة المقصودة: **تقريرٌ لكل دخول** إلى الرئيسية، لا تقريرٌ واحد للجلسة.
     *
     * وكانت غير مختبَرة، فنابَ عنها تأكيدٌ نصّيّ في `worldclassHomeHubCloseHonesty`
     * يمنع وجود `clearHomeHubPerfMarks()` في الخطّاف — وهو عكس النيّة، فتناقض مع
     * `useLawyerDashboardHomeTab.test` الذي يشترط استدعاءه مرّةً عند كل دخول
     * (`FINDING-020`). والدليل على أن «لكل دخول» هي النيّة: `resetHomeHubPerfReportSession`
     * لا وجود لها إلا كأثرٍ لـ`clearHomeHubPerfMarks` — فبلا نيّة إعادة التسليح لا معنى لها.
     *
     * فتُقاس الدلالة هنا سلوكياً بدل أن تُفرَض نصّاً هناك.
     */
    function stubMarks(openAt: number, interactiveAt: number): void {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: openAt }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: interactiveAt }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
    }

    it('تقريرٌ واحد لكل جلسة قياس — الثاني يُكتم', () => {
        vi.mocked(reportHomeHubOpenToSentry).mockClear();
        stubMarks(100, 400);

        reportHomeHubPerf({ alertsTabCount: 1 });
        reportHomeHubPerf({ alertsTabCount: 1 });

        expect(reportHomeHubOpenToSentry).toHaveBeenCalledTimes(1);
    });

    it('وclearHomeHubPerfMarks يُعيد التسليح — فيُقاس الدخول التالي', () => {
        vi.mocked(reportHomeHubOpenToSentry).mockClear();
        stubMarks(100, 400);
        reportHomeHubPerf({ alertsTabCount: 1 });
        expect(reportHomeHubOpenToSentry).toHaveBeenCalledTimes(1);

        /* دخولٌ جديد: يُمسح ثم يُعلَّم من جديد — كما يفعل useLawyerDashboardHomeTab */
        clearHomeHubPerfMarks();
        stubMarks(1_000, 1_500);
        reportHomeHubPerf({ alertsTabCount: 1 });

        expect(reportHomeHubOpenToSentry).toHaveBeenCalledTimes(2);
        expect(reportHomeHubOpenToSentry).toHaveBeenLastCalledWith(500, { alertsTabCount: 1 });
    });
});
