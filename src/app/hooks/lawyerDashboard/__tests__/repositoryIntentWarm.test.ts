import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    warmRepositoryHubOnHover,
    warmRepositoryOnOpen,
    scheduleRepositoryDockIdlePrefetch,
    resetRepositoryIdlePrefetchForTests,
} from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';
import { isSectionBackgroundPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';

const prefetchRepositoryHubModule = vi.fn();
const prefetchSmartVaultDocs = vi.fn();

vi.mock('@/app/runtime/repositoryHubLoader', () => ({
    prefetchRepositoryHubModule: (...args: unknown[]) => prefetchRepositoryHubModule(...args),
}));

vi.mock('@/app/services/vault/vaultDocsWarmCache', () => ({
    prefetchSmartVaultDocs: (...args: unknown[]) => prefetchSmartVaultDocs(...args),
    refreshVaultDocsFromStore: vi.fn(async () => []),
    seedVaultWarmCacheFromLocalIndex: vi.fn(() => []),
}));

vi.mock('@/app/runtime/sectionPrefetchPolicy', () => ({
    isSectionBackgroundPrefetchAllowed: vi.fn(() => true),
}));

describe('repositoryIntentWarm', () => {
    beforeEach(() => {
        prefetchRepositoryHubModule.mockClear();
        prefetchSmartVaultDocs.mockClear();
        vi.mocked(isSectionBackgroundPrefetchAllowed).mockReturnValue(true);
        resetRepositoryIdlePrefetchForTests();
    });

    afterEach(() => {
        resetRepositoryIdlePrefetchForTests();
    });

    it('warmRepositoryOnOpen يحمّل المستودع والوثائق', () => {
        warmRepositoryOnOpen('u1', 'notepad');
        expect(prefetchRepositoryHubModule).toHaveBeenCalled();
        expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('u1');
    });

    it('warmRepositoryOnOpen vault يحمّل الوثائق دون مسار منفصل', () => {
        warmRepositoryOnOpen('u1', 'vault');
        expect(prefetchRepositoryHubModule).toHaveBeenCalled();
        expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('u1');
    });

    it('warmRepositoryHubOnHover يحمّل chunk وبيانات المخزن', () => {
        warmRepositoryHubOnHover('u1');
        expect(prefetchRepositoryHubModule).toHaveBeenCalled();
        expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('u1');
    });

    it('idle prefetch لا يعمل عند منع التسخين الخلفي', () => {
        vi.mocked(isSectionBackgroundPrefetchAllowed).mockReturnValue(false);
        scheduleRepositoryDockIdlePrefetch();
        expect(prefetchRepositoryHubModule).not.toHaveBeenCalled();
        expect(prefetchSmartVaultDocs).not.toHaveBeenCalled();
    });
});
