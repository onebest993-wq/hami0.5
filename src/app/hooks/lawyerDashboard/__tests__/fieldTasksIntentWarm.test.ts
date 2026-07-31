import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchFieldTasksSheetModule = vi.fn();
const prefetchTasksManagerModule = vi.fn();
const hydrateFieldTasksShellForInstantOpen = vi.fn(() => Promise.resolve(true));
const scheduleIdleWork = vi.fn((fn: () => void) => {
    fn();
    return () => undefined;
});

vi.mock('@/app/runtime/fieldTasksHubLoader', () => ({
    prefetchFieldTasksSheetModule: (...args: unknown[]) => prefetchFieldTasksSheetModule(...args),
    prefetchTasksManagerModule: (...args: unknown[]) => prefetchTasksManagerModule(...args),
}));

vi.mock('@/app/runtime/fieldTasksBootHydrator', () => ({
    hydrateFieldTasksShellForInstantOpen: (...args: unknown[]) =>
        hydrateFieldTasksShellForInstantOpen(...args),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (...args: unknown[]) => scheduleIdleWork(...(args as [() => void])),
}));

describe('fieldTasksIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('warmFieldTasksOnOpen prefetches OverlayEntry and defers manager via idle', async () => {
        const warm = await import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
        warm.warmFieldTasksOnOpen();

        expect(prefetchFieldTasksSheetModule).toHaveBeenCalled();
        expect(hydrateFieldTasksShellForInstantOpen).toHaveBeenCalledWith(true);
        expect(scheduleIdleWork).toHaveBeenCalled();
        expect(prefetchTasksManagerModule).toHaveBeenCalled();
    });

    it('warmFieldTasksOnHover prefetches sheet chain without forcing manager sync', async () => {
        const warm = await import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
        warm.warmFieldTasksOnHover();

        expect(prefetchFieldTasksSheetModule).toHaveBeenCalled();
        expect(hydrateFieldTasksShellForInstantOpen).toHaveBeenCalled();
        expect(scheduleIdleWork).not.toHaveBeenCalled();
    });
});
