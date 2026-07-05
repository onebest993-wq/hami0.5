import { scheduleLawyerShellPrefetch, resetLawyerShellPrefetchForTests } from '@/app/runtime/deferredShellPrefetch';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { scheduleDeferredFeatureStyles } from '@/app/runtime/deferredFeatureStyles';
import {
    hydrateLawyerDashboardHeaderShellChunks,
    resetHeaderShellIntentWarmForTests,
} from '@/app/hooks/lawyerDashboard/headerShellIntentWarm';

let postInteractiveWarmStarted = false;
let cancelPendingWarm: (() => void) | null = null;

export function resetDashboardPostInteractiveWarmForTests(): void {
    postInteractiveWarmStarted = false;
    cancelPendingWarm?.();
    cancelPendingWarm = null;
    resetLawyerShellPrefetchForTests();
    resetHeaderShellIntentWarmForTests();
}

function settingsAllowBackgroundWarm(): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        return s.performance.prefetchScreens !== false;
    } catch {
        return true;
    }
}

function runLightShellWarm(): void {
    if (!settingsAllowBackgroundWarm() || isLitePerformanceActive()) return;
    scheduleLawyerShellPrefetch();
    scheduleDeferredFeatureStyles();
}

/**
 * بعد `hami:dashboard-interactive`: تسخين فوري لـ chunks الهيدر، ثم shell خفيف idle.
 * لا تحميل تلقائي لتنفيذ/دعاوى/جزائي — intent-only عبر lawyerDashboardIntentPrefetch.
 */
export function scheduleDashboardPostInteractiveWarm(userId?: string | null): void {
    if (typeof window === 'undefined' || postInteractiveWarmStarted) return;
    postInteractiveWarmStarted = true;

    queueMicrotask(() => hydrateLawyerDashboardHeaderShellChunks(userId));

    cancelPendingWarm = scheduleIdleWork(runLightShellWarm, {
        minDelayMs: import.meta.env.DEV ? 4_000 : 15_000,
        timeoutMs: 25_000,
    });
}

/** يُستدعى مرة واحدة من runtime effects — تسخين فوري + احتياط عند dashboard-interactive */
export function bindDashboardPostInteractiveWarm(userId?: string | null): () => void {
    if (typeof window === 'undefined') return () => undefined;

    scheduleDashboardPostInteractiveWarm(userId);

    const onInteractive = () => scheduleDashboardPostInteractiveWarm(userId);

    window.addEventListener('hami:dashboard-interactive', onInteractive, { once: true });

    return () => {
        window.removeEventListener('hami:dashboard-interactive', onInteractive);
        cancelPendingWarm?.();
        cancelPendingWarm = null;
    };
}
