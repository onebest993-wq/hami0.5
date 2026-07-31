import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchCriminalDashboardChromeWarm = vi.fn();
const prefetchCriminalDashboardPhased = vi.fn();

vi.mock('@/app/runtime/criminalDashboardLoader', () => ({
    prefetchCriminalDashboardChromeWarm: (...args: unknown[]) =>
        prefetchCriminalDashboardChromeWarm(...args),
    prefetchCriminalDashboardPhased: (...args: unknown[]) => prefetchCriminalDashboardPhased(...args),
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

vi.mock('@/app/bootstrap/bootReveal', () => ({
    BOOT_REVEAL_DONE_EVENT: 'hami:boot-reveal-done',
    isBootRevealDone: vi.fn(() => false),
}));

describe('criminalBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/criminalBootHydrator');
        mod.resetCriminalBootHydratorForTests();
        vi.mocked(
            (await import('@/app/services/settings/settingsRuntime')).getLawyerSettingsSnapshot,
        ).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
    });

    it('prefetchCriminalAfterBootReveal يسخّن chrome مرة واحدة', async () => {
        const { prefetchCriminalAfterBootReveal, CRIMINAL_CHROME_HYDRATED_EVENT } = await import(
            '@/app/runtime/criminalBootHydrator'
        );
        const onHydrated = vi.fn();
        window.addEventListener(CRIMINAL_CHROME_HYDRATED_EVENT, onHydrated);

        prefetchCriminalAfterBootReveal();
        prefetchCriminalAfterBootReveal();

        expect(prefetchCriminalDashboardChromeWarm).toHaveBeenCalledTimes(1);
        expect(prefetchCriminalDashboardPhased).not.toHaveBeenCalled();
        expect(onHydrated).toHaveBeenCalledTimes(1);
        window.removeEventListener(CRIMINAL_CHROME_HYDRATED_EVENT, onHydrated);
    });

    it('bind + dashboard-interactive يطلق chrome ثم phased', async () => {
        const { bindCriminalBootHydrator, resetCriminalBootHydratorForTests } = await import(
            '@/app/runtime/criminalBootHydrator'
        );
        resetCriminalBootHydratorForTests();
        const unbind = bindCriminalBootHydrator('lawyer-1');
        window.dispatchEvent(new Event('hami:boot-reveal-done'));
        expect(prefetchCriminalDashboardChromeWarm).toHaveBeenCalled();
        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        expect(prefetchCriminalDashboardPhased).toHaveBeenCalled();
        unbind();
    });
});
