import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('hydrateRepositoryShellForInstantOpen', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('ينتظر مقطع Entry وليس التغذية وحدها', async () => {
        vi.doMock(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry',
            () => ({
                LawyerDashboardRepositoryOverlayEntry: () => null,
            }),
        );

        const mod = await import('@/app/runtime/repositoryHubLoader');
        mod.resetRepositoryHubModuleCacheForTests();

        const ok = await mod.hydrateRepositoryShellForInstantOpen();
        expect(ok).toBe(true);
        expect(mod.isRepositoryHubModuleResolved()).toBe(true);
    });
});
