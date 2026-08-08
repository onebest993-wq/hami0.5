import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchFieldTasksSheetModule = vi.fn();
const prefetchTasksManagerModule = vi.fn();
const hydrateFieldTasksShellForInstantOpen = vi.fn(() => Promise.resolve(true));

vi.mock('@/app/runtime/fieldTasksHubLoader', () => ({
    prefetchFieldTasksSheetModule: (...args: unknown[]) => prefetchFieldTasksSheetModule(...args),
    prefetchTasksManagerModule: (...args: unknown[]) => prefetchTasksManagerModule(...args),
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

    it('warmFieldTasksOnOpen يسخّن الستارة فوراً والأجندة مؤجَّلة', async () => {
        const warm = await import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
        warm.warmFieldTasksOnOpen();

        expect(prefetchFieldTasksSheetModule).toHaveBeenCalled();
        expect(hydrateFieldTasksShellForInstantOpen).toHaveBeenCalledWith(true);
        expect(prefetchTasksManagerModule).not.toHaveBeenCalled();

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(prefetchTasksManagerModule).toHaveBeenCalled();
    });

    it('warmFieldTasksOnHover يسخّن الستارة فقط بلا الأجندة', async () => {
        const warm = await import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
        warm.warmFieldTasksOnHover();

        expect(prefetchFieldTasksSheetModule).toHaveBeenCalled();
        expect(prefetchTasksManagerModule).not.toHaveBeenCalled();
        expect(hydrateFieldTasksShellForInstantOpen).toHaveBeenCalledWith(false);
    });
});
