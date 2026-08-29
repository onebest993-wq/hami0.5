import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { SmartFileChromeProps } from '@/app/components/lawyer/smart-modal/layout/SmartFileChrome';
import type { SmartFileMainPanelProps } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelTypes';
import type { PersonalStatusDossierSurfaceProps } from '@/app/components/lawyer/personal-status/PersonalStatusDossierSurface';

/**
 * أحوال شخصية — preload-aware حتى لا يعلّق Suspense بعد اكتمال التسخين.
 * السطح الموحّد يحمل الكروم والجسم معاً حتى لا يظهر رأس فوق جسم فارغ.
 */
export const LazyPersonalStatusDossierSurface =
    createPreloadableLazyComponent<PersonalStatusDossierSurfaceProps>(() =>
        import('./PersonalStatusDossierSurface').then((m) => ({
            default: m.PersonalStatusDossierSurface as unknown as LazyComponent,
        })),
    );

export const LazyPersonalStatusSmartFileChrome = createPreloadableLazyComponent<SmartFileChromeProps>(
    () =>
        import('./PersonalStatusSmartFileChrome').then((m) => ({
            default: m.PersonalStatusSmartFileChrome as unknown as LazyComponent,
        })),
);

export const LazyPersonalStatusDossierBody = createPreloadableLazyComponent<SmartFileMainPanelProps>(
    () =>
        import('./PersonalStatusDossierBody').then((m) => ({
            default: m.PersonalStatusDossierBody as unknown as LazyComponent,
        })),
);

export function prefetchPersonalStatusDossierSurface(): void {
    if (typeof window === 'undefined') return;
    void LazyPersonalStatusDossierSurface.preload();
    void LazyPersonalStatusSmartFileChrome.preload();
    void LazyPersonalStatusDossierBody.preload();
}
