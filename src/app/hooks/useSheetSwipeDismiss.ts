import { useRef, useCallback, type PointerEvent } from 'react';

const DEFAULT_SWIPE_DISMISS_PX = 88;
const MAX_FOLLOW_PX = 480;

export type SheetSwipeDismissOptions = {
    enabled?: boolean;
    thresholdPx?: number;
    /** متابعة الإصبع أثناء السحب — الافتراضي عتبة فقط حتى لا تُكسر أوراق أخرى */
    follow?: boolean;
    onOffsetChange?: (px: number) => void;
};

type SheetPointerTarget = {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
};

/**
 * إغلاق الورقة بالسحب للأسفل — Pointer Events (لمس / قلم / فأرة).
 * يُربَط بمقبض الورقة أو رأسها مع setPointerCapture حتى لا يضيع الإصبع خارج الـ 44px.
 */
export function useSheetSwipeDismiss(
    onClose: () => void,
    {
        enabled = true,
        thresholdPx = DEFAULT_SWIPE_DISMISS_PX,
        follow = false,
        onOffsetChange,
    }: SheetSwipeDismissOptions = {},
) {
    const startYRef = useRef(0);
    const offsetRef = useRef(0);
    const activeRef = useRef(false);
    const pointerIdRef = useRef<number | null>(null);

    const captureTarget = (event: PointerEvent<HTMLElement>) => {
        const target = event.currentTarget as SheetPointerTarget;
        try {
            target.setPointerCapture?.(event.pointerId);
        } catch {
            /* jsdom / هدف بلا capture */
        }
    };

    const releaseTarget = (event: PointerEvent<HTMLElement>) => {
        const target = event.currentTarget as SheetPointerTarget;
        try {
            target.releasePointerCapture?.(event.pointerId);
        } catch {
            /* already released */
        }
    };

    const isTrackedPointer = (event: PointerEvent<HTMLElement>) =>
        pointerIdRef.current === null || event.pointerId === pointerIdRef.current;

    const onPointerDown = useCallback(
        (event: PointerEvent<HTMLElement>) => {
            if (!enabled) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            activeRef.current = true;
            pointerIdRef.current = event.pointerId;
            startYRef.current = event.clientY;
            offsetRef.current = 0;
            captureTarget(event);
        },
        [enabled],
    );

    const onPointerMove = useCallback(
        (event: PointerEvent<HTMLElement>) => {
            if (!enabled || !follow || !activeRef.current || !isTrackedPointer(event)) return;
            const next = Math.min(MAX_FOLLOW_PX, Math.max(0, event.clientY - startYRef.current));
            offsetRef.current = next;
            onOffsetChange?.(next);
        },
        [enabled, follow, onOffsetChange],
    );

    const onPointerUp = useCallback(
        (event: PointerEvent<HTMLElement>) => {
            if (!enabled || !activeRef.current || !isTrackedPointer(event)) return;
            activeRef.current = false;
            pointerIdRef.current = null;
            releaseTarget(event);
            const fromEnd = Math.max(0, event.clientY - startYRef.current);
            const traveled = follow ? Math.max(offsetRef.current, fromEnd) : fromEnd;
            if (traveled > thresholdPx) {
                onClose();
                if (!follow) {
                    offsetRef.current = 0;
                    onOffsetChange?.(0);
                }
                return;
            }
            offsetRef.current = 0;
            onOffsetChange?.(0);
        },
        [enabled, follow, onClose, onOffsetChange, thresholdPx],
    );

    const onPointerCancel = useCallback(
        (event: PointerEvent<HTMLElement>) => {
            if (!isTrackedPointer(event)) return;
            activeRef.current = false;
            pointerIdRef.current = null;
            offsetRef.current = 0;
            onOffsetChange?.(0);
            releaseTarget(event);
        },
        [onOffsetChange],
    );

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
