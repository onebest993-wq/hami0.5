import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { HomeWidgetId, HomeWidgetZone } from '@/app/services/settings/homeLayout';
import {
    clampMainPointerY,
    computeDockPlacementIndex,
    computeMainVisualIndex,
    resolveMainIndicatorY,
    visualIndexToPlacementIndex,
} from './homeLayoutDragUtils';
import { resolveHomeLayoutEscapeAction } from './homeLayoutEscapeStack';

export type HomeLayoutSelectedBlockId = HomeWidgetId | 'dockShell';

type ZoneRects = Partial<Record<HomeWidgetZone, DOMRect>>;

export type DropPreview = {
    zone: HomeWidgetZone;
    placementIndex: number;
    indicatorY: number | null;
} | null;

type HomeLayoutEditContextValue = {
    isEditing: boolean;
    selectedBlockId: HomeLayoutSelectedBlockId | null;
    setSelectedBlockId: (id: HomeLayoutSelectedBlockId | null) => void;
    resizeBlockId: HomeWidgetId | null;
    toggleResizeBlock: (id: HomeWidgetId) => void;
    draggingWidgetId: HomeWidgetId | null;
    dropHighlightZone: HomeWidgetZone | null;
    dropPreview: DropPreview;
    exitEditMode: () => void;
    registerZoneRect: (zone: HomeWidgetZone, rect: DOMRect | null) => void;
    registerScrollContainer: (el: HTMLElement | null) => void;
    beginDrag: (widgetId: HomeWidgetId, clientX: number, clientY: number) => void;
    updateDrag: (clientX: number, clientY: number) => void;
    endDrag: () => void;
    cancelDrag: () => void;
    registerWidgetRect: (widgetId: HomeWidgetId, zone: HomeWidgetZone, rect: DOMRect | null) => void;
};

const HomeLayoutEditContext = createContext<HomeLayoutEditContextValue | null>(null);

const DOCK_SNAP_ABOVE_PX = 24;
const DOCK_HIT_PAD_X = 24;
const DOCK_HIT_PAD_Y = 16;
const MAIN_DOCK_CLEARANCE_PX = 20;
const AUTO_SCROLL_EDGE_PX = 72;
const AUTO_SCROLL_STEP_PX = 14;

function mainZoneMaxY(scrollerBottom: number, dock: DOMRect | undefined): number {
    if (!dock) return scrollerBottom;
    return Math.min(scrollerBottom, dock.top - MAIN_DOCK_CLEARANCE_PX);
}

function inferWidgetZone(
    widgetId: HomeWidgetId,
    widgetRectsRef: React.MutableRefObject<
        Partial<Record<HomeWidgetZone, Array<{ id: HomeWidgetId; rect: DOMRect }>>>
    >,
): HomeWidgetZone | null {
    if (widgetRectsRef.current.dock?.some((entry) => entry.id === widgetId)) return 'dock';
    if (widgetRectsRef.current.main?.some((entry) => entry.id === widgetId)) return 'main';
    return null;
}

