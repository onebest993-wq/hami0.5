import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchExecutionDashboardChromeWarm = vi.fn();
const primeExecutionDossierSurface = vi.fn();

vi.mock('@/app/runtime/executionDashboardLoader', () => ({
    prefetchExecutionDashboardChromeWarm: (...args: unknown[]) =>
        prefetchExecutionDashboardChromeWarm(...args),
    primeExecutionDossierSurface: (...args: unknown[]) => primeExecutionDossierSurface(...args),
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

describe('executionBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(false);
        const mod = await import('@/app/runtime/executionBootHydrator');
        mod.resetExecutionBootHydratorForTests();
        vi.mocked(
            (await import('@/app/services/settings/settingsRuntime')).getLawyerSettingsSnapshot,
        ).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
    });

    it('prefetchExecutionAfterBootReveal يسخّن chrome مرة واحدة ويطلق الحدث', async () => {
        const { prefetchExecutionAfterBootReveal, EXECUTION_CHROME_HYDRATED_EVENT } = await import(
            '@/app/runtime/executionBootHydrator'
        );
        const onHydrated = vi.fn();
        window.addEventListener(EXECUTION_CHROME_HYDRATED_EVENT, onHydrated);

        prefetchExecutionAfterBootReveal();
        prefetchExecutionAfterBootReveal();

        expect(primeExecutionDossierSurface).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionDashboardChromeWarm).toHaveBeenCalledTimes(1);
        expect(onHydrated).toHaveBeenCalledTimes(1);
        window.removeEventListener(EXECUTION_CHROME_HYDRATED_EVENT, onHydrated);
    });

    it('يتخطى التسخين عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);

        const { prefetchExecutionAfterBootReveal, resetExecutionBootHydratorForTests } = await import(
            '@/app/runtime/executionBootHydrator'
        );
        resetExecutionBootHydratorForTests();
        prefetchExecutionAfterBootReveal();
        expect(primeExecutionDossierSurface).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardChromeWarm).not.toHaveBeenCalled();
    });

    it('مع lite يُثبّت first-paint للإضبارة ويتخطى chrome الثقيل', async () => {
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);

        const { prefetchExecutionAfterBootReveal, resetExecutionBootHydratorForTests } = await import(
            '@/app/runtime/executionBootHydrator'
        );
        resetExecutionBootHydratorForTests();
        prefetchExecutionAfterBootReveal();

        expect(primeExecutionDossierSurface).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionDashboardChromeWarm).not.toHaveBeenCalled();
    });

    it('bindExecutionBootHydrator يستجيب لـ boot-reveal-done', async () => {
        const { bindExecutionBootHydrator, resetExecutionBootHydratorForTests } = await import(
            '@/app/runtime/executionBootHydrator'
        );
        resetExecutionBootHydratorForTests();
        const unbind = bindExecutionBootHydrator('lawyer-1');
        window.dispatchEvent(new Event('hami:boot-reveal-done'));
        expect(prefetchExecutionDashboardChromeWarm).toHaveBeenCalled();
        unbind();
    });
});
