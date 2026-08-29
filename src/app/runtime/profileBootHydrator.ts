import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { profileBootHydratorState as profileBootState } from '@/app/runtime/profileBootHydratorState';

function loadProfileHubLoader() {
    return import('@/app/runtime/royalLawyerProfileLoader');
}

function warmProfileData(userId?: string | null): void {
    const uid = userId?.trim();
    if (!uid) return;
    void import('@/app/services/profile/profileWarmCache')
        .then((m) => {
            m.hydrateProfileWarmCachePeekSync(uid);
            return m.warmProfileDataCache(uid);
        })
        .catch(() => undefined);
}

export const PROFILE_SHELL_HYDRATED_EVENT = 'hami:profile-shell-hydrated';
/** pointerdown على زر الملف المهني — يركّب Host مخفياً قبل الـ click */
export const PROFILE_PRIME_HOST_EVENT = 'hami:profile-prime-host';

async function profilePrefetchAllowed(): Promise<boolean> {
    const { isSectionBackgroundPrefetchAllowed } = await import('@/app/runtime/sectionPrefetchPolicy');
    return isSectionBackgroundPrefetchAllowed();
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PROFILE_SHELL_HYDRATED_EVENT));
}

function prefetchPageExtrasAfterHub(): void {
    void import('@/app/runtime/profilePageExtrasPrefetch')
        .then((m) => m.prefetchProfileCustomBlocksChunk())
        .catch(() => undefined);
}

export function dispatchProfilePrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PROFILE_PRIME_HOST_EVENT));
}

/**
 * تسخين بيانات بعد رفع حاجز الإقلاع — بلا مقطع Royal.
 * الشجرة تُحمَّل عند نية الفتح (prime / pointerdown).
 */
export function prefetchProfileAfterBootReveal(userId?: string | null): void {
    if (typeof window === 'undefined' || profileBootState.coldBootPrefetchStarted) return;
    void profilePrefetchAllowed().then((ok) => {
        if (!ok || profileBootState.coldBootPrefetchStarted) return;
        profileBootState.coldBootPrefetchStarted = true;
        warmProfileData(userId);
    });
}

/**
 * بعد تفاعل اللوحة — حمّل مقطع Host/Royal قبل النقرة.
 * الإقلاع يسخّن بيانات فقط حتى لا ينافس أول رسم.
 */
export function prefetchProfileHubAfterInteractive(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/dashboard/profile/ProfileTabHost').catch(() => undefined);
    void loadProfileHubLoader()
        .then((hub) => {
            hub.prefetchProfileHubModule();
            return hub.loadProfileHubModule();
        })
        .then(() => prefetchPageExtrasAfterHub())
        .catch(() => undefined);
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
            prefetchPageExtrasAfterHub();
            if (userId?.trim()) {
                warmProfileData(userId);
            }
            dispatchHydratedOnce();
            return true;
        }
        if (profileBootState.hydrateInflight) {
            return profileBootState.hydrateInflight.then((ok) => {
                if (ok && userId?.trim()) {
                    warmProfileData(userId);
                }
                return ok;
            });
        }

        profileBootState.hydrateInflight = hub
            .hydrateProfileShellForInstantOpen()
            .then((ok) => {
                if (ok) {
                    prefetchPageExtrasAfterHub();
                    if (userId?.trim()) {
                        warmProfileData(userId);
                    }
                    dispatchHydratedOnce();
                }
                return ok;
            })
            .finally(() => {
                profileBootState.hydrateInflight = null;
            });

        return profileBootState.hydrateInflight;
    };
    return run();
}

/**
 * يُجدول:
 * 1) prefetch فوري عند `hami:boot-reveal-done`
 * 2) hydrate إضافي عند `hami:dashboard-interactive`
 */
export function bindProfileBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || profileBootState.bootHydratorArmed) return () => undefined;
    profileBootState.bootHydratorArmed = true;

    const uid = userId?.trim() || undefined;

    const onBootRevealDone = () => {
        prefetchProfileAfterBootReveal(uid);
    };

    const scheduleHydrate = () => {
        prefetchProfileAfterBootReveal(uid);
        prefetchProfileHubAfterInteractive();
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
        profileBootState.bootHydratorArmed = false;
        window.removeEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone);
        window.removeEventListener('hami:dashboard-interactive', scheduleHydrate);
    };
}

/** للاختبارات */
export function resetProfileBootHydratorForTests(): void {
    profileBootState.bootHydratorArmed = false;
    profileBootState.hydrateInflight = null;
    profileBootState.coldBootPrefetchStarted = false;
}
