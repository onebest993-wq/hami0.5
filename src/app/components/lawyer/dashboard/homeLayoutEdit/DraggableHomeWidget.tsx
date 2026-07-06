import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { HomeWidgetId, HomeWidgetZone, HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import { resolveHomeBlockShapeClass } from '@/app/services/settings/resolveHomeBlockStyle';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';
import { HomeLayoutWidgetEditChrome } from './homeLayoutEditUi';

const DRAG_THRESHOLD_PX = 3;

type DraggableHomeWidgetProps = {
    widgetId: HomeWidgetId;
    zone: HomeWidgetZone;
    label: string;
    className?: string;
    style?: React.CSSProperties;
    onResizeSpan?: (span: 1 | 2) => void;
    currentSpan?: 1 | 2;
    blockOverride?: HomeBlockStyleOverride;
    children: React.ReactNode;
};

type DragSession = {
    pointerId: number;
    startX: number;
    startY: number;
    grabOffsetX: number;
    grabOffsetY: number;
    ghostW: number;
    ghostH: number;
    moved: boolean;
    started: boolean;
};

export function DraggableHomeWidget({
    widgetId,
    zone,
    label,
    className = '',
    style,
    onResizeSpan,
    currentSpan = 2,
    blockOverride,
    children,
}: DraggableHomeWidgetProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);
    const dragSessionRef = useRef<DragSession | null>(null);
    const dragPlaceholderHeightRef = useRef<number | null>(null);
    const placeholderHeightRef = useRef<number | null>(null);

    const {
        isEditing,
        selectedBlockId,
        setSelectedBlockId,
        draggingWidgetId,
        beginDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        registerWidgetRect,
    } = useHomeLayoutEdit();

    const customizerActive = selectedBlockId === widgetId;
    const dragging = draggingWidgetId === widgetId;
    const peerDragLock = Boolean(draggingWidgetId && !dragging);
    const elevated = dragging || customizerActive;
    const canResizeSpan = zone === 'main' && Boolean(onResizeSpan);
    const shapeClass = resolveHomeBlockShapeClass(blockOverride);
    const shellChromeClass = customizerActive
        ? 'ring-1 ring-[#E6C673]/40'
        : dragging
          ? 'ring-1 ring-dashed ring-[#E6C673]/25 opacity-50'
          : isEditing
            ? 'ring-1 ring-white/[0.05]'
            : '';

    useEffect(() => {
        if (!isEditing || !measureRef.current) {
            registerWidgetRect(widgetId, zone, null);
            return;
        }
        const el = measureRef.current;
        const report = () => registerWidgetRect(widgetId, zone, el.getBoundingClientRect());
        report();
        const ro = new ResizeObserver(report);
        ro.observe(el);
        const scroller = el.closest('.hami-home-scroll-root');
        scroller?.addEventListener('scroll', report, { passive: true });
        window.addEventListener('resize', report, { passive: true });
        return () => {
            ro.disconnect();
            scroller?.removeEventListener('scroll', report);
            window.removeEventListener('resize', report);
            registerWidgetRect(widgetId, zone, null);
        };
    }, [isEditing, widgetId, zone, registerWidgetRect, currentSpan, customizerActive]);

    const updateGhostPosition = (left: number, top: number, width: number, height: number) => {
        const ghost = ghostRef.current;
        if (!ghost) return;
        ghost.style.width = `${width}px`;
        ghost.style.height = `${height}px`;
        ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

    const cleanupDragListeners = (
        onMove: (e: PointerEvent) => void,
        onUp: (e: PointerEvent) => void,
        onCancel: (e: PointerEvent) => void,
    ) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
    };

    const startDragSession = (e: React.PointerEvent<HTMLElement>) => {
        if (customizerActive) return;
        e.stopPropagation();
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);

        const rect = measureRef.current?.getBoundingClientRect() ?? rootRef.current?.getBoundingClientRect();
        if (!rect) return;

        dragPlaceholderHeightRef.current = rect.height;
        placeholderHeightRef.current = rect.height;
        if (rootRef.current) rootRef.current.style.minHeight = `${rect.height}px`;

        const session: DragSession = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            grabOffsetX: e.clientX - rect.left,
            grabOffsetY: e.clientY - rect.top,
            ghostW: rect.width,
            ghostH: rect.height,
            moved: false,
            started: false,
        };
        dragSessionRef.current = session;

        updateGhostPosition(
            rect.left,
            rect.top,
            rect.width,
            rect.height,
        );
        if (ghostRef.current) ghostRef.current.style.opacity = '0';

        const onMove = (ev: PointerEvent) => {
            if (ev.pointerId !== session.pointerId) return;
            ev.preventDefault();
            const dx = ev.clientX - session.startX;
            const dy = ev.clientY - session.startY;

            if (!session.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
                session.moved = true;
                if (!session.started) {
                    session.started = true;
                    beginDrag(widgetId, ev.clientX, ev.clientY);
                    if (ghostRef.current) ghostRef.current.style.opacity = '1';
                }
            }

            if (session.moved) {
                updateGhostPosition(
                    ev.clientX - session.grabOffsetX,
                    ev.clientY - session.grabOffsetY,
                    session.ghostW,
                    session.ghostH,
                );
                updateDrag(ev.clientX, ev.clientY);
            }
        };

        const onUp = (ev: PointerEvent) => {
            if (ev.pointerId !== session.pointerId) return;
            ev.preventDefault();
            cleanupDragListeners(onMove, onUp, onCancel);
            const moved = session.moved;
            dragSessionRef.current = null;
            if (ghostRef.current) ghostRef.current.style.opacity = '0';
            if (rootRef.current) rootRef.current.style.minHeight = '';
            placeholderHeightRef.current = null;
            dragPlaceholderHeightRef.current = null;
            if (moved) endDrag();
            else cancelDrag();
        };

        const onCancel = (ev: PointerEvent) => {
            if (ev.pointerId !== session.pointerId) return;
            cleanupDragListeners(onMove, onUp, onCancel);
            dragSessionRef.current = null;
            if (ghostRef.current) ghostRef.current.style.opacity = '0';
            if (rootRef.current) rootRef.current.style.minHeight = '';
            placeholderHeightRef.current = null;
            dragPlaceholderHeightRef.current = null;
            cancelDrag();
        };

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointercancel', onCancel, { passive: false });
    };

    if (!isEditing) {
        return (
            <div ref={rootRef} className={className} style={style}>
                {children}
            </div>
        );
    }

    const ghostPortal = createPortal(
        <div
            ref={ghostRef}
            className="pointer-events-none fixed left-0 top-0 z-[200] overflow-hidden rounded-2xl border border-[#E6C673]/45 bg-[#0A0C12]/90 shadow-[0_12px_32px_rgba(0,0,0,0.42)] opacity-0 will-change-transform"
            aria-hidden
        />,
        document.body,
    );

    return (
        <>
            {ghostPortal}
            <div
                ref={rootRef}
                data-hami-widget-slot=""
                data-hami-widget-dragging={dragging ? '1' : undefined}
                className={`relative ${className} ${elevated ? 'z-[130]' : isEditing ? 'z-[10]' : ''} ${peerDragLock ? 'pointer-events-none' : ''}`}
                style={{ ...style, ...(elevated ? { isolation: 'isolate' as const } : {}) }}
            >
                {dragging ? (
                    <div
                        className="absolute inset-0 rounded-[inherit] border border-dashed border-[#E6C673]/18 bg-[#0A0C12]/20 pointer-events-none"
                        aria-hidden
                    />
                ) : null}

                <div
                    ref={measureRef}
                    className={`relative ${dragging ? 'invisible pointer-events-none' : ''}`}
                >
                    <div className={`relative overflow-hidden ${shapeClass} ${shellChromeClass}`}>
                        <div className="relative hami-edit-block-surface pointer-events-none [&_input]:pointer-events-auto [&_textarea]:pointer-events-auto [&_select]:pointer-events-auto">
                            {children}
                        </div>
                    </div>
                </div>

                {!dragging ? (
                    <HomeLayoutWidgetEditChrome
                        dragLabel={`سحب ${label}`}
                        onDragPointerDown={startDragSession}
                        paletteActive={customizerActive}
                        paletteLabel={`تخصيص ${label}`}
                        onPaletteClick={() => setSelectedBlockId(customizerActive ? null : widgetId)}
                        showSpan={canResizeSpan}
                        span={currentSpan}
                        onSpanChange={
                            onResizeSpan
                                ? (next) => onResizeSpan(next)
                                : undefined
                        }
                    />
                ) : null}
            </div>
        </>
    );
}
