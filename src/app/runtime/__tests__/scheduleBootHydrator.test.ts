import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateScheduleShellForInstantOpen = vi.fn(() => Promise.resolve(true));
const prefetchCalendarCloudModule = vi.fn();
const warmCalendarEventsCache = vi.fn(() => Promise.resolve([]));

vi.mock('@/app/runtime/scheduleHubLoader', () => ({
    hydrateScheduleShellForInstantOpen: (...args: unknown[]) => hydrateScheduleShellForInstantOpen(...args),
    isScheduleShellModuleResolved: vi.fn(() => false),
    prefetchScheduleTabHostModule: vi.fn(),
    prefetchScheduleHubModule: vi.fn(),
}));

vi.mock('@/app/services/calendar/calendarCloudLoader', () => ({
    prefetchCalendarCloudModule: (...args: unknown[]) => prefetchCalendarCloudModule(...args),
}));

vi.mock('@/app/hooks/lawyerDashboard/scheduleIntentWarm', () => ({
    warmCalendarEventsCache: (...args: unknown[]) => warmCalendarEventsCache(...args),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => false),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

describe('scheduleBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/scheduleBootHydrator');
        mod.resetScheduleBootHydratorForTests();
        vi.mocked(
            (await import('@/app/runtime/scheduleHubLoader')).isScheduleShellModuleResolved,
        ).mockReturnValue(false);
    });

    it('hydrateScheduleShellForInstantOpenWithData يحمّل shell + كاش الأحداث', async () => {
        const { hydrateScheduleShellForInstantOpenWithData, SCHEDULE_SHELL_HYDRATED_EVENT } =
            await import('@/app/runtime/scheduleBootHydrator');

        const onHydrated = vi.fn();
        window.addEventListener(SCHEDULE_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateScheduleShellForInstantOpenWithData('lawyer-1', true);

        expect(ok).toBe(true);
        expect(hydrateScheduleShellForInstantOpen).toHaveBeenCalledTimes(1);
        expect(prefetchCalendarCloudModule).toHaveBeenCalledTimes(1);
        expect(warmCalendarEventsCache).toHaveBeenCalledWith('lawyer-1');
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(SCHEDULE_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('hydrateScheduleShellForInstantOpenWithData(false) يتخطى التحميل عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);

        const { hydrateScheduleShellForInstantOpenWithData } = await import(
            '@/app/runtime/scheduleBootHydrator'
        );

        const blocked = await hydrateScheduleShellForInstantOpenWithData('lawyer-1', false);
        expect(blocked).toBe(false);
        expect(hydrateScheduleShellForInstantOpen).not.toHaveBeenCalled();

        hydrateScheduleShellForInstantOpen.mockClear();
        const forced = await hydrateScheduleShellForInstantOpenWithData('lawyer-1', true);
        expect(forced).toBe(true);
        expect(hydrateScheduleShellForInstantOpen).toHaveBeenCalledTimes(1);
    });
});
