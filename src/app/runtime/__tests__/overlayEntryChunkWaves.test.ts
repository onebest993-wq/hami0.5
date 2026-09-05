import { beforeEach, describe, expect, it, vi } from 'vitest';

const scheduleIdleWork = vi.fn((fn: () => void) => {
    return () => undefined;
});

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void, opts?: unknown) => scheduleIdleWork(fn, opts),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => false),
}));

vi.mock('@/app/runtime/sectionPrefetchPolicy', () => ({
    isSectionBackgroundPrefetchAllowed: vi.fn(() => true),
    isRepositoryHubJsWarmAllowed: vi.fn(() => true),
    isTransactionsHubJsWarmAllowed: vi.fn(() => true),
}));

vi.mock('@/app/runtime/homeHubCardLoader', () => ({
    getCachedLawyerHomeHubCard: () => true,
    prefetchLawyerHomeHubCardModule: vi.fn(),
}));

vi.mock('@/app/runtime/notificationShellLoader', () => ({
    prefetchNotificationShellModule: vi.fn(),
}));

vi.mock('@/app/runtime/lawsuitsOverlayEntryLoader', () => ({
    prefetchLawsuitsOverlayEntry: vi.fn(),
}));

vi.mock('@/app/runtime/smartFileOverlayEntryLoader', () => ({
    prefetchSmartFileOverlayEntry: vi.fn(),
}));

vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    prefetchSettingsOverlayEntry: vi.fn(),
}));

vi.mock('@/app/motion/loadOverlayMotion', () => ({
    prefetchOverlayMotion: vi.fn(),
}));

vi.mock('@/app/runtime/yieldToMain', () => ({
    yieldToMain: () => Promise.resolve(),
    runWarmSteps: () => Promise.resolve(),
    yieldToMainIdleTimeoutMs: () => 48,
}));

describe('overlay entry chunk waves — حجم المنتج', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(false);
        const policy = await import('@/app/runtime/sectionPrefetchPolicy');
        vi.mocked(policy.isSectionBackgroundPrefetchAllowed).mockReturnValue(true);
        const mod = await import('@/app/runtime/overlayEntryChunks');
        mod.resetOverlayEntryChunksForTests();
    });

    it('الموجة المتوسطة أقصر من الثقيلة على الويب؛ ختم التنفيذ بلا تأخير إضافي', async () => {
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(false);
        const {
            overlayEntryExecutionHostWaveDelayMs,
            overlayEntryMediumWaveDelayMs,
            overlayEntryHeavyWaveDelayMs,
        } = await import('@/app/runtime/overlayEntryChunks');
        expect(overlayEntryExecutionHostWaveDelayMs()).toBe(0);
        expect(overlayEntryMediumWaveDelayMs()).toBe(1_050);
        expect(overlayEntryHeavyWaveDelayMs()).toBe(3_200);
        expect(overlayEntryMediumWaveDelayMs()).toBeLessThan(overlayEntryHeavyWaveDelayMs());
    });

    it('على الأصل التأخير أقصر وما زال متدرّجاً', async () => {
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(true);
        const { overlayEntryMediumWaveDelayMs, overlayEntryHeavyWaveDelayMs } = await import(
            '@/app/runtime/overlayEntryChunks'
        );
        expect(overlayEntryMediumWaveDelayMs()).toBe(480);
        expect(overlayEntryHeavyWaveDelayMs()).toBe(1_800);
        expect(overlayEntryMediumWaveDelayMs()).toBeLessThan(overlayEntryHeavyWaveDelayMs());
    });

    it('بعد المنزل: ختم تنفيذ فوراً ثم متوسط ثم ثقيل', async () => {
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(false);
        const { resetOverlayEntryChunksForTests, warmOverlayEntryChunks } = await import(
            '@/app/runtime/overlayEntryChunks'
        );
        resetOverlayEntryChunksForTests();
        scheduleIdleWork.mockClear();
        warmOverlayEntryChunks();
        expect(scheduleIdleWork).toHaveBeenCalledTimes(1);
        expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 6_000,
        });
        const lightFn = scheduleIdleWork.mock.calls[0]?.[0] as () => void;
        lightFn();
        await vi.waitFor(() => {
            expect(scheduleIdleWork).toHaveBeenCalledTimes(4);
        });
        expect(scheduleIdleWork.mock.calls[1]?.[1]).toEqual({
            minDelayMs: 0,
            timeoutMs: 4_000,
        });
        expect(scheduleIdleWork.mock.calls[2]?.[1]).toEqual({
            minDelayMs: 1_050,
            timeoutMs: 5_050,
        });
        expect(scheduleIdleWork.mock.calls[3]?.[1]).toEqual({
            minDelayMs: 3_200,
            timeoutMs: 9_200,
        });
    });

    it('بلا prefetch خلفي: الموجة الخفيفة فقط', async () => {
        const policy = await import('@/app/runtime/sectionPrefetchPolicy');
        vi.mocked(policy.isSectionBackgroundPrefetchAllowed).mockReturnValue(false);
        const { resetOverlayEntryChunksForTests, warmOverlayEntryChunks } = await import(
            '@/app/runtime/overlayEntryChunks'
        );
        resetOverlayEntryChunksForTests();
        scheduleIdleWork.mockClear();
        warmOverlayEntryChunks();
        const lightFn = scheduleIdleWork.mock.calls[0]?.[0] as () => void;
        lightFn();
        await Promise.resolve();
        await Promise.resolve();
        expect(scheduleIdleWork).toHaveBeenCalledTimes(1);
    });
});
