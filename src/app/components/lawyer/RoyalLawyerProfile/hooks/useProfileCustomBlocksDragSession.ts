import { useCallback, useEffect, useRef } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    type DragSession,
    type PendingDrag,
    isCoarsePointerEvent,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragUtils';
import {
    applyProfileBlockDragTransform,
    beginProfileBlockDragSession,
    buildDragCommittedBlocks,
    computeProfileBlockDragPosition,
    finishProfileBlockDragVisual,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragMath';
import {
    capturePointerSafe,
    isPrimaryDragPointer,
    preventDefaultIfCancelable,
    releasePointerSafe,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

type Args = {
    canvasRef: React.RefObject<HTMLDivElement | null>;
    dragRef: React.MutableRefObject<DragSession | null>;
    pendingRef: React.MutableRefObject<PendingDrag | null>;
    liveBlocksRef: React.MutableRefObject<ProfileCustomBlock[]>;
    setDragActive: React.Dispatch<React.SetStateAction<boolean>>;
    commitBlocks: (
        next: ProfileCustomBlock[],
        onBlocksLayoutChange?: (blocks: ProfileCustomBlock[]) => void,
    ) => void;
    onBlocksLayoutChange?: (blocks: ProfileCustomBlock[]) => void;
    editable: boolean;
};

/** جلسة سحب واحدة: تفعيل / تحريك / إنهاء / طابور pointer */
export function useProfileCustomBlocksDragSession({
    canvasRef,
    dragRef,
    pendingRef,
    liveBlocksRef,
    setDragActive,
    commitBlocks,
    onBlocksLayoutChange,
    editable,
}: Args) {
    const rafRef = useRef<number>(0);

    const finalizeDrag = useCallback(
        (drag: DragSession) => {
            finishProfileBlockDragVisual(drag);
            const next = buildDragCommittedBlocks(liveBlocksRef.current, drag);
            dragRef.current = null;
            setDragActive(false);
            commitBlocks(next, onBlocksLayoutChange);
        },
        [commitBlocks, dragRef, liveBlocksRef, onBlocksLayoutChange, setDragActive],
    );

    const activateDrag = useCallback(
        (pending: PendingDrag, clientX: number, clientY: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const session = beginProfileBlockDragSession({ canvas, pending, clientX, clientY });
            dragRef.current = session;
            setDragActive(true);
        },
        [canvasRef, dragRef, setDragActive],
    );

    const updateDragPosition = useCallback(
        (clientX: number, clientY: number) => {
            const drag = dragRef.current;
            if (!drag) return;
            const { posX, posY, dx, dy } = computeProfileBlockDragPosition(clientX, clientY, drag);
            drag.pendingPosX = posX;
            drag.pendingPosY = posY;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                applyProfileBlockDragTransform(drag.element, dx, dy);
                rafRef.current = 0;
            });
        },
        [dragRef],
    );

    const endDrag = useCallback(
        (pointerId: number, canvas?: HTMLDivElement | null) => {
            const pending = pendingRef.current;
            if (pending?.pointerId === pointerId) {
                pendingRef.current = null;
                releasePointerSafe(pending.captureTarget, pointerId);
                return;
            }
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== pointerId) return;
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }
            dragRef.current = null;
            const root = canvas ?? canvasRef.current;
            releasePointerSafe(drag.captureTarget, pointerId);
            if (root && root !== drag.captureTarget) {
                releasePointerSafe(root, pointerId);
            }
            finalizeDrag(drag);
        },
        [canvasRef, dragRef, finalizeDrag, pendingRef],
    );

    const queueDrag = useCallback(
        (blockId: string, block: ProfileCustomBlock, index: number, event: React.PointerEvent) => {
            if (!editable) return;
            if (!isPrimaryDragPointer(event)) return;
            const element = event.currentTarget.closest(
                '[data-profile-block-item]',
            ) as HTMLDivElement | null;
            if (!element) return;
            event.stopPropagation();
            if (isCoarsePointerEvent(event)) {
                preventDefaultIfCancelable(event);
            }
            const captureTarget = event.currentTarget as Element;
            capturePointerSafe(captureTarget, event.pointerId);
            pendingRef.current = {
                id: blockId,
                block,
                index,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                element,
                captureTarget,
            };
        },
        [editable, pendingRef],
    );

    const onHandlePointerDown = useCallback(
        (
            blockId: string,
            block: ProfileCustomBlock,
            index: number,
            event: React.PointerEvent<HTMLButtonElement>,
        ) => {
            queueDrag(blockId, block, index, event);
            if (!isCoarsePointerEvent(event)) return;
            const pending = pendingRef.current;
            if (!pending) return;
            pendingRef.current = null;
            activateDrag(pending, event.clientX, event.clientY);
        },
        [activateDrag, queueDrag],
    );

    const onBlockShellPointerDown = useCallback(
        (
            blockId: string,
            block: ProfileCustomBlock,
            index: number,
            event: React.PointerEvent<HTMLDivElement>,
        ) => {
            if (!editable) return;
            if (isCoarsePointerEvent(event)) return;
            const target = event.target as HTMLElement;
            if (target.closest('.profile-block-drag-handle')) return;
            if (target.closest('input, textarea, [contenteditable="true"]')) return;
            queueDrag(blockId, block, index, event);
        },
        [editable, queueDrag],
    );

    useEffect(
        () => () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        },
        [],
    );

    return {
        finalizeDrag,
        activateDrag,
        updateDragPosition,
        endDrag,
        onHandlePointerDown,
        onBlockShellPointerDown,
    };
}
