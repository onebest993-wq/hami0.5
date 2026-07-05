import { lazy } from 'react';
import { warmRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';

const legalRepositoryImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/LegalRepository').then((m) => ({
        default: m.LegalRepository,
    }));

export const LazyLegalRepository = lazy(legalRepositoryImport);

export function prefetchCommunityRepositorySection(): void {
    if (typeof window === 'undefined') return;
    warmRepositoryDocsCache();
    void legalRepositoryImport().catch(() => undefined);
}
