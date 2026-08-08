import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';
import { prefetchLawyerHomeHubCardModule } from '@/app/runtime/homeHubCardLoader';
import { scheduleLawyerShellPrefetch } from '@/app/runtime/deferredShellPrefetch';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';

function loadLazyComponentsIntent() {
    return import('@/app/utils/lazyComponentsIntent');
}

export function warmHomeHubRadarFromSession(): void {
    if (typeof window === 'undefined') return;
    const lawyerId = readPersistedSupabaseAuth().user?.id ?? null;
    if (!lawyerId) return;
    void import('@/app/services/alerts/homeHubRadarWarmCache').then((m) => {
        void m.warmHomeHubRadarCache(lawyerId);
    });
}

/** عند hover/دخول الرئيسية: prefetch لحاويات الواجهة */
export function warmHomeOnHover(): void {
    void loadLazyComponentsIntent().then((m) => {
        m.warmLawyerHomeShellCritical();
        m.warmLawyerHomeShellSecondary();
    });
    scheduleLawyerShellPrefetch();
    prefetchLawyerHomeTabModule();
    prefetchLawyerHomeHubCardModule();
    warmHomeHubRadarFromSession();
}

/** عند أول عرض للرئيسية — فقط ما يظهر على الشاشة (intent-only للباقي) */
export function warmHomeOnOpen(): void {
    prefetchLawyerHomeHubCardModule();
    void loadLazyComponentsIntent().then((m) => m.warmLawyerHomeShellCritical());
    prefetchLawyerHomeTabModule();
    warmHomeHubRadarFromSession();
    onDashboardInteractive(() => {
        scheduleLawyerShellPrefetch();
        prefetchLawyerHomeHubCardModule();
        scheduleIdleWork(
            () => {
                void loadLazyComponentsIntent().then((m) => m.warmLawyerHomeShellSecondary());
            },
            {
                minDelayMs: import.meta.env.DEV ? 400 : 900,
                timeoutMs: 4_500,
            },
        );
        scheduleIdleWork(warmHomeHubRadarFromSession, {
            minDelayMs: import.meta.env.DEV ? 200 : 400,
            timeoutMs: 2_000,
        });
    });
}
