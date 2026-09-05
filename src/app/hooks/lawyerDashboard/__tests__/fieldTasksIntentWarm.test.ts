import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchFieldTasksSheetModule = vi.fn();
const prefetchFieldTasksCurtainCardSurfaces = vi.fn();
const prefetchTasksManagerModule = vi.fn();
const prefetchTasksManagerSecondarySurfaces = vi.fn();
const hydrateFieldTasksShellForInstantOpen = vi.fn(() => Promise.resolve(true));

vi.mock('@/app/runtime/fieldTasksHubLoader', () => ({
    prefetchFieldTasksSheetModule: (...args: unknown[]) => prefetchFieldTasksSheetModule(...args),
    prefetchFieldTasksCurtainCardSurfaces: (...args: unknown[]) =>
        prefetchFieldTasksCurtainCardSurfaces(...args),
    prefetchTasksManagerModule: (...args: unknown[]) => prefetchTasksManagerModule(...args),
    prefetchTasksManagerSecondarySurfaces: (...args: unknown[]) =>
        prefetchTasksManagerSecondarySurfaces(...args),
}));

vi.mock('@/app/runtime/fieldTasksBootHydrator', () => ({
    hydrateFieldTasksShellForInstantOpen: (...args: unknown[]) =>
        hydrateFieldTasksShellForInstantOpen(...args),
}));

vi.mock('@/app/utils/quantumTasksStorage', () => ({
    warmQuantumTasksDiskRead: vi.fn(),
}));

describe('fieldTasksIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('warmFieldTasksOnOpen يُحدّث الستارة بلا بطاقات فورية وبلا الأجندة', async () => {
        const warm = await import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
        warm.warmFieldTasksOnOpen();

        expect(prefetchFieldTasksSheetModule).toHaveBeenCalled();
        expect(prefetchFieldTasksCurtainCardSurfaces).not.toHaveBeenCalled();
        expect(hydrateFieldTasksShellForInstantOpen).toHaveBeenCalledWith(true);
        expect(prefetchTasksManagerModule).not.toHaveBeenCalled();
    });

    it('warmFieldTasksOnHover يسخّن الستارة فقط بلا الأجندة', async () => {
        const warm = await import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
        warm.warmFieldTasksOnHover();

        expect(prefetchFieldTasksSheetModule).toHaveBeenCalled();
        expect(prefetchFieldTasksCurtainCardSurfaces).toHaveBeenCalled();
        expect(prefetchTasksManagerModule).not.toHaveBeenCalled();
        expect(hydrateFieldTasksShellForInstantOpen).toHaveBeenCalledWith(false);
    });

    it('warmFieldTasksManagerOnOpen يسخّن مقطع الأجندة بلا الأقسام الثانوية', async () => {
        const warm = await import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
        warm.warmFieldTasksManagerOnOpen();

        expect(prefetchTasksManagerModule).toHaveBeenCalled();
        expect(prefetchTasksManagerSecondarySurfaces).not.toHaveBeenCalled();
        expect(prefetchFieldTasksSheetModule).not.toHaveBeenCalled();
        expect(prefetchFieldTasksCurtainCardSurfaces).not.toHaveBeenCalled();
        expect(hydrateFieldTasksShellForInstantOpen).not.toHaveBeenCalled();
    });
});
