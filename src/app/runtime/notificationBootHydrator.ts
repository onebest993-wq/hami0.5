import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    isSectionBackgroundPrefetchAllowed,
    sectionBackgroundHydrateDelayMs,
} from '@/app/runtime/sectionPrefetchPolicy';
import {
    hydrateNotificationPanelForInstantOpen,
    isNotificationPanelModuleResolved,
    prefetchNotificationPanel,
} from '@/app/runtime/notificationPanelLoader';
import {
    NOTIFICATION_PRIME_HOST_EVENT,
    NOTIFICATION_SHELL_HYDRATED_EVENT,
} from '@/app/runtime/notificationBootEvents';

export { NOTIFICATION_PRIME_HOST_EVENT, NOTIFICATION_SHELL_HYDRATED_EVENT };

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function notificationPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs(0, 0);
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

/** pointerdown على الجرس — يركّب Host قبل click */
export function dispatchNotificationPrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(NOTIFICATION_PRIME_HOST_EVENT));
}

/** للاختبارات */
export function resetNotificationBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
