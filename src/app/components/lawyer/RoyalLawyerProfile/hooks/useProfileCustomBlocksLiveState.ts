import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    estimateProfileCanvasMinHeight,
    sortProfileCustomBlocks,
} from '@/app/services/profile/profilePageCustomization';
import {
    type DragSession,
    type PendingDrag,
    unlockProfileScroll,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragUtils';

type Args = {
    blocks: ProfileCustomBlock[];
    editable: boolean;
    dragRef: React.MutableRefObject<DragSession | null>;
    pendingRef: React.MutableRefObject<PendingDrag | null>;
};

/** مزامنة الكتل الحية + إلغاء سحب عند الخروج من وضع التحرير */
export function useProfileCustomBlocksLiveState({
    blocks,
    editable,
    dragRef,
    pendingRef,
}: Args) {
    const sorted = useMemo(() => sortProfileCustomBlocks(blocks), [blocks]);
    const [liveBlocks, setLiveBlocks] = useState(sorted);
    const liveBlocksRef = useRef(sorted);
    const [dragActive, setDragActive] = useState(false);
    const [canvasMinHeight, setCanvasMinHeight] = useState(() =>
        estimateProfileCanvasMinHeight(sorted),
    );
    const blocksFingerprint = useMemo(
        () =>
            sorted
                .map(
                    (b) =>
                        `${b.id}:${b.order ?? ''}:${b.posX ?? ''}:${b.posY ?? ''}:${b.blockWidthPct ?? ''}`,
                )
                .join('|'),
        [sorted],
    );

    useEffect(() => {
        if (dragRef.current || pendingRef.current) return;
        setLiveBlocks(sorted);
        liveBlocksRef.current = sorted;
        setCanvasMinHeight(estimateProfileCanvasMinHeight(sorted));
    }, [blocksFingerprint, sorted, dragRef, pendingRef]);

    useEffect(() => {
        if (editable) return;
        const drag = dragRef.current;
        pendingRef.current = null;
        if (!drag) return;
        drag.element.style.transform = '';
        drag.element.dataset.dragging = 'false';
        drag.element.style.touchAction = '';
        unlockProfileScroll(drag.scrollParent, {
            touchAction: drag.prevScrollTouchAction,
            overflow: drag.prevScrollOverflow,
        });
        dragRef.current = null;
        setDragActive(false);
    }, [editable, dragRef, pendingRef]);

    const commitBlocks = useCallback(
        (
            next: ProfileCustomBlock[],
            onBlocksLayoutChange?: (blocks: ProfileCustomBlock[]) => void,
        ) => {
            setLiveBlocks(next);
            liveBlocksRef.current = next;
            onBlocksLayoutChange?.(next);
        },
        [],
    );

    return {
        sorted,
        liveBlocks,
        liveBlocksRef,
        dragActive,
        setDragActive,
        canvasMinHeight,
        commitBlocks,
    };
}