export function HomeLayoutEditProvider({
    isEditing,
    onExit,
    onTransferWidget,
    getZoneOrder,
    children,
}: {
    isEditing: boolean;
    onExit: () => void;
    onTransferWidget: (widgetId: HomeWidgetId, zone: HomeWidgetZone, index: number) => void;
    getZoneOrder: (zone: HomeWidgetZone) => HomeWidgetId[];
    children: React.ReactNode;
}) {
    const [selectedBlockId, setSelectedBlockIdState] = useState<HomeLayoutSelectedBlockId | null>(null);
    const [resizeBlockId, setResizeBlockId] = useState<HomeWidgetId | null>(null);
    const [draggingWidgetId, setDraggingWidgetId] = useState<HomeWidgetId | null>(null);
    const [dropHighlightZone, setDropHighlightZone] = useState<HomeWidgetZone | null>(null);
    const [dropPreview, setDropPreview] = useState<DropPreview>(null);
    const zoneRectsRef = useRef<ZoneRects>({});
    const widgetRectsRef = useRef<
        Partial<Record<HomeWidgetZone, Array<{ id: HomeWidgetId; rect: DOMRect }>>>
    >({});
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const draggingWidgetIdRef = useRef<HomeWidgetId | null>(null);
    const dragSourceZoneRef = useRef<HomeWidgetZone | null>(null);
    const dropHighlightZoneRef = useRef<HomeWidgetZone | null>(null);
    const dragRafRef = useRef<number | null>(null);
    const isEditingRef = useRef(isEditing);
    const onTransferWidgetRef = useRef(onTransferWidget);
    const getZoneOrderRef = useRef(getZoneOrder);

    isEditingRef.current = isEditing;
    onTransferWidgetRef.current = onTransferWidget;
    getZoneOrderRef.current = getZoneOrder;

    const setSelectedBlockId = useCallback((id: HomeLayoutSelectedBlockId | null) => {
        setSelectedBlockIdState(id);
        if (id) setResizeBlockId(null);
    }, []);

    const toggleResizeBlock = useCallback((id: HomeWidgetId) => {
        setResizeBlockId((prev) => (prev === id ? null : id));
        setSelectedBlockIdState(null);
    }, []);

    const registerZoneRect = useCallback((zone: HomeWidgetZone, rect: DOMRect | null) => {
        if (rect) zoneRectsRef.current[zone] = rect;
        else delete zoneRectsRef.current[zone];
    }, []);

    const registerScrollContainer = useCallback((el: HTMLElement | null) => {
        scrollContainerRef.current = el;
    }, []);

    const registerWidgetRect = useCallback(
        (widgetId: HomeWidgetId, zone: HomeWidgetZone, rect: DOMRect | null) => {
            const bucket = widgetRectsRef.current[zone] ?? [];
            const filtered = bucket.filter((entry) => entry.id !== widgetId);
            if (rect) filtered.push({ id: widgetId, rect });
            widgetRectsRef.current[zone] = filtered;
        },
        [],
    );

    const resolveZoneAt = useCallback((x: number, y: number): HomeWidgetZone | null => {
        const dock = zoneRectsRef.current.dock;
        const main = zoneRectsRef.current.main;
        const scroller = scrollContainerRef.current;

        if (dock) {
            const inDockX = x >= dock.left - DOCK_HIT_PAD_X && x <= dock.right + DOCK_HIT_PAD_X;
            const inDockY = y >= dock.top - DOCK_SNAP_ABOVE_PX && y <= dock.bottom + DOCK_HIT_PAD_Y;
            if (inDockX && inDockY) return 'dock';
        }

        if (scroller && isEditingRef.current) {
            const sr = scroller.getBoundingClientRect();
            const maxMainY = mainZoneMaxY(sr.bottom, dock);
            if (x >= sr.left && x <= sr.right && y >= sr.top && y <= maxMainY) return 'main';

            if (dock && y > maxMainY && y <= dock.bottom + DOCK_HIT_PAD_Y) {
                const inDockX = x >= dock.left - DOCK_HIT_PAD_X && x <= dock.right + DOCK_HIT_PAD_X;
                if (inDockX) return 'dock';
            }
        }

        if (main && y >= main.top && y <= main.bottom && x >= main.left && x <= main.right) {
            if (dock && y >= dock.top - MAIN_DOCK_CLEARANCE_PX) {
                const inDockX = x >= dock.left - DOCK_HIT_PAD_X && x <= dock.right + DOCK_HIT_PAD_X;
                return inDockX ? 'dock' : null;
            }
            return 'main';
        }

        return null;
    }, []);

    const computePlacementIndex = useCallback(
        (zone: HomeWidgetZone, x: number, y: number, excludeId?: HomeWidgetId) => {
            const items = widgetRectsRef.current[zone] ?? [];
            const order = getZoneOrderRef.current(zone);

            if (zone === 'main') {
                const dock = zoneRectsRef.current.dock;
                const clampedY = clampMainPointerY(y, dock, MAIN_DOCK_CLEARANCE_PX);
                const visualIdx = computeMainVisualIndex(x, clampedY, items, excludeId);
                return visualIndexToPlacementIndex('main', visualIdx, items, order, excludeId);
            }

            return computeDockPlacementIndex(x, y, items, order, excludeId);
        },
        [],
    );

    const updateDropPreview = useCallback(
        (x: number, y: number, zone: HomeWidgetZone | null, excludeId?: HomeWidgetId) => {
            if (!zone) {
                setDropPreview(null);
                return;
            }

            const items = widgetRectsRef.current[zone] ?? [];
            const placementIndex = computePlacementIndex(zone, x, y, excludeId);

            let indicatorY: number | null = null;
            if (zone === 'main') {
                const dock = zoneRectsRef.current.dock;
                const clampedY = clampMainPointerY(y, dock, MAIN_DOCK_CLEARANCE_PX);
                const visualIdx = computeMainVisualIndex(x, clampedY, items, excludeId);
                indicatorY = resolveMainIndicatorY(visualIdx, items, excludeId);
            }

            setDropPreview({ zone, placementIndex, indicatorY });
        },
        [computePlacementIndex],
    );

    const refreshDropFromPointer = useCallback(() => {
        if (!draggingWidgetIdRef.current) return;
        const { x, y } = lastPointerRef.current;
        const zone = resolveZoneAt(x, y) ?? dropHighlightZoneRef.current;
        setDropHighlightZone(zone);
        dropHighlightZoneRef.current = zone;
        updateDropPreview(x, y, zone, draggingWidgetIdRef.current ?? undefined);
    }, [resolveZoneAt, updateDropPreview]);

    const maybeAutoScroll = useCallback(
        (clientY: number) => {
            const scroller = scrollContainerRef.current;
            if (!scroller || !draggingWidgetIdRef.current) return;
            const rect = scroller.getBoundingClientRect();
            const dock = zoneRectsRef.current.dock;
            const maxMainY = mainZoneMaxY(rect.bottom, dock);
            const scrollBottomCap = maxMainY - AUTO_SCROLL_EDGE_PX;
            let scrolled = false;

            if (clientY < rect.top + AUTO_SCROLL_EDGE_PX) {
                scroller.scrollTop -= AUTO_SCROLL_STEP_PX;
                scrolled = true;
            } else if (clientY > scrollBottomCap && clientY < rect.bottom) {
                scroller.scrollTop += AUTO_SCROLL_STEP_PX;
                scrolled = true;
            } else if (clientY >= rect.bottom - AUTO_SCROLL_EDGE_PX && clientY <= maxMainY) {
                scroller.scrollTop += AUTO_SCROLL_STEP_PX;
                scrolled = true;
            }

            if (scrolled) {
                requestAnimationFrame(refreshDropFromPointer);
            }
        },
        [refreshDropFromPointer],
    );

    const setDropZone = useCallback((zone: HomeWidgetZone | null) => {
        dropHighlightZoneRef.current = zone;
        setDropHighlightZone(zone);
    }, []);

    const beginDrag = useCallback(
        (widgetId: HomeWidgetId, clientX: number, clientY: number) => {
            if (!isEditing) return;
            setSelectedBlockIdState(null);
            setResizeBlockId(null);
            draggingWidgetIdRef.current = widgetId;
            dragSourceZoneRef.current = inferWidgetZone(widgetId, widgetRectsRef);
            lastPointerRef.current = { x: clientX, y: clientY };
            setDraggingWidgetId(widgetId);
            const zone = resolveZoneAt(clientX, clientY) ?? dragSourceZoneRef.current;
            setDropZone(zone);
            updateDropPreview(clientX, clientY, zone, widgetId);
        },
        [isEditing, resolveZoneAt, setDropZone, updateDropPreview],
    );

    const cancelDrag = useCallback(() => {
        draggingWidgetIdRef.current = null;
        dragSourceZoneRef.current = null;
        setDraggingWidgetId(null);
        setDropZone(null);
        setDropPreview(null);
    }, [setDropZone]);

    const updateDrag = useCallback(
        (clientX: number, clientY: number) => {
            lastPointerRef.current = { x: clientX, y: clientY };
            if (!draggingWidgetIdRef.current) return;

            if (dragRafRef.current !== null) return;
            dragRafRef.current = requestAnimationFrame(() => {
                dragRafRef.current = null;
                const id = draggingWidgetIdRef.current;
                if (!id) return;
                const { x, y } = lastPointerRef.current;
                maybeAutoScroll(y);
                const zone = resolveZoneAt(x, y);
                setDropZone(zone);
                updateDropPreview(x, y, zone, id);
            });
        },
        [resolveZoneAt, setDropZone, maybeAutoScroll, updateDropPreview],
    );

    const endDrag = useCallback(() => {
        const id = draggingWidgetIdRef.current;
        if (!id) return;

        const { x, y } = lastPointerRef.current;
        const zone = resolveZoneAt(x, y) ?? dropHighlightZoneRef.current;

        if (zone) {
            const idx = computePlacementIndex(zone, x, y, id);
            onTransferWidgetRef.current(id, zone, idx);
        }

        draggingWidgetIdRef.current = null;
        dragSourceZoneRef.current = null;
        setDraggingWidgetId(null);
        setDropZone(null);
        setDropPreview(null);
    }, [resolveZoneAt, computePlacementIndex, setDropZone]);

    useEffect(() => {
        if (!isEditing) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const action = resolveHomeLayoutEscapeAction({
                dragging: Boolean(draggingWidgetIdRef.current),
                selectedBlockId,
            });
            e.preventDefault();
            switch (action) {
                case 'cancel-drag':
                    cancelDrag();
                    break;
                case 'close-customizer':
                    setSelectedBlockIdState(null);
                    break;
                case 'exit-edit':
                    draggingWidgetIdRef.current = null;
                    dragSourceZoneRef.current = null;
                    dropHighlightZoneRef.current = null;
                    setSelectedBlockIdState(null);
                    setResizeBlockId(null);
                    setDraggingWidgetId(null);
                    setDropHighlightZone(null);
                    setDropPreview(null);
                    onExit();
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            if (dragRafRef.current !== null) {
                cancelAnimationFrame(dragRafRef.current);
                dragRafRef.current = null;
            }
        };
    }, [isEditing, cancelDrag, onExit, selectedBlockId]);

    const value = useMemo(
        () => ({
            isEditing,
            selectedBlockId: isEditing ? selectedBlockId : null,
            setSelectedBlockId: isEditing ? setSelectedBlockId : () => {},
            resizeBlockId: isEditing ? resizeBlockId : null,
            toggleResizeBlock: isEditing ? toggleResizeBlock : () => {},
            draggingWidgetId: isEditing ? draggingWidgetId : null,
            dropHighlightZone: isEditing ? dropHighlightZone : null,
            dropPreview: isEditing ? dropPreview : null,
            exitEditMode: () => {
                draggingWidgetIdRef.current = null;
                dragSourceZoneRef.current = null;
                dropHighlightZoneRef.current = null;
                setSelectedBlockIdState(null);
                setResizeBlockId(null);
                setDraggingWidgetId(null);
                setDropHighlightZone(null);
                setDropPreview(null);
                onExit();
            },
            registerZoneRect,
            registerScrollContainer,
            beginDrag,
            updateDrag,
            endDrag,
            cancelDrag,
            registerWidgetRect,
        }),
        [
            isEditing,
            selectedBlockId,
            resizeBlockId,
            draggingWidgetId,
            dropHighlightZone,
            dropPreview,
            onExit,
            setSelectedBlockId,
            toggleResizeBlock,
            registerZoneRect,
            registerScrollContainer,
            beginDrag,
            updateDrag,
            endDrag,
            cancelDrag,
            registerWidgetRect,
        ],
    );

    return <HomeLayoutEditContext.Provider value={value}>{children}</HomeLayoutEditContext.Provider>;
}

export function useHomeLayoutEdit() {
    const ctx = useContext(HomeLayoutEditContext);
    if (!ctx) {
        return {
            isEditing: false,
            selectedBlockId: null as HomeLayoutSelectedBlockId | null,
            setSelectedBlockId: (_id: HomeLayoutSelectedBlockId | null) => {},
            resizeBlockId: null as HomeWidgetId | null,
            toggleResizeBlock: (_id: HomeWidgetId) => {},
            draggingWidgetId: null as HomeWidgetId | null,
            dropHighlightZone: null as HomeWidgetZone | null,
            dropPreview: null as DropPreview,
            exitEditMode: () => {},
            registerZoneRect: (_z: HomeWidgetZone, _r: DOMRect | null) => {},
            registerScrollContainer: (_el: HTMLElement | null) => {},
            beginDrag: (_id: HomeWidgetId, _x: number, _y: number) => {},
            updateDrag: (_x: number, _y: number) => {},
            endDrag: () => {},
            cancelDrag: () => {},
            registerWidgetRect: (_id: HomeWidgetId, _z: HomeWidgetZone, _r: DOMRect | null) => {},
        };
    }
    return ctx;
}
