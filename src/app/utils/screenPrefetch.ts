/**
 * Prefetch — يُنسَّق عبر PrefetchScheduler (منع تكرار التحميل وعواصف الشبكة).
 */
import { PrefetchScheduler } from '@/app/runtime/prefetchScheduler';

export function prefetchSecondaryAppScreens(): void {
    PrefetchScheduler.enqueueWave(
        [
            {
                id: 'royal-profile',
                priority: 'low',
                loader: () =>
                    import('@/app/runtime/royalLawyerProfileLoader').then((m) =>
                        m.loadRoyalLawyerProfileModule(),
                    ),
            },
            {
                id: 'settings-screens',
                priority: 'low',
                loader: () => import('@/app/components/SettingsScreens'),
            },
            {
                id: 'admin-dashboard',
                priority: 'low',
                loader: () => import('@/app/components/AdminDashboard'),
            },
        ],
        { delayMs: import.meta.env.DEV ? 3_000 : 6_000 },
    );
}

/** موجات التحميل المسبق للوحة المحامي — تُستدعى بعد أول عرض للوحة. */
export function prefetchLawyerDashboardLazyChunks(): void {
    PrefetchScheduler.planLawyerHomeWave();
}

export function prefetchLawyerHeavyDeferredChunks(): void {
    PrefetchScheduler.planLawyerSecondaryWave();
}

/** موجّه واحد للتجربة التجريبية — يُستدعى مرة واحدة بعد أول إطار. */
export function scheduleDemoPrefetchWaves(): void {
    PrefetchScheduler.planAuthenticatedEntry();
}
