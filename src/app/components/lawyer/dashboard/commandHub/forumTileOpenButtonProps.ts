import type { MouseEvent, PointerEvent } from 'react';

type ForumTilePrefetchHandlers = {
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
    onFocus?: () => void;
};

type ForumTilePressHandlers = {
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: (event: PointerEvent) => void;
    onClick: (event: MouseEvent) => void;
};

export function forumTileOpenButtonProps(
    prefetch: ForumTilePrefetchHandlers,
    press: ForumTilePressHandlers,
    interactionDisabled: boolean,
) {
    return {
        type: 'button' as const,
        onPointerEnter: prefetch.onPointerEnter,
        onFocus: prefetch.onFocus,
        onPointerDown: press.onPointerDown,
        onPointerMove: press.onPointerMove,
        onPointerUp: press.onPointerUp,
        onPointerCancel: press.onPointerCancel,
        onClick: press.onClick,
        disabled: interactionDisabled,
        tabIndex: interactionDisabled ? -1 : 0,
    };
}

export function forumTilePrefetchHandlers(interactionDisabled: boolean, onPrefetch?: () => void) {
    if (interactionDisabled || !onPrefetch) {
        return { onPointerEnter: undefined, onPointerDown: undefined, onFocus: undefined };
    }
    return {
        onPointerEnter: onPrefetch,
        onPointerDown: onPrefetch,
        onFocus: onPrefetch,
    };
}
