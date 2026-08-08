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
import { readPersistedSettingsSection } from '@/app/components/lawyer/HamiSettings/settingsSectionPersistence';
import { loadSettingsSection } from '@/app/components/lawyer/HamiSettings/settingsSectionLoader';

export const SETTINGS_SHELL_HYDRATED_EVENT = 'hami:settings-shell-hydrated';
/** pointerdown على زر الإعدادات — يركّب Host مخفياً قبل الـ click */
export const SETTINGS_PRIME_HOST_EVENT = 'hami:settings-prime-host';

let persistedSectionHydrated = false;
let allSectionsHydrated = false;
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

/** جاهز للفتح التفاعلي — التبويب المحفوظ + shell */
export function isSettingsShellFullyHydrated(): boolean {
    return isHamiSettingsModuleResolved() && persistedSectionHydrated;
}

function scheduleRemainingSectionsIdle(): void {
    if (allSectionsHydrated || typeof window === 'undefined') return;
    queueMicrotask(() => {
        void import('@/app/components/lawyer/HamiSettings/settingsSectionRegistry')
            .then((m) => m.preloadAllSettingsSectionComponents())
            .then(() => {
                allSectionsHydrated = true;
            })
            .catch(() => undefined);
    });
    scheduleIdleWork(
        () => {
            if (allSectionsHydrated) return;
            void import('@/app/components/lawyer/HamiSettings/settingsSectionRegistry')
                .then((m) => m.preloadAllSettingsSectionComponents())
                .then(() => {
                    allSectionsHydrated = true;
                })
                .catch(() => undefined);
        },
        { minDelayMs: 0, timeoutMs: 6_000 },
    );
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
 * تحميل shell الإعدادات + التبويب المحفوظ فوراً؛ باقي التبويبات idle.
 * @param force — عند الفتح من المستخدم: يتجاوز تعطيل prefetch الخلفي
 */
export function hydrateSettingsShellForInstantOpen(force = false): Promise<boolean> {
    const run = async (): Promise<boolean> => {
        if (!force && !(await settingsPrefetchAllowed())) return false;
        if (isSettingsShellFullyHydrated()) {
            dispatchHydratedOnce();
            scheduleRemainingSectionsIdle();
            return true;
        }
        if (hydrateInflight) return hydrateInflight;

        const persisted = readPersistedSettingsSection();
        hydrateInflight = Promise.all([
            loadHamiSettingsModule(),
            loadSettingsSection(persisted),
            import('@/app/components/lawyer/HamiSettings/settingsSectionRegistry').then((m) =>
                m.preloadAllSettingsSectionComponents(),
            ),
        ])
            .then(() => {
                persistedSectionHydrated = true;
                dispatchHydratedOnce();
                scheduleRemainingSectionsIdle();
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
        if (isSettingsShellFullyHydrated()) return;
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
    persistedSectionHydrated = false;
    allSectionsHydrated = false;
    hydrateInflight = null;
    bootHydratorArmed = false;
    coldBootPrefetchStarted = false;
}
