import { useRef } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { type DragSession, type PendingDrag } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragUtils';
import { useProfileCustomBlocksLiveState } from './useProfileCustomBlocksLiveState';
import { useProfileCustomBlocksDragSession } from './useProfileCustomBlocksDragSession';
import { useProfileCustomBlocksPointerBindings } from './useProfileCustomBlocksPointerBindings';

type UseProfileCustomBlocksDragArgs = {
    blocks: ProfileCustomBlock[];
    editable: boolean;
    onBlocksLayoutChange?: (blocks: ProfileCustomBlock[]) => void;
};

/** تركيب: حالة حية + جلسة سحب + مستمعات المؤشر */
export function useProfileCustomBlocksDrag({
    blocks,
    editable,
    onBlocksLayoutChange,
}: UseProfileCustomBlocksDragArgs) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragSession | null>(null);
    const pendingRef = useRef<PendingDrag | null>(null);

    const live = useProfileCustomBlocksLiveState({
        blocks,
        editable,
        dragRef,
        pendingRef,
    });

    const session = useProfileCustomBlocksDragSession({
        canvasRef,
        dragRef,
        pendingRef,
        liveBlocksRef: live.liveBlocksRef,
        setDragActive: live.setDragActive,
        commitBlocks: live.commitBlocks,
        onBlocksLayoutChange,
        editable,
    });

    useProfileCustomBlocksPointerBindings({
        editable,
        dragRef,
        pendingRef,
        activateDrag: session.activateDrag,
        updateDragPosition: session.updateDragPosition,
        endDrag: session.endDrag,
        canvasRef,
    });

    return {
        sorted: live.sorted,
        liveBlocks: live.liveBlocks,
        canvasRef,
        dragActive: live.dragActive,
        canvasMinHeight: live.canvasMinHeight,
        onHandlePointerDown: session.onHandlePointerDown,
        onBlockShellPointerDown: session.onBlockShellPointerDown,
    };
}
