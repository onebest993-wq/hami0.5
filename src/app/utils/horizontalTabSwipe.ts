import { useCallback, useRef } from 'react';

type PointerOrigin = {
    x: number;
    y: number;
    pointerId: number;
};

/**
 * سحب أفقي بين تبويبات — لا يُفعَّل إلا عند سحب أفقي واضح (لا يتعارض مع التمرير العمودي).
 * سحب لليسار → التبويب التالي · سحب لليمين → السابق (متسق مع ArrowLeft/ArrowRight في RTL).
 */
export function resolveHorizontalTabSwipe<T extends string>(
    order: readonly T[],
    active: T,
    deltaX: number,
    deltaY: number,
    minDistancePx = 56,
): T | null {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX < minDistancePx || absX < absY * 1.35) return null;

    const index = order.indexOf(active);
    if (index < 0) return null;

    if (deltaX < 0 && index < order.length - 1) {
        return order[index + 1]!;
    }
    if (deltaX > 0 && index > 0) {
        return order[index - 1]!;
    }
    return null;
}

export type UseHorizontalTabSwipeOptions<T extends string> = {
    order: readonly T[];
    activeId: T;
    onChange: (id: T) => void;
    enabled?: boolean;
};

export function useHorizontalTabSwipe<T extends string>({
    order,
    activeId,
    onChange,
    enabled = true,
}: UseHorizontalTabSwipeOptions<T>) {
    const originRef = useRef<PointerOrigin | null>(null);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (!enabled || event.button !== 0) return;
            originRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
        },
        [enabled],
    );

    const onPointerUp = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            const origin = originRef.current;
            originRef.current = null;
            if (!enabled || !origin || origin.pointerId !== event.pointerId) return;

            const deltaX = event.clientX - origin.x;
            const deltaY = event.clientY - origin.y;
            const next = resolveHorizontalTabSwipe(order, activeId, deltaX, deltaY);
            if (next && next !== activeId) {
                onChange(next);
            }
        },
        [activeId, enabled, onChange, order],
    );

    const onPointerCancel = useCallback(() => {
        originRef.current = null;
    }, []);

    return {
        swipeHandlers: {
            onPointerDown,
            onPointerUp,
            onPointerCancel,
        },
    };
}
