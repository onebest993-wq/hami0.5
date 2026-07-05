import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateNotificationPanelForInstantOpen,
    isNotificationPanelModuleResolved,
    prefetchNotificationPanel,
} from '@/app/runtime/notificationPanelLoader';

export const NOTIFICATION_SHELL_HYDRATED_EVENT = 'hami:notification-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function notificationPrefetchAllowed(): boolean {
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
    if (!notificationPrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 400;
    return import.meta.env.DEV ? 120 : 200;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(NOTIFICATION_SHELL_HYDRATED_EVENT));
}

/**
 * تهيئة لوحة الإشعارات للفتح الفوري بعد dashboard-interactive.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateNotificationShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !notificationPrefetchAllowed()) return Promise.resolve(false);
    if (isNotificationPanelModuleResolved()) {
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateNotificationPanelForInstantOpen()
        .then((ok) => {
            if (ok) dispatchHydratedOnce();
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — قبل نقرة الجرس */
export function bindNotificationBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchNotificationPanel();
                void hydrateNotificationShellForInstantOpen().catch(() => undefined);
            },
            { minDelayMs: delay, timeoutMs: 8_000 },
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
export function resetNotificationBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
