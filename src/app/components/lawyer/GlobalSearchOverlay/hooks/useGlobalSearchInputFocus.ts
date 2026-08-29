import { useEffect, useRef, type RefObject } from 'react';

import { GLOBAL_SEARCH_SHELL_HYDRATED_EVENT } from '@/app/runtime/globalSearchBootHydrator';
import { isGlobalSearchOverlayModuleResolved } from '@/app/runtime/globalSearchLoader';
import { GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT } from '@/app/runtime/globalSearchOverlayInteractive';
import {
    GLOBAL_SEARCH_OPEN_INPUT_SELECTOR,
    GLOBAL_SEARCH_OPEN_OVERLAY_SELECTOR,
} from '@/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

function isOverlayInteractive(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(
        document.querySelector(GLOBAL_SEARCH_OPEN_OVERLAY_SELECTOR) &&
            document.querySelector(GLOBAL_SEARCH_OPEN_INPUT_SELECTOR),
    );
}

/**
 * تركيز واحد لكل جلسة فتح — بعد اكتمال تفاعلية الورقة (بلا تأخير زمني اصطناعي).
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

        const focusAfterLayout = () => {
            if (cancelled || focusedForOpenRef.current) return;
            requestAnimationFrame(() => {
                frame2 = requestAnimationFrame(() => {
                    if (!cancelled) tryFocus();
                });
            });
        };

        const armFocus = () => {
            if (cancelled || focusedForOpenRef.current) return;
            let moduleReady = true;
            try {
                moduleReady = isGlobalSearchOverlayModuleResolved();
            } catch {
                moduleReady = true;
            }
            if (!moduleReady) return;
            if (!isOverlayInteractive()) return;
            focusAfterLayout();
        };

        armFocus();
        const onHydrated = () => armFocus();
        const onInteractive = () => armFocus();

        window.addEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);
        window.addEventListener(GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT, onInteractive);

        return () => {
            cancelled = true;
            window.removeEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);
            window.removeEventListener(GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT, onInteractive);
            if (frame2) cancelAnimationFrame(frame2);
        };
    }, [open, inputRef, focusArmed]);
}
