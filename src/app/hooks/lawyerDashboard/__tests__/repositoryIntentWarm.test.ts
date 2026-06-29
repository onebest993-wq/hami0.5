import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    warmRepositoryHubOnHover,
    warmRepositoryOnOpen,
    scheduleRepositoryDockIdlePrefetch,
    resetRepositoryIdlePrefetchForTests,
} from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';

vi.mock('@/app/utils/lazyComponents', () => ({
    prefetchSmartRepositoryModal: vi.fn(),
}));

vi.mock('@/app/runtime/repositoryHubLoader', () => ({
    prefetchRepositoryHubModule: vi.fn(),
}));

vi.mock('@/app/services/vault/vaultDocsWarmCache', () => ({
    prefetchSmartVaultDocs: vi.fn(),
}));

import { prefetchSmartRepositoryModal } from '@/app/utils/lazyComponents';
import { prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import { prefetchSmartVaultDocs } from '@/app/services/vault/vaultDocsWarmCache';

describe('repositoryIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetRepositoryIdlePrefetchForTests();
    });

    afterEach(() => {
        resetRepositoryIdlePrefetchForTests();
    });

    it('warmRepositoryOnOpen notepad يحمّل المستودع والمفكرة بلا الملف المهني', () => {
        warmRepositoryOnOpen('u1', 'notepad');
        expect(prefetchRepositoryHubModule).toHaveBeenCalled();
        expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('u1');
        expect(prefetchSmartRepositoryModal).toHaveBeenCalled();
    });

    it('warmRepositoryOnOpen vault لا يحمّل المفكرة', () => {
        warmRepositoryOnOpen('u1', 'vault');
        expect(prefetchRepositoryHubModule).toHaveBeenCalled();
        expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('u1');
        expect(prefetchSmartRepositoryModal).not.toHaveBeenCalled();
    });

    it('warmRepositoryHubOnHover يحمّل chunk وبيانات المخزن', () => {
        warmRepositoryHubOnHover('u1');
        expect(prefetchRepositoryHubModule).toHaveBeenCalled();
        expect(prefetchSmartRepositoryModal).toHaveBeenCalled();
        expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('u1');
    });
});
