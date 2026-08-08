import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical } from '@/app/components/ui/lucideIcons';
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
    /** عند فتح الاستوديو: عطّل تفاعل الصفحة حتى لا ينافس معاينة الـ dock على الـ slot */
    interactionsEnabled?: boolean;
    onBlocksLayoutChange?: (blocks: ProfileCustomBlock[]) => void;
};

/** تجاوز هذه المسافة قبل بدء السحب — يمنع التعارض مع التمرير على اللمس */
const DRAG_THRESHOLD_PX = 10;

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
    scrollParent: HTMLElement | null;
    prevScrollTouchAction: string;
    prevScrollOverflow: string;
};

type PendingDrag = {
    id: string;
    block: ProfileCustomBlock;
    index: number;
    pointerId: number;
    startX: number;
    startY: number;
    element: HTMLDivElement;
};

function findProfileScrollParent(node: HTMLElement | null): HTMLElement | null {
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

function lockProfileScroll(scrollParent: HTMLElement | null): { touchAction: string; overflow: string } {
    if (!scrollParent) return { touchAction: '', overflow: '' };
    const prevTouchAction = scrollParent.style.touchAction;
    const prevOverflow = scrollParent.style.overflow;
    scrollParent.style.touchAction = 'none';
    scrollParent.style.overflow = 'hidden';
    scrollParent.dataset.profileDragScrollLock = 'true';
    return { touchAction: prevTouchAction, overflow: prevOverflow };
}

function unlockProfileScroll(
    scrollParent: HTMLElement | null,
    prev: { touchAction: string; overflow: string },
) {
    if (!scrollParent) return;
    scrollParent.style.touchAction = prev.touchAction;
    scrollParent.style.overflow = prev.overflow;
    delete scrollParent.dataset.profileDragScrollLock;
}

function isCoarsePointerEvent(event: { pointerType: string }): boolean {
    return event.pointerType === 'touch' || event.pointerType === 'pen';
}

export function ProfileCustomBlocks({
    blocks,
    editable = false,
    interactionsEnabled = true,
    onBlocksLayoutChange,
}: ProfileCustomBlocksProps) {
    const sorted = useMemo(() => sortProfileCustomBlocks(blocks), [blocks]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [liveBlocks, setLiveBlocks] = useState(sorted);
    const liveBlocksRef = useRef(sorted);
    const dragRef = useRef<DragSession | null>(null);
    const pendingRef = useRef<PendingDrag | null>(null);
    const rafRef = useRef<number>(0);
    const [dragActive, setDragActive] = useState(false);
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
        if (dragRef.current || pendingRef.current) return;
        setLiveBlocks(sorted);
        liveBlocksRef.current = sorted;
        setCanvasMinHeight(estimateProfileCanvasMinHeight(sorted));
    }, [blocksFingerprint, sorted]);

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
    }, [editable]);

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
        el.style.transform = '';
    }, []);

    const applyDragTransform = useCallback((el: HTMLDivElement, dx: number, dy: number) => {
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }, []);

    const computePosition = useCallback((clientX: number, clientY: number, drag: DragSession) => {
        const dx = clientX - drag.startX;
        const dy = clientY - drag.startY;
        const posX = clampPct(drag.startPosX + (-dx / drag.canvasWidth) * 100, 2, 94);
        const posY = clampPct(drag.startPosY + (dy / drag.canvasHeight) * 100, 2, 90);
        return { posX, posY, dx, dy };
    }, []);

    const finalizeDrag = useCallback(
        (drag: DragSession) => {
            drag.element.dataset.dragging = 'false';
            drag.element.style.willChange = '';
            drag.element.style.touchAction = '';
            applyElementPosition(drag.element, drag.pendingPosX, drag.pendingPosY);
            unlockProfileScroll(drag.scrollParent, {
                touchAction: drag.prevScrollTouchAction,
                overflow: drag.prevScrollOverflow,
            });

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
            setDragActive(false);
            commitBlocks(next);
        },
        [applyElementPosition, commitBlocks],
    );

    const activateDrag = useCallback(
        (pending: PendingDrag, clientX: number, clientY: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const { posX, posY } = resolveBlockPosition(pending.block, pending.index);
            const scrollParent = findProfileScrollParent(canvas);
            const scrollLock = lockProfileScroll(scrollParent);

            try {
                canvas.setPointerCapture(pending.pointerId);
            } catch {
                unlockProfileScroll(scrollParent, scrollLock);
                return;
            }

            pending.element.dataset.dragging = 'true';
            pending.element.style.willChange = 'transform';
            pending.element.style.touchAction = 'none';

            dragRef.current = {
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
            };
            setDragActive(true);
        },
        [],
    );

    const updateDragPosition = useCallback(
        (clientX: number, clientY: number) => {
            const drag = dragRef.current;
            if (!drag) return;

            const { posX, posY, dx, dy } = computePosition(clientX, clientY, drag);
            drag.pendingPosX = posX;
            drag.pendingPosY = posY;

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                applyDragTransform(drag.element, dx, dy);
                rafRef.current = 0;
            });
        },
        [applyDragTransform, computePosition],
    );

    const endDrag = useCallback(
        (pointerId: number, canvas?: HTMLDivElement | null) => {
            const pending = pendingRef.current;
            if (pending?.pointerId === pointerId) {
                pendingRef.current = null;
                return;
            }

            const drag = dragRef.current;
            if (!drag || drag.pointerId !== pointerId) return;

            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }

            // مسح الجلسة قبل release — lostpointercapture يُطلق متزامناً
            dragRef.current = null;

            const root = canvas ?? canvasRef.current;
            if (root?.hasPointerCapture(pointerId)) {
                try {
                    root.releasePointerCapture(pointerId);
                } catch {
                    /* ignore */
                }
            }

            finalizeDrag(drag);
        },
        [finalizeDrag],
    );

    useEffect(() => {
        if (!editable) return;

        const onDocPointerMove = (event: PointerEvent) => {
            const pending = pendingRef.current;
            const drag = dragRef.current;

            if (drag && drag.pointerId === event.pointerId) {
                event.preventDefault();
                updateDragPosition(event.clientX, event.clientY);
                return;
            }

            if (!pending || pending.pointerId !== event.pointerId) return;

            const dx = event.clientX - pending.startX;
            const dy = event.clientY - pending.startY;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

            event.preventDefault();
            pendingRef.current = null;
            activateDrag(pending, event.clientX, event.clientY);
            updateDragPosition(event.clientX, event.clientY);
        };

        const onDocPointerEnd = (event: PointerEvent) => {
            endDrag(event.pointerId);
        };

        document.addEventListener('pointermove', onDocPointerMove, { passive: false, capture: true });
        document.addEventListener('pointerup', onDocPointerEnd, { capture: true });
        document.addEventListener('pointercancel', onDocPointerEnd, { capture: true });

        return () => {
            document.removeEventListener('pointermove', onDocPointerMove, { capture: true });
            document.removeEventListener('pointerup', onDocPointerEnd, { capture: true });
            document.removeEventListener('pointercancel', onDocPointerEnd, { capture: true });
        };
    }, [activateDrag, editable, endDrag, updateDragPosition]);

    useEffect(() => {
        if (!editable) return;
        const onLostCapture = () => {
            const drag = dragRef.current;
            if (!drag) return;
            dragRef.current = null;
            finalizeDrag(drag);
        };
        const canvas = canvasRef.current;
        canvas?.addEventListener('lostpointercapture', onLostCapture);
        return () => canvas?.removeEventListener('lostpointercapture', onLostCapture);
    }, [editable, finalizeDrag]);

    const queueDrag = useCallback(
        (blockId: string, block: ProfileCustomBlock, index: number, event: React.PointerEvent) => {
            if (!editable) return;
            if (event.button !== 0) return;

            const element = event.currentTarget.closest('[data-profile-block-item]') as HTMLDivElement | null;
            if (!element) return;

            event.stopPropagation();
            if (isCoarsePointerEvent(event)) {
                event.preventDefault();
            }

            pendingRef.current = {
                id: blockId,
                block,
                index,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                element,
            };
        },
        [editable],
    );

    const onHandlePointerDown = useCallback(
        (blockId: string, block: ProfileCustomBlock, index: number, event: React.PointerEvent<HTMLButtonElement>) => {
            queueDrag(blockId, block, index, event);
        },
        [queueDrag],
    );

    const onBlockShellPointerDown = useCallback(
        (blockId: string, block: ProfileCustomBlock, index: number, event: React.PointerEvent<HTMLDivElement>) => {
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

    if (sorted.length === 0) return null;

    const blockInteractive = interactionsEnabled && !editable;

    return (
        <div className="px-4 mt-5">
            <div
                ref={canvasRef}
                data-profile-blocks-canvas
                data-editable={editable ? 'true' : 'false'}
                data-drag-active={dragActive ? 'true' : 'false'}
                className="relative w-full"
                style={{ minHeight: canvasMinHeight }}
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
                            onPointerDown={
                                editable
                                    ? (e) => onBlockShellPointerDown(block.id, block, index, e)
                                    : undefined
                            }
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
                                    <GripVertical size={14} aria-hidden />
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
