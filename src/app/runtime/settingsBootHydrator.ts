import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    isHamiSettingsModuleResolved,
    loadHamiSettingsModule,
    prefetchHamiSettingsModule,
} from '@/app/runtime/hamiSettingsLoader';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';

export const SETTINGS_SHELL_HYDRATED_EVENT = 'hami:settings-shell-hydrated';
/** pointerdown على زر الإعدادات — يركّب Host مخفياً قبل الـ click */
export const SETTINGS_PRIME_HOST_EVENT = 'hami:settings-prime-host';

let sectionsHydrated = false;
let hydrateInflight: Promise<boolean> | null = null;
let bootHydratorArmed = false;
let coldBootPrefetchStarted = false;

async function settingsPrefetchAllowed(): Promise<boolean> {
    try {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        if (s.performance.prefetchScreens === false) return false;
        if (isLitePerformanceActive(s.performance.litePerformance)) return false;
    } catch {
        /* ignore */
    }
    return true;
}

async function hydrateDelayMs(): Promise<number> {
    if (!(await settingsPrefetchAllowed())) return -1;
    if (isCapacitorNativePlatform()) return 80;
    return 0;
}

export function isSettingsShellFullyHydrated(): boolean {
    return isHamiSettingsModuleResolved() && sectionsHydrated;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SETTINGS_SHELL_HYDRATED_EVENT));
}

export function dispatchSettingsPrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SETTINGS_PRIME_HOST_EVENT));
}

export function prefetchSettingsAfterBootReveal(): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    void settingsPrefetchAllowed().then((ok) => {
        if (!ok || coldBootPrefetchStarted) return;
        coldBootPrefetchStarted = true;
        void ensureDeferredFeatureStylesLoaded();
        prefetchHamiSettingsModule();
        void hydrateSettingsShellForInstantOpen(false).catch(() => undefined);
    });
}

/**
 * تحميل shell الإعدادات + التبويبات.
 * @param force — عند الفتح من المستخدم: يتجاوز تعطيل prefetch الخلفي
 */
export function hydrateSettingsShellForInstantOpen(force = false): Promise<boolean> {
    const run = async (): Promise<boolean> => {
        if (!force && !(await settingsPrefetchAllowed())) return false;
        if (isSettingsShellFullyHydrated()) {
            dispatchHydratedOnce();
            return true;
        }
        if (hydrateInflight) return hydrateInflight;

        hydrateInflight = Promise.all([
            loadHamiSettingsModule(),
            import('@/app/components/lawyer/HamiSettings/settingsSectionRegistry').then((m) =>
                m.preloadAllSettingsSectionComponents(),
            ),
            import('@/app/components/lawyer/HamiSettings/settingsSectionPersistence').then((p) =>
                import('@/app/components/lawyer/HamiSettings/settingsSectionLoader').then((l) =>
                    l.loadSettingsSection(p.readPersistedSettingsSection()),
                ),
            ),
        ])
            .then(() => {
                sectionsHydrated = true;
                dispatchHydratedOnce();
                return true;
            })
            .catch(() => false)
            .finally(() => {
                hydrateInflight = null;
            });

        return hydrateInflight;
    };
    return run();
}

/** يُجدول التحميل بعد boot-reveal ثم dashboard-interactive */
export function bindSettingsBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const onBootRevealDone = () => {
        prefetchSettingsAfterBootReveal();
    };

    const scheduleHydrate = () => {
        prefetchSettingsAfterBootReveal();
        void hydrateDelayMs().then((delay) => {
            if (delay < 0) return;
            cancelIdle?.();
            cancelIdle = scheduleIdleWork(
                () => {
                    void hydrateSettingsShellForInstantOpen();
                },
                { minDelayMs: delay, timeoutMs: 4_000 },
            );
        });
    };

    window.addEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone, { once: true });
    if (isBootRevealDone()) {
        queueMicrotask(onBootRevealDone);
    }

    window.addEventListener('hami:dashboard-interactive', scheduleHydrate, { once: true });

    if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
        scheduleHydrate();
    }

    return () => {
        bootHydratorArmed = false;
        cancelIdle?.();
        cancelIdle = undefined;
        window.removeEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone);
        window.removeEventListener('hami:dashboard-interactive', scheduleHydrate);
    };
}

/** للاختبارات */
export function resetSettingsBootHydratorForTests(): void {
    sectionsHydrated = false;
    hydrateInflight = null;
    bootHydratorArmed = false;
    coldBootPrefetchStarted = false;
}
