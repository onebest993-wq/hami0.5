import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    warmVaultOnHover,
    warmVaultOnOpen,
} from '@/app/hooks/lawyerDashboard/vaultIntentWarm';

const prefetchRepositoryHubModule = vi.fn();
const prefetchSmartVaultDocs = vi.fn();

vi.mock('@/app/runtime/repositoryHubLoader', () => ({
    prefetchRepositoryHubModule: (...args: unknown[]) => prefetchRepositoryHubModule(...args),
}));

vi.mock('@/app/services/vault/vaultDocsWarmCache', () => ({
    prefetchSmartVaultDocs: (...args: unknown[]) => prefetchSmartVaultDocs(...args),
}));

describe('vaultIntentWarm', () => {
    beforeEach(() => {
        prefetchRepositoryHubModule.mockClear();
        prefetchSmartVaultDocs.mockClear();
    });

    it('hover ي prefetch مقطع المستودع فقط', async () => {
        warmVaultOnHover();

        await vi.waitFor(() => {
            expect(prefetchRepositoryHubModule).toHaveBeenCalledTimes(1);
        });
    });

    it('open ي prefetch vault docs', async () => {
        warmVaultOnOpen('lawyer-1');

        await vi.waitFor(() => {
            expect(prefetchSmartVaultDocs).toHaveBeenCalledWith('lawyer-1');
        });
    });
});
