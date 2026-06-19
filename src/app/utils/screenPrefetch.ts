/**
 * Prefetch — يُنسَّق عبر PrefetchScheduler (منع تكرار التحميل وعواصف الشبكة).
 */
import { PrefetchScheduler } from '@/app/runtime/prefetchScheduler';

export function prefetchForAuthScreen(): void {
    PrefetchScheduler.planAuthenticatedEntry();
}

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
        { delayMs: 3_000 },
    );
}

/** موجات التحميل المسبق للوحة المحامي — تُستدعى من طبقة الخلفية فقط. */
export function prefetchLawyerDashboardLazyChunks(): void {
    PrefetchScheduler.planLawyerHomeWave();
}

export function prefetchLawyerHeavyDeferredChunks(): void {
    PrefetchScheduler.planLawyerSecondaryWave();
}
