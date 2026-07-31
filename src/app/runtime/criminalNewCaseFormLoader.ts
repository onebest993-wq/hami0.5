import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

/**
 * نموذج الإضبارة الجزائية — lazy واعٍ بالـ preload.
 * InstantShell / Portal يسخّنان نفس الوعد؛ عند اكتماله لا يُعلَّق Suspense.
 */
export const LazyCriminalNewCaseForm = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/criminal-system/CriminalNewCase').then((m) => ({
        default: m.CriminalNewCase as unknown as LazyComponent,
    })),
);

export function prefetchCriminalNewCaseForm(): void {
    if (typeof window === 'undefined') return;
    void LazyCriminalNewCaseForm.preload();
    void import('@/app/components/lawyer/criminal-system/criminalStore').catch(() => undefined);
}
