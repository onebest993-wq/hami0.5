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

/** للواجهة: تخطّي أنيميشن الكشف عند العودة من أقسام */
export function isHomeDestinationRevealedInSession(): boolean {
    return readHomeDestinationRevealedSession();
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
 * prefetch للجزر lazy (منتدى، dock، overlays) — لا يحجب الشبكة الرئيسية.
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
                import('@/app/bootstrap/homeDockBootGate').then((m) => m.waitForHomeDockBootChunk()),
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
 * الشبكة الرئيسية تُرسم فوراً — prefetch للجزر lazy بالخلفية.
 */
export function useHomeDestinationReveal(visible: boolean): boolean {
    const reduceMotion = useReduceMotion();

    useLayoutEffect(() => {
        if (!visible) return undefined;
        if (reduceMotion || readHomeDestinationRevealedSession()) return undefined;

        void whenHomeDestinationReady();
        return undefined;
    }, [visible, reduceMotion]);

    return visible;
}

/** جزر lazy (منتدى/overlays) — تُحمّل بعد الشبكة */
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
        void whenHomeDestinationReady().then(() => {
            if (!cancelled) setReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, [visible, reduceMotion]);

    return Boolean(visible && ready);
}
