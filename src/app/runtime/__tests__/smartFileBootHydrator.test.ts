import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchSmartFileModalPhased = vi.fn();
const prefetchSmartFileModalPortal = vi.fn();

vi.mock('@/app/runtime/smartFileModalLoader', () => ({
    prefetchSmartFileModalPhased: (...args: unknown[]) => prefetchSmartFileModalPhased(...args),
}));

vi.mock('@/app/components/lawyer/dashboard/smartFileModalPortalLazy', () => ({
    prefetchSmartFileModalPortal: (...args: unknown[]) => prefetchSmartFileModalPortal(...args),
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

describe('smartFileBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/smartFileBootHydrator');
        mod.resetSmartFileBootHydratorForTests();
        vi.mocked(
            (await import('@/app/services/settings/settingsRuntime')).getLawyerSettingsSnapshot,
        ).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
    });

    it('prefetchSmartFileAfterBootReveal يسخّن portal/chrome مرة واحدة بلا phased', async () => {
        const { prefetchSmartFileAfterBootReveal, SMART_FILE_CHROME_HYDRATED_EVENT } = await import(
            '@/app/runtime/smartFileBootHydrator'
        );
        const onHydrated = vi.fn();
        window.addEventListener(SMART_FILE_CHROME_HYDRATED_EVENT, onHydrated);

        prefetchSmartFileAfterBootReveal();
        prefetchSmartFileAfterBootReveal();

        expect(prefetchSmartFileModalPortal).toHaveBeenCalledTimes(1);
        expect(prefetchSmartFileModalPhased).not.toHaveBeenCalled();
        expect(onHydrated).toHaveBeenCalledTimes(1);
        window.removeEventListener(SMART_FILE_CHROME_HYDRATED_EVENT, onHydrated);
    });

    it('dashboard-interactive يضيف phased بعد السماح', async () => {
        const { bindSmartFileBootHydrator, resetSmartFileBootHydratorForTests } = await import(
            '@/app/runtime/smartFileBootHydrator'
        );
        resetSmartFileBootHydratorForTests();
        const unbind = bindSmartFileBootHydrator('lawyer-1');
        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        expect(prefetchSmartFileModalPortal).toHaveBeenCalled();
        expect(prefetchSmartFileModalPhased).toHaveBeenCalled();
        unbind();
    });
});
