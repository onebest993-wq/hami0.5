import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateFieldTasksSheetForInstantOpen,
    isFieldTasksSheetModuleResolved,
} from '@/app/runtime/fieldTasksHubLoader';

export const FIELD_TASKS_SHELL_HYDRATED_EVENT = 'hami:field-tasks-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function fieldTasksPrefetchAllowed(): boolean {
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
    if (!fieldTasksPrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 400;
    return import.meta.env.DEV ? 120 : 200;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(FIELD_TASKS_SHELL_HYDRATED_EVENT));
}

/**
 * تهيئة ستارة الميدان للفتح الفوري — الستارة فقط (chunk خفيف).
 * مدير الأجندة يُحمَّل عبر idle بعد الفتح / عند «إدارة الكل» — لا هنا.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateFieldTasksShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !fieldTasksPrefetchAllowed()) return Promise.resolve(false);
    if (isFieldTasksSheetModuleResolved()) {
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateFieldTasksSheetForInstantOpen()
        .then((ok) => {
            if (ok) dispatchHydratedOnce();
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — قبل نقرة «مهام» */
export function bindFieldTasksBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                void hydrateFieldTasksShellForInstantOpen().catch(() => undefined);
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
export function resetFieldTasksBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
