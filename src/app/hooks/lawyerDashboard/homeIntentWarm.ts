import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { warmLawyerHomeShell } from '@/app/utils/lazyComponents';
import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';
import { markLawyerShellPrefetchCompleted } from '@/app/runtime/deferredShellPrefetch';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

function warmHomeHubRadarFromSession(): void {
    if (typeof window === 'undefined') return;
    const lawyerId = readPersistedSupabaseAuth().user?.id ?? null;
    if (!lawyerId) return;
    void import('@/app/services/alerts/homeHubRadarWarmCache').then((m) =>
        m.warmHomeHubRadarCache(lawyerId),
    );
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
    warmLawyerHomeShell();
    markLawyerShellPrefetchCompleted();
    prefetchLawyerHomeTabModule();
    scheduleIdleWork(warmHomeHubRadarFromSession, {
        minDelayMs: import.meta.env.DEV ? 1_500 : 2_500,
        timeoutMs: 8_000,
    });
}
