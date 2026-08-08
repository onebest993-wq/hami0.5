import { useRef, useCallback } from 'react';

const DEFAULT_SWIPE_DISMISS_PX = 88;

export type SheetSwipeDismissOptions = {
    enabled?: boolean;
    thresholdPx?: number;
};

/**
 * إغلاق الورقة بالسحب للأسفل — يُربَط بمقبض الورقة أو رأسها.
 */
export function useSheetSwipeDismiss(
    onClose: () => void,
    { enabled = true, thresholdPx = DEFAULT_SWIPE_DISMISS_PX }: SheetSwipeDismissOptions = {},
) {
    const startYRef = useRef(0);
    const activeRef = useRef(false);

    const onTouchStart = useCallback(
        (event: React.TouchEvent) => {
            if (!enabled) return;
            activeRef.current = true;
            startYRef.current = event.touches[0]?.clientY ?? 0;
        },
        [enabled],
    );

    const onTouchEnd = useCallback(
        (event: React.TouchEvent) => {
            if (!enabled || !activeRef.current) return;
            activeRef.current = false;
            const endY = event.changedTouches[0]?.clientY ?? 0;
            if (endY - startYRef.current > thresholdPx) onClose();
        },
        [enabled, onClose, thresholdPx],
    );

    const onTouchCancel = useCallback(() => {
        activeRef.current = false;
    }, []);

    return { onTouchStart, onTouchEnd, onTouchCancel };
}
