import { useLayoutEffect, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export const HOME_DESTINATION_REVEALED_SESSION_KEY = 'hami:home-destination-revealed';

/** مهلة prefetch للجزر lazy فقط — الشبكة الرئيسية لا تُحجب */
const HOME_LAZY_ISLANDS_TIMEOUT_NATIVE_MS = 400;
const HOME_LAZY_ISLANDS_TIMEOUT_WEB_MS = 800;

export function getHomeDestinationRevealTimeoutMs(): number {
    return isCapacitorNativePlatform()
        ? HOME_LAZY_ISLANDS_TIMEOUT_NATIVE_MS
        : HOME_LAZY_ISLANDS_TIMEOUT_WEB_MS;
}

function readHomeDestinationRevealedSession(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return sessionStorage.getItem(HOME_DESTINATION_REVEALED_SESSION_KEY) === '1';
    } catch {
        return false;
    }
}

function markHomeDestinationRevealedSession(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(HOME_DESTINATION_REVEALED_SESSION_KEY, '1');
    } catch {
        /* ignore */
    }
}

let lazyIslandsPromise: Promise<void> | null = null;

/**
 * prefetch للجزر lazy (منتدى + overlays) — لا يحجب الشبكة الرئيسية.
 * شريط القيادة الحي: DockHalfTile عبر commandHub (LegalCommandCenterDock محذوف).
 */
export function whenHomeDestinationReady(
    timeoutMs = getHomeDestinationRevealTimeoutMs(),
): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (readHomeDestinationRevealedSession()) return Promise.resolve();

    if (!lazyIslandsPromise) {
        lazyIslandsPromise = Promise.race([
            Promise.all([
                import('@/app/runtime/deferredAppStyles').then((m) => m.ensureDeferredAppStylesLoaded()),
                import('@/app/components/lawyer/dashboard/HomeForumSignalsIsland'),
                import('@/app/components/lawyer/dashboard/CommandCenterOverlays'),
            ]).then(() => undefined),
            new Promise<void>((resolve) => {
                window.setTimeout(resolve, timeoutMs);
            }),
        ]).then(() => {
            markHomeDestinationRevealedSession();
        });
    }

    return lazyIslandsPromise;
}

export function resetHomeDestinationRevealForTests(): void {
    lazyIslandsPromise = null;
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(HOME_DESTINATION_REVEALED_SESSION_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * الشبكة الرئيسية تُرسم فوراً — prefetch للجزر lazy بعد content-ready حتى لا تزاحم الهاب.
 */
export function useHomeDestinationReveal(visible: boolean): void {
    const reduceMotion = useReduceMotion();

    useLayoutEffect(() => {
        if (!visible) return undefined;
        if (reduceMotion || readHomeDestinationRevealedSession()) return undefined;

        let cancelled = false;
        void import('@/app/bootstrap/bootReveal').then((boot) => {
            boot.onBootContentReady(() => {
                if (!cancelled) void whenHomeDestinationReady();
            });
        });
        return () => {
            cancelled = true;
        };
    }, [visible, reduceMotion]);
}

/** جزر lazy (منتدى/overlays) — بعد content-ready حتى لا تزاحم أول طلاء */
export function useHomeLazyIslandsReveal(visible: boolean): boolean {
    const reduceMotion = useReduceMotion();
    const [ready, setReady] = useState(
        () => reduceMotion || readHomeDestinationRevealedSession(),
    );

    useLayoutEffect(() => {
        if (!visible) return undefined;
        if (reduceMotion || readHomeDestinationRevealedSession()) {
            setReady(true);
            return undefined;
        }

        let cancelled = false;
        void import('@/app/bootstrap/bootReveal').then((boot) => {
            boot.onBootContentReady(() => {
                void whenHomeDestinationReady().then(() => {
                    if (!cancelled) setReady(true);
                });
            });
        });
        return () => {
            cancelled = true;
        };
    }, [visible, reduceMotion]);

    return Boolean(visible && ready);
}
