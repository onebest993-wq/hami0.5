import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('hydrateRepositoryShellForInstantOpen', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('ينتظر وحدة الـ Modal (hub) وليس التغذية وحدها', async () => {
        vi.doMock('@/app/components/lawyer/SmartRepository/SmartRepositoryModalEntry', () => ({
            SmartRepositoryModal: () => null,
        }));
        vi.doMock('@/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed', () => ({
            SmartRepositoryUnifiedFeed: () => null,
        }));

        const mod = await import('@/app/runtime/repositoryHubLoader');
        mod.resetRepositoryHubModuleCacheForTests();

        const ok = await mod.hydrateRepositoryShellForInstantOpen();
        expect(ok).toBe(true);
        expect(mod.isRepositoryHubModuleResolved()).toBe(true);
        expect(mod.getCachedSmartRepositoryModal()).toBeTruthy();
    });
});
