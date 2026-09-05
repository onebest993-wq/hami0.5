import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

/** جسم سجل الملاحظات داخل النافذة الحية. */
export const LazyDossierNotesVault = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dossier-notes/DossierNotesVault').then((m) => ({
        default: m.DossierNotesVault,
    })),
);

export function prefetchExecutionNotesInnerSurfaces(): void {
    void LazyDossierNotesVault.preload();
}
