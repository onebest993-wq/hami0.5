import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

/** جسم الملاحظات/المهام داخل النافذة الحية — نفس الـ instance للرأس والتاريخ. */
export const LazyExecutionTasksSection = createPreloadableLazyComponent(() =>
    import('./components/ExecutionTasksSection').then((m) => ({
        default: m.ExecutionTasksSection,
    })),
);

export const LazyDossierNotesVault = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dossier-notes/DossierNotesVault').then((m) => ({
        default: m.DossierNotesVault,
    })),
);

export function prefetchExecutionNotesInnerSurfaces(): void {
    void LazyExecutionTasksSection.preload();
    void LazyDossierNotesVault.preload();
}
