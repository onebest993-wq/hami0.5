import { warmLawyerHomeShell } from '@/app/utils/lazyComponents';
import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';
import { markLawyerShellPrefetchCompleted } from '@/app/runtime/deferredShellPrefetch';

function warmHomeHubRadarFromSession(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/utils/authStorage').then(({ readPersistedSupabaseAuth }) => {
        const lawyerId = readPersistedSupabaseAuth().user?.id ?? null;
        if (!lawyerId) return;
        void import('@/app/services/alerts/homeHubRadarWarmCache').then((m) =>
            m.warmHomeHubRadarCache(lawyerId),
        );
    });
}

/** عند hover/دخول الرئيسية: prefetch لحاويات الواجهة */
export function warmHomeOnHover(): void {
    warmLawyerHomeShell();
    markLawyerShellPrefetchCompleted();
    prefetchLawyerHomeTabModule();
    warmHomeHubRadarFromSession();
}

/** عند أول عرض للرئيسية — فقط ما يظهر على الشاشة (intent-only للباقي) */
export function warmHomeOnOpen(): void {
    warmHomeOnHover();
}
