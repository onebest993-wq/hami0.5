import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

/** تجاوز هذه المسافة قبل بدء السحب — يمنع التعارض مع التمرير على اللمس */
export const DRAG_THRESHOLD_PX = 10;

export function clampPct(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export type DragSession = {
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    element: HTMLDivElement;
    pendingPosX: number;
    pendingPosY: number;
    canvasWidth: number;
    canvasHeight: number;
    scrollParent: HTMLElement | null;
    prevScrollTouchAction: string;
    prevScrollOverflow: string;
    captureTarget: Element | null;
};

export type PendingDrag = {
    id: string;
    block: ProfileCustomBlock;
    index: number;
    pointerId: number;
    startX: number;
    startY: number;
    element: HTMLDivElement;
    captureTarget: Element | null;
};

export function findProfileScrollParent(node: HTMLElement | null): HTMLElement | null {
    let current = node?.parentElement ?? null;
    while (current) {
        const style = window.getComputedStyle(current);
        const scrollable =
            /(auto|scroll)/.test(style.overflowY) &&
            current.scrollHeight > current.clientHeight + 1;
        if (scrollable) return current;
        current = current.parentElement;
    }
    return null;
}

export function lockProfileScroll(scrollParent: HTMLElement | null): {
    touchAction: string;
    overflow: string;
} {
    if (!scrollParent) return { touchAction: '', overflow: '' };
    const prevTouchAction = scrollParent.style.touchAction;
    const prevOverflow = scrollParent.style.overflow;
    scrollParent.style.touchAction = 'none';
    scrollParent.style.overflow = 'hidden';
    scrollParent.dataset.profileDragScrollLock = 'true';
    return { touchAction: prevTouchAction, overflow: prevOverflow };
}

export function unlockProfileScroll(
    scrollParent: HTMLElement | null,
    prev: { touchAction: string; overflow: string },
) {
    if (!scrollParent) return;
    scrollParent.style.touchAction = prev.touchAction;
    scrollParent.style.overflow = prev.overflow;
    delete scrollParent.dataset.profileDragScrollLock;
}

export function isCoarsePointerEvent(event: { pointerType: string }): boolean {
    return event.pointerType === 'touch' || event.pointerType === 'pen';
}
