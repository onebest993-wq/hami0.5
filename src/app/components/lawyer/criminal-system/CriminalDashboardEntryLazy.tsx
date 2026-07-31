import { loadCriminalDashboardModule } from '@/app/runtime/criminalDashboardLoader';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

export const LazyCriminalDashboardEntry = createPreloadableLazyComponent(() =>
    loadCriminalDashboardModule().then((mod) => ({
        default: mod.CriminalDashboard as unknown as LazyComponent,
    })),
);

/** لا preload عند استيراد الوحدة — التحميل عند فتح الإضبارة أو نية صريحة فقط. */
