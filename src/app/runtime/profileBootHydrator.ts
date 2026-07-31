import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';

function loadProfileHubLoader() {
    return import('@/app/runtime/profileHubLoader');
}

function prefetchProfileHubModuleNow(): void {
    void loadProfileHubLoader()
        .then((m) => m.prefetchProfileHubModule())
        .catch(() => undefined);
}

function warmProfileData(userId?: string | null): void {
    const uid = userId?.trim();
    if (!uid) return;
    void import('@/app/services/profile/profileWarmCache')
        .then((m) => m.warmProfileDataCache(uid))
        .catch(() => undefined);
}

export const PROFILE_SHELL_HYDRATED_EVENT = 'hami:profile-shell-hydrated';
/** pointerdown على زر الملف المهني — يركّب Host مخفياً قبل الـ click */
export const PROFILE_PRIME_HOST_EVENT = 'hami:profile-prime-host';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

async function profilePrefetchAllowed(): Promise<boolean> {
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
    if (!(await profilePrefetchAllowed())) return -1;
    if (isCapacitorNativePlatform()) return 80;
    return 0;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PROFILE_SHELL_HYDRATED_EVENT));
}

export function dispatchProfilePrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PROFILE_PRIME_HOST_EVENT));
}

/**
 * تسخين فوري بعد رفع حاجز الإقلاع — hub + بيانات فقط.
 * ورقة الاستوديو تُحمَّل عند نية الفتح (زر الاستوديو / openSettings).
 */
export function prefetchProfileAfterBootReveal(userId?: string | null): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    void profilePrefetchAllowed().then((ok) => {
        if (!ok || coldBootPrefetchStarted) return;
        coldBootPrefetchStarted = true;
        void ensureDeferredFeatureStylesLoaded();
        prefetchProfileHubModuleNow();
        void hydrateProfileShellForInstantOpenWithData(userId, false).catch(() => undefined);
    });
}

/**
 * تهيئة shell الملف المهني + كاش البيانات للفتح الفوري.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateProfileShellForInstantOpenWithData(
    userId?: string | null,
    force = false,
): Promise<boolean> {
    const run = async (): Promise<boolean> => {
        if (!force && !(await profilePrefetchAllowed())) return false;
        const hub = await loadProfileHubLoader();
        if (hub.isProfileShellModuleResolved()) {
            hub.prefetchProfileHubModule();
            if (userId?.trim()) {
                warmProfileData(userId);
            }
            dispatchHydratedOnce();
            return true;
        }
        if (hydrateInflight) {
            return hydrateInflight.then((ok) => {
                if (ok && userId?.trim()) {
                    warmProfileData(userId);
                }
                return ok;
            });
        }

        hydrateInflight = hub
            .hydrateProfileShellForInstantOpen()
            .then((ok) => {
                if (ok) {
                    if (userId?.trim()) {
                        warmProfileData(userId);
                    }
                    dispatchHydratedOnce();
                }
                return ok;
            })
            .finally(() => {
                hydrateInflight = null;
            });

        return hydrateInflight;
    };
    return run();
}

/**
 * يُجدول:
 * 1) prefetch فوري عند `hami:boot-reveal-done`
 * 2) hydrate إضافي عند `hami:dashboard-interactive`
 */
export function bindProfileBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;
    const uid = userId?.trim() || undefined;

    const onBootRevealDone = () => {
        prefetchProfileAfterBootReveal(uid);
    };

    const scheduleHydrate = () => {
        prefetchProfileAfterBootReveal(uid);
        void hydrateDelayMs().then((delay) => {
            if (delay < 0) return;
            cancelIdle?.();
            cancelIdle = scheduleIdleWork(
                () => {
                    prefetchProfileHubModuleNow();
                    void hydrateProfileShellForInstantOpenWithData(uid);
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
export function resetProfileBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
    coldBootPrefetchStarted = false;
}
