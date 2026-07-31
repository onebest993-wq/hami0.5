import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';
import { scheduleLawyerShellPrefetch } from '@/app/runtime/deferredShellPrefetch';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
function loadLazyComponentsIntent() {
    return import('@/app/utils/lazyComponentsIntent');
}

function warmHomeHubRadarFromSession(): void {
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
    // موجة widgets العميقة (تشمل تسخين إضبارة التنفيذ) — مجدولة idle وغير مكررة
    scheduleLawyerShellPrefetch();
    prefetchLawyerHomeTabModule();
    warmHomeHubRadarFromSession();
}

/** عند أول عرض للرئيسية — فقط ما يظهر على الشاشة (intent-only للباقي) */
export function warmHomeOnOpen(): void {
    void loadLazyComponentsIntent().then((m) => m.warmLawyerHomeShellCritical());
    prefetchLawyerHomeTabModule();
    onDashboardInteractive(() => {
        scheduleLawyerShellPrefetch();
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
            minDelayMs: import.meta.env.DEV ? 600 : 1_100,
            timeoutMs: 3_500,
        });
    });
}