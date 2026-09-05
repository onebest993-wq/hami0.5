import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import { scheduleLawyerShellPrefetch, resetLawyerShellPrefetchForTests } from '@/app/runtime/deferredShellPrefetch';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isSectionBackgroundPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';
import { scheduleDeferredFeatureStyles } from '@/app/runtime/deferredFeatureStyles';
import {
    resetHeavyDashboardSectionWarmForTests,
    scheduleHeavyDashboardSectionWarm,
} from '@/app/runtime/heavyDashboardSectionWarm';

function loadHeaderShellIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/headerShellIntentWarm');
}

function loadProfileBootHydrator() {
    return import('@/app/runtime/profileBootHydrator');
}

let postInteractiveWarmStarted = false;
let cancelPendingWarm: (() => void) | null = null;
let cancelHeavyWarm: (() => void) | null = null;
let unbindProfileBoot: (() => void) | null = null;

export function resetDashboardPostInteractiveWarmForTests(): void {
    postInteractiveWarmStarted = false;
    cancelPendingWarm?.();
    cancelPendingWarm = null;
    unbindProfileBoot?.();
    unbindProfileBoot = null;
    resetLawyerShellPrefetchForTests();
    resetHeavyDashboardSectionWarmForTests();
    cancelHeavyWarm?.();
    cancelHeavyWarm = null;
    void loadHeaderShellIntentWarm()
        .then((m) => m.resetHeaderShellIntentWarmForTests())
        .catch(() => undefined);
    void loadProfileBootHydrator()
        .then((m) => m.resetProfileBootHydratorForTests())
        .catch(() => undefined);
}

function runLightShellWarm(): void {
    if (!isSectionBackgroundPrefetchAllowed()) return;
    scheduleLawyerShellPrefetch();
    scheduleDeferredFeatureStyles();
}

/**
 * بعد content-ready: تسخين chunks الهيدر + shell الملف، ثم shell خفيف idle.
 * لا يبدأ على interactive — كان ينافس HomeTab وdeferred-app ويطيل wall/first-tab.
 */
export function scheduleDashboardPostInteractiveWarm(userId?: string | null): void {
    if (typeof window === 'undefined' || postInteractiveWarmStarted) return;
    postInteractiveWarmStarted = true;

    queueMicrotask(() => {
        void (async () => {
            try {
                const header = await loadHeaderShellIntentWarm();
                await header.hydrateLawyerDashboardHeaderShellChunks(userId);
            } catch {
                /* ignore */
            }
        })();
    });

    if (!unbindProfileBoot) {
        void loadProfileBootHydrator().then((m) => {
            unbindProfileBoot = m.bindProfileBootHydrator(userId);
        });
    }

    void import('@/app/runtime/yieldToMain')
        .then(({ runWarmSteps }) =>
            runWarmSteps([
                () =>
                    import('@/app/runtime/homeHubCardLoader').then((m) =>
                        m.prefetchLawyerHomeHubCardModule(),
                    ),
                () => import('@/app/runtime/profileInstantPaint'),
                () => import('@/app/stores/caseStore'),
                () => import('@/app/stores/notificationStore'),
            ]),
        )
        .catch(() => undefined);

    cancelPendingWarm = scheduleIdleWork(runLightShellWarm, {
        minDelayMs: import.meta.env.DEV ? 4_000 : 15_000,
        timeoutMs: 25_000,
    });

    cancelHeavyWarm = scheduleHeavyDashboardSectionWarm();
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
        cancelHeavyWarm?.();
        cancelHeavyWarm = null;
        unbindProfileBoot?.();
        unbindProfileBoot = null;
        /* أعد السماح بالتسخين — وإلا تبديل userId يترك hydrator ميتاً */
        postInteractiveWarmStarted = false;
    };
}
