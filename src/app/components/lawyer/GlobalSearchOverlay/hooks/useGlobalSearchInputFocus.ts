import { useEffect, useRef, type RefObject } from 'react';

import { GLOBAL_SEARCH_SHELL_HYDRATED_EVENT } from '@/app/runtime/globalSearchBootHydrator';
import { isGlobalSearchOverlayModuleResolved } from '@/app/runtime/globalSearchLoader';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

/** بعد اكتمال فتح الورقة + swap الـ chunk — يمنع وميض الكيبورد */
const FOCUS_SETTLE_MS_DESKTOP = 160;
const FOCUS_SETTLE_MS_MOBILE = 120;

/**
 * تركيز واحد لكل جلسة فتح — بعد استقرار الـ shell وليس أثناء swap Instant→Overlay.
 */
export function useGlobalSearchInputFocus(
    open: boolean,
    inputRef: RefObject<HTMLInputElement | null>,
    focusArmed = true,
): void {
    const focusedForOpenRef = useRef(false);

    useEffect(() => {
        if (!open || !focusArmed || isCapacitorNativePlatform()) {
            focusedForOpenRef.current = false;
            return;
        }

        let cancelled = false;
        let settleTimer: number | null = null;
        let frame2 = 0;

        const tryFocus = () => {
            if (cancelled || focusedForOpenRef.current) return;
            const el = inputRef.current;
            if (!el || !el.isConnected) return;
            if (document.activeElement === el) {
                focusedForOpenRef.current = true;
                return;
            }
            el.focus({ preventScroll: true });
            focusedForOpenRef.current = true;
        };

        const scheduleFocus = () => {
            if (cancelled || focusedForOpenRef.current) return;
            const frame1 = requestAnimationFrame(() => {
                frame2 = requestAnimationFrame(() => {
                    if (cancelled) return;
                    const settleMs =
                        typeof navigator !== 'undefined' &&
                        /android|iphone|ipad|ipod/i.test(navigator.userAgent)
                            ? FOCUS_SETTLE_MS_MOBILE
                            : FOCUS_SETTLE_MS_DESKTOP;
                    settleTimer = window.setTimeout(tryFocus, settleMs);
                });
            });
            void frame1;
        };

        const armFocus = () => {
            if (cancelled) return;
            let moduleReady = true;
            try {
                moduleReady = isGlobalSearchOverlayModuleResolved();
            } catch {
                moduleReady = true;
            }
            if (!moduleReady) return;
            scheduleFocus();
        };

        armFocus();
        const onHydrated = () => armFocus();
        window.addEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);
            if (frame2) cancelAnimationFrame(frame2);
            if (settleTimer != null) window.clearTimeout(settleTimer);
        };
    }, [open, inputRef, focusArmed]);
}
