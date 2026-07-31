import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import { scheduleLawyerShellPrefetch, resetLawyerShellPrefetchForTests } from '@/app/runtime/deferredShellPrefetch';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { scheduleDeferredFeatureStyles } from '@/app/runtime/deferredFeatureStyles';

function loadHeaderShellIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/headerShellIntentWarm');
}

function loadProfileBootHydrator() {
    return import('@/app/runtime/profileBootHydrator');
}

let postInteractiveWarmStarted = false;
let cancelPendingWarm: (() => void) | null = null;
let unbindProfileBoot: (() => void) | null = null;

export function resetDashboardPostInteractiveWarmForTests(): void {
    postInteractiveWarmStarted = false;
    cancelPendingWarm?.();
    cancelPendingWarm = null;
    unbindProfileBoot?.();
    unbindProfileBoot = null;
    resetLawyerShellPrefetchForTests();
    void loadHeaderShellIntentWarm()
        .then((m) => m.resetHeaderShellIntentWarmForTests())
        .catch(() => undefined);
    void loadProfileBootHydrator()
        .then((m) => m.resetProfileBootHydratorForTests())
        .catch(() => undefined);
}

async function settingsAllowBackgroundWarm(): Promise<boolean> {
    try {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        return s.performance.prefetchScreens !== false;
    } catch {
        return true;
    }
}

function runLightShellWarm(): void {
    void settingsAllowBackgroundWarm().then((ok) => {
        if (!ok || isLitePerformanceActive()) return;
        scheduleLawyerShellPrefetch();
        scheduleDeferredFeatureStyles();
    });
}

/**
 * بعد content-ready: تسخين chunks الهيدر + shell الملف، ثم shell خفيف idle.
 * لا يبدأ على interactive — كان ينافس HomeTab وdeferred-app ويطيل wall/first-tab.
 */
export function scheduleDashboardPostInteractiveWarm(userId?: string | null): void {
    if (typeof window === 'undefined' || postInteractiveWarmStarted) return;
    postInteractiveWarmStarted = true;

    queueMicrotask(() => {
        void loadHeaderShellIntentWarm()
            .then((m) => m.hydrateLawyerDashboardHeaderShellChunks(userId))
            .catch(() => undefined);
    });

    if (!unbindProfileBoot) {
        void loadProfileBootHydrator().then((m) => {
            unbindProfileBoot = m.bindProfileBootHydrator(userId);
        });
    }

    cancelPendingWarm = scheduleIdleWork(runLightShellWarm, {
        minDelayMs: import.meta.env.DEV ? 4_000 : 15_000,
        timeoutMs: 25_000,
    });
}

/** يُستدعى مرة واحدة من runtime effects — ينتظر boot-content-ready قبل أي warm */
export function bindDashboardPostInteractiveWarm(userId?: string | null): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const startWarm = () => scheduleDashboardPostInteractiveWarm(userId);
    const unbindReady = onBootContentReady(startWarm);

    return () => {
        unbindReady();
        cancelPendingWarm?.();
        cancelPendingWarm = null;
        unbindProfileBoot?.();
        unbindProfileBoot = null;
        /* أعد السماح بالتسخين — وإلا تبديل userId يترك hydrator ميتاً */
        postInteractiveWarmStarted = false;
    };
}
