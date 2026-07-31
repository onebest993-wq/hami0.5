import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateTransactionsShellForInstantOpen,
    isTransactionsHubModuleResolved,
    prefetchTransactionsHubModule,
} from '@/app/runtime/transactionsHubLoader';
import { warmTransactionsOnHover } from '@/app/hooks/lawyerDashboard/transactionsIntentWarm';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';

export const TRANSACTIONS_SHELL_HYDRATED_EVENT = 'hami:transactions-shell-hydrated';
/** pointerdown على بلاطة/دوك المعاملات — يركّب Host مخفياً قبل الـ click */
export const TRANSACTIONS_PRIME_HOST_EVENT = 'hami:transactions-prime-host';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

function transactionsPrefetchAllowed(): boolean {
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
    if (!transactionsPrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 80;
    return 0;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(TRANSACTIONS_SHELL_HYDRATED_EVENT));
}

export function dispatchTransactionsPrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(TRANSACTIONS_PRIME_HOST_EVENT));
}

export function isTransactionsShellFullyHydrated(): boolean {
    return isTransactionsHubModuleResolved();
}

export function prefetchTransactionsAfterBootReveal(userId?: string | null): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!transactionsPrefetchAllowed()) return;
    coldBootPrefetchStarted = true;

    void ensureDeferredFeatureStylesLoaded();
    prefetchTransactionsHubModule();
    void hydrateTransactionsBootShellForInstantOpen(userId, false).catch(() => undefined);
}

/**
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateTransactionsBootShellForInstantOpen(
    userId?: string | null,
    force = false,
): Promise<boolean> {
    if (!force && !transactionsPrefetchAllowed()) return Promise.resolve(false);
    if (isTransactionsShellFullyHydrated()) {
        warmTransactionsOnHover(userId);
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateTransactionsShellForInstantOpen()
        .then((ok) => {
            if (ok) {
                warmTransactionsOnHover(userId);
                dispatchHydratedOnce();
            }
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

export function bindTransactionsBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;
    const uid = userId?.trim() || undefined;

    const onBootRevealDone = () => {
        prefetchTransactionsAfterBootReveal(uid);
    };

    const scheduleHydrate = () => {
        prefetchTransactionsAfterBootReveal(uid);
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchTransactionsHubModule();
                void hydrateTransactionsBootShellForInstantOpen(uid).catch(() => undefined);
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

export function resetTransactionsBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
    coldBootPrefetchStarted = false;
}
