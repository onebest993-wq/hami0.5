import { useCallback, useRef } from 'react';

const DEFAULT_SLOP_PX = 12;

type ScrollSafePressOptions = {
    disabled?: boolean;
    slopPx?: number;
    onPress?: () => void;
    onPointerDown?: (event: React.PointerEvent) => void;
};

/**
 * يميّز النقر من التمرير — يفتح عند pointerup/click فقط إذا لم يتجاوز slop.
 */
export function useScrollSafePress({
    disabled = false,
    slopPx = DEFAULT_SLOP_PX,
    onPress,
    onPointerDown: onPointerDownSideEffect,
}: ScrollSafePressOptions) {
    const originRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
    const scrolledRef = useRef(false);
    const handledRef = useRef(false);

    const reset = useCallback(() => {
        originRef.current = null;
        scrolledRef.current = false;
    }, []);

    const onPointerDown = useCallback(
        (event: React.PointerEvent) => {
            if (disabled || event.button !== 0) return;
            originRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
            scrolledRef.current = false;
            onPointerDownSideEffect?.(event);
        },
        [disabled, onPointerDownSideEffect],
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent) => {
            if (disabled || !originRef.current || scrolledRef.current) return;
            if (event.pointerId !== originRef.current.pointerId) return;
            const dx = event.clientX - originRef.current.x;
            const dy = event.clientY - originRef.current.y;
            if (dx * dx + dy * dy > slopPx * slopPx) {
                scrolledRef.current = true;
            }
        },
        [disabled, slopPx],
    );

    const onPointerUp = useCallback(
        (event: React.PointerEvent) => {
            if (disabled || event.button !== 0 || !onPress) return;
            if (!originRef.current || event.pointerId !== originRef.current.pointerId) {
                reset();
                return;
            }
            const wasScroll = scrolledRef.current;
            reset();
            if (wasScroll) return;
            handledRef.current = true;
            onPress();
        },
        [disabled, onPress, reset],
    );

    const onPointerCancel = useCallback(() => {
        reset();
    }, [reset]);

    const onClick = useCallback(
        (event: React.MouseEvent) => {
            if (disabled || !onPress) return;
            if (handledRef.current) {
                handledRef.current = false;
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            const origin = originRef.current;
            if (origin) {
                const dx = event.clientX - origin.x;
                const dy = event.clientY - origin.y;
                originRef.current = null;
                if (dx * dx + dy * dy > slopPx * slopPx) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }
            onPress();
        },
        [disabled, onPress, slopPx],
    );

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onClick,
    };
}
