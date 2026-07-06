import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import {
    warmLawyerHomeShellCritical,
    warmLawyerHomeShellSecondary,
} from '@/app/utils/lazyComponents';
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
    warmLawyerHomeShellCritical();
    warmLawyerHomeShellSecondary();
    markLawyerShellPrefetchCompleted();
    prefetchLawyerHomeTabModule();
    warmHomeHubRadarFromSession();
}

/** عند أول عرض للرئيسية — فقط ما يظهر على الشاشة (intent-only للباقي) */
export function warmHomeOnOpen(): void {
    warmLawyerHomeShellCritical();
    markLawyerShellPrefetchCompleted();
    prefetchLawyerHomeTabModule();
    scheduleIdleWork(warmLawyerHomeShellSecondary, {
        minDelayMs: import.meta.env.DEV ? 400 : 900,
        timeoutMs: 4_500,
    });
    scheduleIdleWork(warmHomeHubRadarFromSession, {
        minDelayMs: import.meta.env.DEV ? 600 : 1_100,
        timeoutMs: 3_500,
    });
}
