import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

let heavyWarmStarted = false;
let lawsuitEarlyWarmStarted = false;
let cancelHeavyWarm: (() => void) | null = null;
let cancelLawsuitEarlyWarm: (() => void) | null = null;

export function resetHeavyDashboardSectionWarmForTests(): void {
    heavyWarmStarted = false;
    lawsuitEarlyWarmStarted = false;
    cancelHeavyWarm?.();
    cancelHeavyWarm = null;
    cancelLawsuitEarlyWarm?.();
    cancelLawsuitEarlyWarm = null;
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
            /* لا secondary فوري — criminal / SmartFile / NewCase عند النية أو early warm فقط */
            m.warmLawsuitWorkspace({ includeSecondary: false });
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

/** تسخين أرشيف الدعاوى فقط — أبكر من heavy warm (8s ويب) لتحسين أول فتح */
export function warmLawsuitArchiveEarly(): void {
    if (typeof window === 'undefined' || lawsuitEarlyWarmStarted || isLitePerformanceActive()) return;
    lawsuitEarlyWarmStarted = true;

    void import('@/app/runtime/lawsuitWorkspaceWarm')
        .then((m) => {
            m.warmLawsuitWorkspace({ includeSecondary: false });
        })
        .catch(() => undefined);

    void import('@/app/runtime/hubArchiveLoader')
        .then((m) => {
            m.prefetchLawsuitArchiveContent();
        })
        .catch(() => undefined);
}

export function scheduleLawsuitArchiveEarlyWarm(): () => void {
    if (typeof window === 'undefined' || lawsuitEarlyWarmStarted || isLitePerformanceActive()) {
        return () => undefined;
    }

    const minDelay = isCapacitorNativePlatform() ? 1_500 : 2_500;
    cancelLawsuitEarlyWarm = scheduleIdleWork(warmLawsuitArchiveEarly, {
        minDelayMs: minDelay,
        timeoutMs: minDelay + 4_000,
    });
    return () => {
        cancelLawsuitEarlyWarm?.();
        cancelLawsuitEarlyWarm = null;
    };
}
