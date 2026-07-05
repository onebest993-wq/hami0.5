import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    isHamiSettingsModuleResolved,
    loadHamiSettingsModule,
} from '@/app/runtime/hamiSettingsLoader';
import { preloadAllSettingsSectionComponents } from '@/app/components/lawyer/HamiSettings/settingsSectionRegistry';
import { readPersistedSettingsSection } from '@/app/components/lawyer/HamiSettings/settingsSectionPersistence';
import { loadSettingsSection } from '@/app/components/lawyer/HamiSettings/settingsSectionLoader';

export const SETTINGS_SHELL_HYDRATED_EVENT = 'hami:settings-shell-hydrated';

let sectionsHydrated = false;
let hydrateInflight: Promise<boolean> | null = null;
let bootHydratorArmed = false;

function settingsPrefetchAllowed(): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        if (s.performance.prefetchScreens === false) return false;
        if (isLitePerformanceActive(s.performance.litePerformance)) return false;
    } catch {
        /* ignore */
    }
    return true;
}

function hydrateDelayMs(): number {
    if (!settingsPrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 900;
    return import.meta.env.DEV ? 350 : 550;
}

export function isSettingsShellFullyHydrated(): boolean {
    return isHamiSettingsModuleResolved() && sectionsHydrated;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SETTINGS_SHELL_HYDRATED_EVENT));
}

/**
 * تحميل كامل لـ shell الإعدادات + كل التبويبات.
 * @param force — عند الفتح من المستخدم: يتجاوز تعطيل prefetch الخلفي
 */
export function hydrateSettingsShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !settingsPrefetchAllowed()) return Promise.resolve(false);
    if (isSettingsShellFullyHydrated()) {
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = Promise.all([
        loadHamiSettingsModule(),
        preloadAllSettingsSectionComponents(),
        loadSettingsSection(readPersistedSettingsSection()),
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
}

/** يُجدول التحميل الكامل بعد dashboard-interactive — قبل أي نقرة على ⚙️ */
export function bindSettingsBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                void hydrateSettingsShellForInstantOpen();
            },
            { minDelayMs: delay, timeoutMs: 10_000 },
        );
    };

    window.addEventListener('hami:dashboard-interactive', scheduleHydrate, { once: true });

    if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
        scheduleHydrate();
    }

    return () => {
        bootHydratorArmed = false;
        cancelIdle?.();
        cancelIdle = undefined;
        window.removeEventListener('hami:dashboard-interactive', scheduleHydrate);
    };
}

/** للاختبارات */
export function resetSettingsBootHydratorForTests(): void {
    sectionsHydrated = false;
    hydrateInflight = null;
    bootHydratorArmed = false;
}
