import { useEffect } from 'react';
import type { DragSession, PendingDrag } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragUtils';
import { DRAG_THRESHOLD_PX } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragUtils';
import { preventDefaultIfCancelable } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

type Args = {
    editable: boolean;
    dragRef: React.MutableRefObject<DragSession | null>;
    pendingRef: React.MutableRefObject<PendingDrag | null>;
    activateDrag: (pending: PendingDrag, clientX: number, clientY: number) => void;
    updateDragPosition: (clientX: number, clientY: number) => void;
    endDrag: (pointerId: number) => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
};

function firstTouchClient(event: TouchEvent): { x: number; y: number } | null {
    const t = event.touches[0] ?? event.changedTouches[0];
    if (!t) return null;
    return { x: t.clientX, y: t.clientY };
}

/** مستمعات المؤشر على document — pointercancel لا يُنهي سحباً نشطاً (WebView أندرويد) */
export function useProfileCustomBlocksPointerBindings({
    editable,
    dragRef,
    pendingRef,
    activateDrag,
    updateDragPosition,
    endDrag,
    canvasRef,
}: Args): void {
    useEffect(() => {
        if (!editable) return;
        const onDocPointerMove = (event: PointerEvent) => {
            const pending = pendingRef.current;
            const drag = dragRef.current;
            if (drag && drag.pointerId === event.pointerId) {
                preventDefaultIfCancelable(event);
                updateDragPosition(event.clientX, event.clientY);
                return;
            }
            if (!pending || pending.pointerId !== event.pointerId) return;
            const dx = event.clientX - pending.startX;
            const dy = event.clientY - pending.startY;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
            preventDefaultIfCancelable(event);
            pendingRef.current = null;
            activateDrag(pending, event.clientX, event.clientY);
            updateDragPosition(event.clientX, event.clientY);
        };
        const onDocPointerUp = (event: PointerEvent) => {
            endDrag(event.pointerId);
        };
        const onDocPointerCancel = (event: PointerEvent) => {
            if (dragRef.current?.pointerId === event.pointerId) return;
            const pending = pendingRef.current;
            if (pending?.pointerId === event.pointerId) {
                endDrag(event.pointerId);
            }
        };
        document.addEventListener('pointermove', onDocPointerMove, { passive: false, capture: true });
        document.addEventListener('pointerup', onDocPointerUp, { capture: true });
        document.addEventListener('pointercancel', onDocPointerCancel, { capture: true });
        return () => {
            document.removeEventListener('pointermove', onDocPointerMove, { capture: true });
            document.removeEventListener('pointerup', onDocPointerUp, { capture: true });
            document.removeEventListener('pointercancel', onDocPointerCancel, { capture: true });
        };
    }, [activateDrag, dragRef, editable, endDrag, pendingRef, updateDragPosition]);

    useEffect(() => {
        if (!editable) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onTouchStart = (event: TouchEvent) => {
            const target = event.target as Element | null;
            if (!target?.closest('.profile-block-drag-handle')) return;
            preventDefaultIfCancelable(event);
        };
        const onTouchMove = (event: TouchEvent) => {
            if (!dragRef.current && !pendingRef.current) return;
            preventDefaultIfCancelable(event);
            const pt = firstTouchClient(event);
            if (!pt) return;
            const drag = dragRef.current;
            if (drag) {
                updateDragPosition(pt.x, pt.y);
                return;
            }
            const pending = pendingRef.current;
            if (!pending) return;
            const dx = pt.x - pending.startX;
            const dy = pt.y - pending.startY;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
            pendingRef.current = null;
            activateDrag(pending, pt.x, pt.y);
            updateDragPosition(pt.x, pt.y);
        };
        const onTouchEnd = () => {
            const drag = dragRef.current;
            if (drag) endDrag(drag.pointerId);
        };

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
        canvas.addEventListener('touchcancel', onTouchEnd);
        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            canvas.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [activateDrag, canvasRef, dragRef, editable, endDrag, pendingRef, updateDragPosition]);
}
