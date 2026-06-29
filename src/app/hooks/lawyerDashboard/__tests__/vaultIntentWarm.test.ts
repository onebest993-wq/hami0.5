import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    warmVaultOnHover,
    warmVaultOnOpen,
} from '@/app/hooks/lawyerDashboard/vaultIntentWarm';

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

describe('vaultIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('hover ي prefetch فقط', () => {
        warmVaultOnHover();

        expect(prefetchRepositoryHubModule).toHaveBeenCalledTimes(1);
        expect(prefetchSmartRepositoryModal).toHaveBeenCalledTimes(1);
    });

    it('open ي prefetch vault docs', () => {
        warmVaultOnOpen('lawyer-1');

        expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('lawyer-1');
    });
});
