import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { warmProfileDataCache } from '@/app/services/profile/profileWarmCache';
import {
    hydrateProfileShellForInstantOpen,
    isProfileShellModuleResolved,
    prefetchProfileHubModule,
} from '@/app/runtime/profileHubLoader';
import { prefetchProfileSettingsSheetModule } from '@/app/runtime/profileSettingsSheetLoader';
import { prefetchProfileSettingsStudioTabsModule } from '@/app/runtime/profileSettingsStudioTabsLoader';

export const PROFILE_SHELL_HYDRATED_EVENT = 'hami:profile-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function profilePrefetchAllowed(): boolean {
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
    if (!profilePrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 1_000;
    return import.meta.env.DEV ? 500 : 700;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PROFILE_SHELL_HYDRATED_EVENT));
}

/**
 * تهيئة shell الملف المهني + كاش البيانات للفتح الفوري.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateProfileShellForInstantOpenWithData(
    userId?: string | null,
    force = false,
): Promise<boolean> {
    if (!force && !profilePrefetchAllowed()) return Promise.resolve(false);
    if (isProfileShellModuleResolved()) {
        prefetchProfileHubModule();
        prefetchProfileSettingsSheetModule();
        prefetchProfileSettingsStudioTabsModule();
        if (userId?.trim()) {
            void warmProfileDataCache(userId).catch(() => undefined);
        }
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateProfileShellForInstantOpen()
        .then((ok) => {
            if (ok) {
                prefetchProfileSettingsSheetModule();
                prefetchProfileSettingsStudioTabsModule();
                if (userId?.trim()) {
                    void warmProfileDataCache(userId).catch(() => undefined);
                }
                dispatchHydratedOnce();
            }
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — قبل نقرة «الملف المهني» */
export function bindProfileBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchProfileHubModule();
                prefetchProfileSettingsSheetModule();
                prefetchProfileSettingsStudioTabsModule();
                void hydrateProfileShellForInstantOpenWithData(userId);
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
export function resetProfileBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
