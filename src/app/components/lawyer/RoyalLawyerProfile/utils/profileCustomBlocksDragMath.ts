import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { resolveBlockPosition, sortProfileCustomBlocks } from '@/app/services/profile/profilePageCustomization';
import {
    type DragSession,
    type PendingDrag,
    clampPct,
    findProfileScrollParent,
    lockProfileScroll,
    unlockProfileScroll,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragUtils';
import { capturePointerSafe } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

function applyProfileBlockElementPosition(
    el: HTMLDivElement,
    posX: number,
    posY: number,
): void {
    el.style.right = `${posX}%`;
    el.style.top = `${posY}%`;
    el.style.transform = '';
}

export function applyProfileBlockDragTransform(
    el: HTMLDivElement,
    dx: number,
    dy: number,
): void {
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
}

export function computeProfileBlockDragPosition(
    clientX: number,
    clientY: number,
    drag: DragSession,
): { posX: number; posY: number; dx: number; dy: number } {
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    const posX = clampPct(drag.startPosX + (-dx / drag.canvasWidth) * 100, 2, 94);
    const posY = clampPct(drag.startPosY + (dy / drag.canvasHeight) * 100, 2, 90);
    return { posX, posY, dx, dy };
}

export function buildDragCommittedBlocks(
    liveBlocks: ProfileCustomBlock[],
    drag: DragSession,
): ProfileCustomBlock[] {
    const maxOrder = liveBlocks.reduce((max, b) => Math.max(max, b.order ?? 0), 0);
    return sortProfileCustomBlocks(
        liveBlocks.map((b) =>
            b.id === drag.id
                ? {
                      ...b,
                      posX: drag.pendingPosX,
                      posY: drag.pendingPosY,
                      offsetX: 0,
                      offsetY: 0,
                      order: maxOrder + 1,
                  }
                : b,
        ),
    );
}

export function beginProfileBlockDragSession(args: {
    canvas: HTMLDivElement;
    pending: PendingDrag;
    clientX: number;
    clientY: number;
}): DragSession {
    const { canvas, pending, clientX, clientY } = args;
    const rect = canvas.getBoundingClientRect();
    const { posX, posY } = resolveBlockPosition(pending.block, pending.index);
    const scrollParent = findProfileScrollParent(canvas);
    const scrollLock = lockProfileScroll(scrollParent);
    const captureTarget = pending.captureTarget ?? pending.element;
    /* فشل capture لا يُلغي السحب — document pointermove/touchmove يتابعان */
    capturePointerSafe(captureTarget, pending.pointerId);
    if (captureTarget !== canvas) {
        capturePointerSafe(canvas, pending.pointerId);
    }

    pending.element.dataset.dragging = 'true';
    pending.element.style.willChange = 'transform';
    pending.element.style.touchAction = 'none';

    return {
        id: pending.id,
        pointerId: pending.pointerId,
        startX: clientX,
        startY: clientY,
        startPosX: posX,
        startPosY: posY,
        element: pending.element,
        pendingPosX: posX,
        pendingPosY: posY,
        canvasWidth: Math.max(1, rect.width),
        canvasHeight: Math.max(1, rect.height),
        scrollParent,
        prevScrollTouchAction: scrollLock.touchAction,
        prevScrollOverflow: scrollLock.overflow,
        captureTarget,
    };
}

export function finishProfileBlockDragVisual(drag: DragSession): void {
    drag.element.dataset.dragging = 'false';
    drag.element.style.willChange = '';
    drag.element.style.touchAction = '';
    applyProfileBlockElementPosition(drag.element, drag.pendingPosX, drag.pendingPosY);
    unlockProfileScroll(drag.scrollParent, {
        touchAction: drag.prevScrollTouchAction,
        overflow: drag.prevScrollOverflow,
    });
}
