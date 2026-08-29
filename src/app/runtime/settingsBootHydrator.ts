import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    isSectionBackgroundPrefetchAllowed,
    sectionBackgroundHydrateDelayMs,
} from '@/app/runtime/sectionPrefetchPolicy';
import {
    isHamiSettingsModuleResolved,
    loadHamiSettingsModule,
    prefetchHamiSettingsModule,
} from '@/app/runtime/hamiSettingsLoader';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import {
    SETTINGS_PRIME_HOST_EVENT,
    SETTINGS_SHELL_HYDRATED_EVENT,
} from '@/app/runtime/settingsShellEvents';

export { SETTINGS_PRIME_HOST_EVENT, SETTINGS_SHELL_HYDRATED_EVENT };

let hydrateInflight: Promise<boolean> | null = null;
let bootHydratorArmed = false;
let coldBootPrefetchStarted = false;

function settingsPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs();
}

/** جاهز للفتح التفاعلي — مقطع الشِل + المنظر (باقي التبويبات كسولة) */
export function isSettingsShellFullyHydrated(): boolean {
    return isHamiSettingsModuleResolved();
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
    if (!settingsPrefetchAllowed()) return;
    coldBootPrefetchStarted = true;
    void ensureDeferredFeatureStylesLoaded();
    prefetchHamiSettingsModule();
    void hydrateSettingsShellForInstantOpen(false).catch(() => undefined);
}

/**
 * تحميل مقطع الإعدادات (الشِل + المنظر؛ الأمن/البيانات/الحساب كسولة).
 * @param force — عند الفتح من المستخدم: يتجاوز تعطيل prefetch الخلفي
 */
export function hydrateSettingsShellForInstantOpen(force = false): Promise<boolean> {
    const run = async (): Promise<boolean> => {
        if (!force && !settingsPrefetchAllowed()) return false;
        if (isSettingsShellFullyHydrated()) {
            dispatchHydratedOnce();
            return true;
        }
        if (hydrateInflight) return hydrateInflight;

        hydrateInflight = loadHamiSettingsModule()
            .then(() => {
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
        if (isSettingsShellFullyHydrated()) return;
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                void hydrateSettingsShellForInstantOpen();
            },
            { minDelayMs: delay, timeoutMs: 4_000 },
        );
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
    hydrateInflight = null;
    bootHydratorArmed = false;
    coldBootPrefetchStarted = false;
}
