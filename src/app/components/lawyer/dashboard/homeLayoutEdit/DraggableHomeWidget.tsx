import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { HomeWidgetId, HomeWidgetZone, HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import { resolveHomeBlockShapeClass } from '@/app/services/settings/resolveHomeBlockStyle';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';
import { HomeLayoutWidgetEditChrome } from './homeLayoutEditUi';

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
    pointerId: number | null;
    startX: number;
    startY: number;
    grabOffsetX: number;
    grabOffsetY: number;
    ghostW: number;
    ghostH: number;
};

function clearGhost(ghost: HTMLDivElement | null) {
    if (!ghost) return;
    ghost.style.opacity = '0';
    ghost.replaceChildren();
}

function fillGhostFromSource(ghost: HTMLDivElement, source: HTMLElement, width: number, height: number) {
    ghost.replaceChildren();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.style.pointerEvents = 'none';
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.margin = '0';
    ghost.appendChild(clone);
}

function clientPointFromEvent(ev: Event): { x: number; y: number; id: number | null } {
    if ('changedTouches' in ev || 'touches' in ev) {
        const te = ev as TouchEvent;
        const t = te.touches[0] ?? te.changedTouches[0];
        return { x: t?.clientX ?? 0, y: t?.clientY ?? 0, id: t?.identifier ?? null };
    }
    const pe = ev as PointerEvent;
    return { x: pe.clientX, y: pe.clientY, id: pe.pointerId };
}

/**
 * سحب ويدجت — المقبض يبقى mounted أثناء السحب (إزالته كانت تُطلق pointercancel فوراً على Android).
 * Touch + Pointer مع مستمعات على window قبل beginDrag.
 */
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
    const handleRef = useRef<HTMLButtonElement | null>(null);
    const dragSessionRef = useRef<DragSession | null>(null);
    const listenersCleanupRef = useRef<(() => void) | null>(null);

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
    const stackZ = dragging ? 'z-[170]' : customizerActive ? 'z-[165]' : isEditing ? 'z-[10]' : '';
    const canResizeSpan = zone === 'main' && Boolean(onResizeSpan);
    const shapeClass = resolveHomeBlockShapeClass(blockOverride);
    const shellChromeClass = customizerActive
        ? 'shadow-[inset_0_0_0_1px_color-mix(in_srgb,#E6C673_35%,transparent)]'
        : dragging
          ? 'opacity-50'
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

    useEffect(() => {
        return () => {
            listenersCleanupRef.current?.();
            listenersCleanupRef.current = null;
            dragSessionRef.current = null;
        };
    }, []);

    const updateGhostPosition = (left: number, top: number, width: number, height: number) => {
        const ghost = ghostRef.current;
        if (!ghost) return;
        ghost.style.width = `${width}px`;
        ghost.style.height = `${height}px`;
        ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

        const finishDrag = (commit: boolean) => {
        const session = dragSessionRef.current;
        listenersCleanupRef.current?.();
        listenersCleanupRef.current = null;
        dragSessionRef.current = null;
        clearGhost(ghostRef.current);
        if (rootRef.current) rootRef.current.style.minHeight = '';
        const handleEl = handleRef.current;
        try {
            if (handleEl && session?.pointerId != null && handleEl.hasPointerCapture?.(session.pointerId)) {
                handleEl.releasePointerCapture(session.pointerId);
            }
        } catch {
            /* ignore */
        }
        if (commit) endDrag();
        else cancelDrag();
    };

    const startDragAt = (clientX: number, clientY: number, pointerId: number | null, handleEl: HTMLElement) => {
        if (dragSessionRef.current) return;
        setSelectedBlockId(null);

        const source = measureRef.current;
        const rect = source?.getBoundingClientRect() ?? rootRef.current?.getBoundingClientRect();
        if (!rect) return;

        if (rootRef.current) rootRef.current.style.minHeight = `${rect.height}px`;

        const session: DragSession = {
            pointerId,
            startX: clientX,
            startY: clientY,
            grabOffsetX: clientX - rect.left,
            grabOffsetY: clientY - rect.top,
            ghostW: rect.width,
            ghostH: rect.height,
        };
        dragSessionRef.current = session;

        if (ghostRef.current && source) {
            fillGhostFromSource(ghostRef.current, source, rect.width, rect.height);
            ghostRef.current.style.opacity = '0.92';
        }
        updateGhostPosition(rect.left, rect.top, rect.width, rect.height);

        const onMove = (ev: Event) => {
            if (!dragSessionRef.current) return;
            const pt = clientPointFromEvent(ev);
            if (session.pointerId !== null && pt.id !== null && pt.id !== session.pointerId) return;
            if (ev.cancelable) ev.preventDefault();
            updateGhostPosition(
                pt.x - session.grabOffsetX,
                pt.y - session.grabOffsetY,
                session.ghostW,
                session.ghostH,
            );
            updateDrag(pt.x, pt.y);
        };

        const onEnd = (ev: Event) => {
            if (!dragSessionRef.current) return;
            const pt = clientPointFromEvent(ev);
            if (session.pointerId !== null && pt.id !== null && pt.id !== session.pointerId) return;
            if (ev.cancelable) ev.preventDefault();
            finishDrag(true);
        };

        /*
         * لا ننهي على pointercancel — على Android يظهر فور re-render/scroll
         * ونعتمد pointerup/touchend فقط لإنهاء الجلسة.
         */
        const opts: AddEventListenerOptions = { passive: false, capture: true };
        window.addEventListener('pointermove', onMove, opts);
        window.addEventListener('pointerup', onEnd, opts);
        window.addEventListener('touchmove', onMove, opts);
        window.addEventListener('touchend', onEnd, opts);
        window.addEventListener('touchcancel', onEnd, opts);

        listenersCleanupRef.current = () => {
            window.removeEventListener('pointermove', onMove, opts);
            window.removeEventListener('pointerup', onEnd, opts);
            window.removeEventListener('touchmove', onMove, opts);
            window.removeEventListener('touchend', onEnd, opts);
            window.removeEventListener('touchcancel', onEnd, opts);
        };

        try {
            if (pointerId !== null) handleEl.setPointerCapture(pointerId);
        } catch {
            /* ignore */
        }

        beginDrag(widgetId, clientX, clientY);
    };

    const onHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        handleRef.current = e.currentTarget;
        startDragAt(e.clientX, e.clientY, e.pointerId, e.currentTarget);
    };

    const onHandleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        /* منع تمرير الصفحة من المقبض — ضروري على WebView */
        if (e.cancelable) e.preventDefault();
        handleRef.current = e.currentTarget;
        const t = e.touches[0];
        startDragAt(t.clientX, t.clientY, t.identifier, e.currentTarget);
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
                className={`relative ${className} ${stackZ} ${peerDragLock ? 'pointer-events-none' : ''}`}
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

                {/* يبقى mounted أثناء السحب — إزالته كانت تُنهي الجلسة على Android */}
                <HomeLayoutWidgetEditChrome
                    dragLabel={`سحب ${label}`}
                    onDragPointerDown={onHandlePointerDown}
                    onDragTouchStart={onHandleTouchStart}
                    dragHandleHidden={dragging}
                    paletteActive={customizerActive}
                    paletteLabel={`تخصيص ${label}`}
                    onPaletteClick={() => setSelectedBlockId(customizerActive ? null : widgetId)}
                    showSpan={canResizeSpan && !dragging}
                    span={currentSpan}
                    onSpanChange={
                        onResizeSpan
                            ? (next) => onResizeSpan(next)
                            : undefined
                    }
                />
            </div>
        </>
    );
}
