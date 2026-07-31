import { useCallback, useEffect, useRef } from 'react';

const CLOSE_ARM_MS = 320;
const CLOSE_AFTER_POINTER_UP_MS = 80;

/**
 * يمنع إغلاق الطبقة بنقرة فتح الزر نفسها
 * (pointerdown يفتح → click الاصطناعي يصيب الخلفية).
 */
export function useOverlayCloseArm(open: boolean): {
    requestClose: (close: () => void) => void;
    isCloseArmed: () => boolean;
} {
    const armedRef = useRef(false);

    useEffect(() => {
        if (!open) {
            armedRef.current = false;
            return;
        }

        armedRef.current = false;

        let settled = false;
        let armTimer: number | null = null;

        const arm = () => {
            armedRef.current = true;
        };

        const cleanupListeners = () => {
            window.removeEventListener('pointerup', onPointerEnd, true);
            window.removeEventListener('pointercancel', onPointerEnd, true);
            window.clearTimeout(fallbackTimer);
        };

        const armSoon = (delayMs: number) => {
            if (settled) return;
            settled = true;
            cleanupListeners();
            if (delayMs <= 0) {
                arm();
                return;
            }
            armTimer = window.setTimeout(arm, delayMs) as unknown as number;
        };

        const onPointerEnd = () => armSoon(CLOSE_AFTER_POINTER_UP_MS);
        window.addEventListener('pointerup', onPointerEnd, true);
        window.addEventListener('pointercancel', onPointerEnd, true);
        const fallbackTimer = window.setTimeout(() => armSoon(0), CLOSE_ARM_MS);

        return () => {
            settled = true;
            cleanupListeners();
            if (armTimer != null) window.clearTimeout(armTimer);
        };
    }, [open]);

    const requestClose = useCallback((close: () => void) => {
        if (!armedRef.current) return;
        close();
    }, []);

    const isCloseArmed = useCallback(() => armedRef.current, []);

    return { requestClose, isCloseArmed };
}
