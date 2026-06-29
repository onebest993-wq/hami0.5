import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    estimateProfileCanvasMinHeight,
    inferProfileBlockKind,
    resolveBlockPosition,
    resolveBlockWidthPct,
    sortProfileCustomBlocks,
} from '@/app/services/profile/profilePageCustomization';
import { ProfileCustomBlockView } from './ProfileCustomBlockView';

type ProfileCustomBlocksProps = {
    blocks: ProfileCustomBlock[];
    editable?: boolean;
    onBlocksLayoutChange?: (blocks: ProfileCustomBlock[]) => void;
};

function clampPct(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

type DragSession = {
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
};

export function ProfileCustomBlocks({
    blocks,
    editable = false,
    onBlocksLayoutChange,
}: ProfileCustomBlocksProps) {
    const sorted = useMemo(() => sortProfileCustomBlocks(blocks), [blocks]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [liveBlocks, setLiveBlocks] = useState(sorted);
    const liveBlocksRef = useRef(sorted);
    const dragRef = useRef<DragSession | null>(null);
    const [canvasMinHeight, setCanvasMinHeight] = useState(() => estimateProfileCanvasMinHeight(sorted));
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
        if (dragRef.current) return;
        setLiveBlocks(sorted);
        liveBlocksRef.current = sorted;
        setCanvasMinHeight(estimateProfileCanvasMinHeight(sorted));
    }, [blocksFingerprint, sorted]);

    useLayoutEffect(() => {
        const computed = estimateProfileCanvasMinHeight(liveBlocks);
        setCanvasMinHeight((prev) => Math.max(prev, computed));
    }, [liveBlocks]);

    const commitBlocks = useCallback(
        (next: ProfileCustomBlock[]) => {
            setLiveBlocks(next);
            liveBlocksRef.current = next;
            onBlocksLayoutChange?.(next);
        },
        [onBlocksLayoutChange],
    );

    const applyElementPosition = useCallback((el: HTMLDivElement, posX: number, posY: number) => {
        el.style.right = `${posX}%`;
        el.style.top = `${posY}%`;
    }, []);

    const computePosition = useCallback((clientX: number, clientY: number, drag: DragSession) => {
        const dx = clientX - drag.startX;
        const dy = clientY - drag.startY;
        const posX = clampPct(drag.startPosX + (-dx / drag.canvasWidth) * 100, 2, 94);
        const posY = clampPct(drag.startPosY + (dy / drag.canvasHeight) * 100, 2, 90);
        return { posX, posY };
    }, []);

    const finishDrag = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }

            drag.element.dataset.dragging = 'false';
            const maxOrder = liveBlocksRef.current.reduce((max, b) => Math.max(max, b.order ?? 0), 0);
            const next = sortProfileCustomBlocks(
                liveBlocksRef.current.map((b) =>
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
            dragRef.current = null;
            commitBlocks(next);
        },
        [commitBlocks],
    );

    const onHandlePointerDown = useCallback(
        (blockId: string, block: ProfileCustomBlock, index: number, event: React.PointerEvent<HTMLButtonElement>) => {
            if (!editable) return;
            event.preventDefault();
            event.stopPropagation();
            const canvas = canvasRef.current;
            const element = event.currentTarget.closest('[data-profile-block-item]') as HTMLDivElement | null;
            if (!canvas || !element) return;

            const rect = canvas.getBoundingClientRect();
            const { posX, posY } = resolveBlockPosition(block, index);
            canvas.setPointerCapture(event.pointerId);
            element.dataset.dragging = 'true';
            dragRef.current = {
                id: blockId,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startPosX: posX,
                startPosY: posY,
                element,
                pendingPosX: posX,
                pendingPosY: posY,
                canvasWidth: Math.max(1, rect.width),
                canvasHeight: Math.max(1, rect.height),
            };
        },
        [editable],
    );

    const onCanvasPointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const { posX, posY } = computePosition(event.clientX, event.clientY, drag);
            drag.pendingPosX = posX;
            drag.pendingPosY = posY;
            applyElementPosition(drag.element, posX, posY);
        },
        [applyElementPosition, computePosition],
    );

    if (sorted.length === 0) return null;

    const blockInteractive = !editable;

    return (
        <div className="px-4 mt-5">
            <div
                ref={canvasRef}
                data-profile-blocks-canvas
                data-editable={editable ? 'true' : 'false'}
                className="relative w-full"
                style={{ minHeight: canvasMinHeight }}
                onPointerMove={editable ? onCanvasPointerMove : undefined}
                onPointerUp={editable ? finishDrag : undefined}
                onPointerCancel={editable ? finishDrag : undefined}
            >
                {liveBlocks.map((block, index) => {
                    const kind = inferProfileBlockKind(block);
                    const { posX, posY } = resolveBlockPosition(block, index);
                    const widthPct = resolveBlockWidthPct(block);

                    return (
                        <div
                            key={block.id}
                            data-profile-block-item
                            data-block-kind={kind}
                            data-dragging="false"
                            style={{
                                position: 'absolute',
                                top: `${posY}%`,
                                right: `${posX}%`,
                                width: `${widthPct}%`,
                                maxWidth: '100%',
                                zIndex: (block.order ?? index) + 1,
                            }}
                        >
                            {editable ? (
                                <button
                                    type="button"
                                    className="profile-block-drag-handle"
                                    aria-label="اسحب لتحريك الحاوية"
                                    onPointerDown={(e) => onHandlePointerDown(block.id, block, index, e)}
                                >
                                    <GripVertical size={12} aria-hidden />
                                    <span>اسحب للتحريك</span>
                                </button>
                            ) : null}
                            <ProfileCustomBlockView block={block} interactive={blockInteractive} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
