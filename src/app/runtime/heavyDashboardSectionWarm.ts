import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

let heavyWarmStarted = false;
let cancelHeavyWarm: (() => void) | null = null;

export function resetHeavyDashboardSectionWarmForTests(): void {
    heavyWarmStarted = false;
    cancelHeavyWarm?.();
    cancelHeavyWarm = null;
}

/**
 * تسخين موحّد للأقسام الثقيلة (تنفيذ / أرشيف / دعاوى) بعد interactive —
 * لا يُنافس أول paint للمنزل.
 */
export function warmHeavyDashboardSections(): void {
    if (typeof window === 'undefined' || heavyWarmStarted || isLitePerformanceActive()) return;
    heavyWarmStarted = true;

    void import('@/app/runtime/executionArchiveOpenSession')
        .then((m) => {
            m.prefetchExecutionArchiveOpen();
        })
        .catch(() => undefined);

    void import('@/app/runtime/executionWorkspaceWarm')
        .then((m) => {
            m.warmExecutionWorkspace({ includeSecondary: true });
        })
        .catch(() => undefined);

    void import('@/app/runtime/lawsuitWorkspaceWarm')
        .then((m) => {
            m.warmLawsuitWorkspace({ includeSecondary: true });
        })
        .catch(() => undefined);

    void import('@/app/runtime/executionDashboardLoader')
        .then((m) => {
            m.prefetchExecutionDashboardByMode('deferred');
        })
        .catch(() => undefined);

    void import('@/app/runtime/hubArchiveLoader')
        .then((m) => {
            m.prefetchLawsuitArchiveContent();
            m.prefetchExecutionArchiveContent();
        })
        .catch(() => undefined);
}

export function scheduleHeavyDashboardSectionWarm(): () => void {
    if (typeof window === 'undefined' || heavyWarmStarted || isLitePerformanceActive()) {
        return () => undefined;
    }

    const minDelay = isCapacitorNativePlatform() ? 2_500 : 8_000;
    cancelHeavyWarm = scheduleIdleWork(warmHeavyDashboardSections, {
        minDelayMs: minDelay,
        timeoutMs: minDelay + 6_000,
    });
    return () => {
        cancelHeavyWarm?.();
        cancelHeavyWarm = null;
    };
}
