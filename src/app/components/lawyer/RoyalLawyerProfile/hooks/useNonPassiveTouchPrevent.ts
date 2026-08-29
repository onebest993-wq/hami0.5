import { useEffect, type RefObject } from 'react';

/**
 * touchstart غير سلبي — WebView أندرويد يسرق الإيماءة للتمرير إن بقي المستمع سلبياً.
 * selector: إن وُجد، يُمنع الافتراضي فقط عندما يطابق الهدف.
 */
export function useNonPassiveTouchPrevent(
    rootRef: RefObject<HTMLElement | null>,
    enabled: boolean,
    selector?: string,
    excludeSelector?: string,
): void {
    useEffect(() => {
        const root = rootRef.current;
        if (!enabled || !root) return;
        const onTouchStart = (event: TouchEvent) => {
            const target = event.target as Element | null;
            if (!target) return;
            if (excludeSelector && target.closest(excludeSelector)) return;
            if (selector && !target.closest(selector)) return;
            if (event.cancelable) event.preventDefault();
        };
        root.addEventListener('touchstart', onTouchStart, { passive: false });
        return () => root.removeEventListener('touchstart', onTouchStart);
    }, [enabled, excludeSelector, rootRef, selector]);
}
