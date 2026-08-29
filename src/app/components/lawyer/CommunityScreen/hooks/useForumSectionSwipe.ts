import { useCallback, useRef, type RefObject } from 'react';
import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import { resolveForumSectionSwipe } from '@/app/components/lawyer/CommunityScreen/forumSectionOrder';
import { isForumSwipeFromSystemGestureEdge } from '@/app/components/lawyer/CommunityScreen/forumSwipeEdgeGuard';

type PointerOrigin = {
    x: number;
    y: number;
    pointerId: number;
};

export type UseForumSectionSwipeOptions = {
    activeSection: CommunitySection;
    onSectionChange: (section: CommunitySection) => void;
    enabled?: boolean;
};

export function shouldIgnoreForumSectionSwipeTarget(target: EventTarget | null): boolean {
    return (
        target instanceof Element &&
        Boolean(
            target.closest(
                'button, a, input, textarea, select, label, [role="button"], [data-forum-no-swipe]',
            ),
        )
    );
}

/**
 * إيماءة سحب أفقي بين أقسام المنتدى (المنتدى ↔ المجموعات ↔ المستودع).
 * لا يتعارض مع التمرير العمودي — يُفعَّل فقط عند سحب أفقي واضح.
 */
export function useForumSectionSwipe(
    containerRef: RefObject<HTMLElement | null>,
    { activeSection, onSectionChange, enabled = true }: UseForumSectionSwipeOptions,
) {
    const originRef = useRef<PointerOrigin | null>(null);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (!enabled || event.button !== 0) return;
            if (shouldIgnoreForumSectionSwipeTarget(event.target)) return;
            if (isForumSwipeFromSystemGestureEdge(event.clientX)) return;
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
            const next = resolveForumSectionSwipe(activeSection, deltaX, deltaY);
            if (next && next !== activeSection) {
                onSectionChange(next);
            }
        },
        [activeSection, enabled, onSectionChange],
    );

    const onPointerCancel = useCallback(() => {
        originRef.current = null;
    }, []);

    return {
        containerRef,
        swipeHandlers: {
            onPointerDown,
            onPointerUp,
            onPointerCancel,
        },
    };
}
