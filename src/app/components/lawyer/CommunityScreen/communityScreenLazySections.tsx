import { lazy } from 'react';

const legalRepositoryImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/LegalRepository').then((m) => ({
        default: m.LegalRepository,
    }));

export const LazyLegalRepository = lazy(legalRepositoryImport);

export function prefetchCommunityRepositorySection(): void {
    if (typeof window === 'undefined') return;
    void legalRepositoryImport().catch(() => undefined);
}
