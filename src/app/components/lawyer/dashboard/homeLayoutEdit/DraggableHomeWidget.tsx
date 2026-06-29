import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Palette } from 'lucide-react';
import type { HomeWidgetId, HomeWidgetZone, HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import { resolveHomeBlockShapeClass, resolveWidgetResizeMinHeight } from '@/app/services/settings/resolveHomeBlockStyle';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';

const DRAG_THRESHOLD_PX = 6;

type DraggableHomeWidgetProps = {
    widgetId: HomeWidgetId;
    zone: HomeWidgetZone;
    label: string;
    className?: string;
    style?: React.CSSProperties;
    onResizeHeight?: (heightPx: number) => void;
    onResizeSpan?: (span: 1 | 2) => void;
    currentHeightPx?: number;
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

type GhostFrame = {
    left: number;
    top: number;
    width: number;
    height: number;
};

function EditChip({
    active,
    onClick,
    label,
    children,
    className = '',
}: {
    active?: boolean;
    onClick?: () => void;
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full border touch-none backdrop-blur-md transition-all duration-200 active:scale-95 ${className} ${
                active
                    ? 'border-[#E6C673] bg-[#E6C673] text-[#0A0C12] shadow-[0_0_20px_rgba(230,198,115,0.35)]'
                    : 'border-[#E6C673]/30 bg-[#0A0C12]/75 text-[#E6C673]/85 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
            }`}
        >
            {children}
        </button>
    );
}

function SpanChip({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`min-w-[2.25rem] rounded-lg border px-2 py-1 text-[10px] font-extrabold touch-none transition-all active:scale-95 ${
                active
                    ? 'border-[#E6C673] bg-[#E6C673]/20 text-[#E6C673]'
                    : 'border-white/12 bg-black/40 text-white/55'
            }`}
        >
            {label}
        </button>
    );
}

export function DraggableHomeWidget({
    widgetId,
    zone,
    label,
    className = '',
    style,
    onResizeHeight,
    onResizeSpan,
    currentHeightPx,
    currentSpan = 2,
    blockOverride,
    children,
}: DraggableHomeWidgetProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const resizeStartRef = useRef<{ y: number; h: number } | null>(null);
    const dragSessionRef = useRef<DragSession | null>(null);
    const rafRef = useRef<number | null>(null);
    const pendingGhostRef = useRef<GhostFrame | null>(null);
    const [ghostFrame, setGhostFrame] = useState<GhostFrame | null>(null);
    const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);

    const {
        isEditing,
        selectedBlockId,
        setSelectedBlockId,
        resizeBlockId,
        toggleResizeBlock,
        draggingWidgetId,
        beginDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        registerWidgetRect,
    } = useHomeLayoutEdit();

    const customizerActive = selectedBlockId === widgetId;
    const resizeActive = resizeBlockId === widgetId;
    const dragging = draggingWidgetId === widgetId;
    const elevated = resizeActive || dragging || customizerActive;
    const canResizeSpan = zone === 'main' && Boolean(onResizeSpan);
    const canResize = Boolean(onResizeHeight) || canResizeSpan;
    const showResizeHandles = resizeActive && canResize;
    const resizeMinHeight = resolveWidgetResizeMinHeight(widgetId);
    const compactControls = false;
    const shapeClass = resolveHomeBlockShapeClass(blockOverride);
    const shellChromeClass =
        customizerActive
            ? 'ring-1 ring-[#E6C673]/55 shadow-[0_0_0_1px_rgba(230,198,115,0.15)]'
            : resizeActive
              ? 'ring-2 ring-dashed ring-[#E6C673]/75 shadow-[0_0_24px_rgba(230,198,115,0.12)]'
              : dragging
                ? 'ring-1 ring-dashed ring-[#E6C673]/40'
                : isEditing && !compactControls
                  ? 'ring-1 ring-white/10'
                  : '';
    const blockInteractionLocked = isEditing;

    useEffect(() => {
        if (!isEditing || !measureRef.current || dragging) {
            registerWidgetRect(widgetId, zone, null);
            return;
        }
        const el = measureRef.current;
        const report = () => registerWidgetRect(widgetId, zone, el.getBoundingClientRect());
        report();
        const ro = new ResizeObserver(report);
        ro.observe(el);
        window.addEventListener('scroll', report, true);
        window.addEventListener('resize', report);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', report, true);
            window.removeEventListener('resize', report);
            registerWidgetRect(widgetId, zone, null);
        };
    }, [isEditing, widgetId, zone, registerWidgetRect, dragging, selectedBlockId, resizeBlockId, currentSpan, currentHeightPx]);

    useEffect(() => {
        if (!dragging) {
            setGhostFrame(null);
            pendingGhostRef.current = null;
        }
    }, [dragging]);

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, []);

    useLayoutEffect(() => {
        if (!resizeActive || !measureRef.current) {
            setOverlayRect(null);
            return;
        }
        const el = measureRef.current;
        const report = () => setOverlayRect(el.getBoundingClientRect());
        report();
        const ro = new ResizeObserver(report);
        ro.observe(el);
        window.addEventListener('scroll', report, true);
        window.addEventListener('resize', report);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', report, true);
            window.removeEventListener('resize', report);
        };
    }, [resizeActive, currentHeightPx, currentSpan, draggingWidgetId]);

    const scheduleGhostUpdate = (frame: GhostFrame) => {
        pendingGhostRef.current = frame;
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            if (pendingGhostRef.current) setGhostFrame(pendingGhostRef.current);
        });
    };

    const cleanupDragListeners = (onMove: (e: PointerEvent) => void, onUp: (e: PointerEvent) => void) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
    };

    const startDragSession = (e: React.PointerEvent) => {
        if (resizeActive || customizerActive) return;
        e.stopPropagation();
        e.preventDefault();

        const rect = measureRef.current?.getBoundingClientRect() ?? rootRef.current?.getBoundingClientRect();
        if (!rect) return;

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
                }
            }

            if (session.moved) {
                scheduleGhostUpdate({
                    left: ev.clientX - session.grabOffsetX,
                    top: ev.clientY - session.grabOffsetY,
                    width: session.ghostW,
                    height: session.ghostH,
                });
                updateDrag(ev.clientX, ev.clientY);
            }
        };

        const onUp = (ev: PointerEvent) => {
            if (ev.pointerId !== session.pointerId) return;
            ev.preventDefault();
            cleanupDragListeners(onMove, onUp);
            window.removeEventListener('pointercancel', onCancel);
            const moved = session.moved;
            dragSessionRef.current = null;
            setGhostFrame(null);
            if (moved) endDrag();
            else cancelDrag();
        };

        const onCancel = (ev: PointerEvent) => {
            if (ev.pointerId !== session.pointerId) return;
            cleanupDragListeners(onMove, onUp);
            window.removeEventListener('pointercancel', onCancel);
            dragSessionRef.current = null;
            setGhostFrame(null);
            cancelDrag();
        };

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointercancel', onCancel, { passive: false });
    };

    const onHeightResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        resizeStartRef.current = {
            y: e.clientY,
            h: currentHeightPx ?? measureRef.current?.offsetHeight ?? 160,
        };
        const onMove = (ev: PointerEvent) => {
            ev.preventDefault();
            const start = resizeStartRef.current;
            if (!start || !onResizeHeight) return;
            onResizeHeight(Math.max(resizeMinHeight, Math.min(480, start.h + (ev.clientY - start.y))));
        };
        const onUp = () => {
            resizeStartRef.current = null;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    if (!isEditing) {
        return (
            <div ref={rootRef} className={className} style={style}>
                {children}
            </div>
        );
    }

    const resizeOverlay =
        showResizeHandles && overlayRect
            ? createPortal(
                  <div className="fixed inset-0 z-[125]">
                      <div
                          className="absolute inset-0 pointer-events-auto bg-transparent"
                          aria-hidden
                          onPointerDown={(e) => {
                              e.preventDefault();
                              toggleResizeBlock(widgetId);
                          }}
                      />
                      {onResizeHeight ? (
                          <div
                              role="presentation"
                              onPointerDown={onHeightResizePointerDown}
                              className="pointer-events-auto absolute cursor-ns-resize touch-none"
                              style={{
                                  left: overlayRect.left + 12,
                                  top: overlayRect.bottom - 10,
                                  width: overlayRect.width - 24,
                                  height: 20,
                              }}
                          >
                              <div className="mx-auto mt-2 h-[3px] w-12 rounded-full bg-[#E6C673]/85 shadow-[0_0_12px_rgba(230,198,115,0.35)]" />
                          </div>
                      ) : null}
                      {canResizeSpan ? (
                          <div
                              className="pointer-events-auto absolute flex gap-1.5 touch-none"
                              style={{
                                  left: overlayRect.left + overlayRect.width / 2,
                                  top: overlayRect.top - 34,
                                  transform: 'translateX(-50%)',
                              }}
                          >
                              <SpanChip
                                  active={currentSpan === 1}
                                  label="½"
                                  onClick={() => onResizeSpan?.(1)}
                              />
                              <SpanChip
                                  active={currentSpan === 2}
                                  label="كامل"
                                  onClick={() => onResizeSpan?.(2)}
                              />
                          </div>
                      ) : null}
                  </div>,
                  document.body,
              )
            : null;

    const ghostPortal =
        dragging && ghostFrame
            ? createPortal(
                  <div
                      className="pointer-events-none fixed z-[200] overflow-hidden rounded-2xl border-2 border-dashed border-[#E6C673]/75 bg-[#0A0C12]/92 shadow-[0_20px_48px_rgba(0,0,0,0.5)]"
                      style={{
                          left: ghostFrame.left,
                          top: ghostFrame.top,
                          width: ghostFrame.width,
                          height: ghostFrame.height,
                      }}
                  >
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3">
                          <span className="text-[10px] font-bold text-[#E6C673]/90">{label}</span>
                          <span className="h-[2px] w-10 rounded-full bg-[#E6C673]/45" />
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    return (
        <>
            {ghostPortal}
            {resizeOverlay}
            <div
                ref={rootRef}
                className={`relative ${className} ${dragging ? 'min-h-0 h-0 overflow-hidden invisible' : ''} ${
                    elevated ? 'z-[130]' : isEditing ? 'z-[10]' : ''
                }`}
                style={{ ...style, ...(elevated ? { isolation: 'isolate' as const } : {}) }}
            >
                <div ref={measureRef} className={`relative ${elevated ? 'z-[121]' : ''}`}>
                    <div
                        className={`relative overflow-hidden transition-shadow duration-200 ${shapeClass} ${shellChromeClass}`}
                    >
                        <div
                            className={`relative ${
                                blockInteractionLocked
                                    ? 'pointer-events-none [&_input]:pointer-events-auto [&_textarea]:pointer-events-auto [&_select]:pointer-events-auto [&_[contenteditable="true"]]:pointer-events-auto'
                                    : ''
                            }`}
                        >
                            {children}
                        </div>
                    </div>
                </div>

                {!compactControls ? (
                    <div className="absolute z-[122] pointer-events-none bottom-8 inset-x-0 flex justify-center">
                        <span className="rounded-full font-semibold tracking-wide text-white/50 bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[8px]">
                            {label}
                        </span>
                    </div>
                ) : null}

                <div
                    className={`absolute z-[126] pointer-events-auto ${
                        compactControls ? '-top-1 -right-1' : 'top-2 left-2'
                    }`}
                >
                    <EditChip
                        active={customizerActive}
                        label={`تخصيص ${label}`}
                        className={compactControls ? 'h-6 w-6 min-w-0 p-0' : ''}
                        onClick={() => setSelectedBlockId(customizerActive ? null : widgetId)}
                    >
                        <Palette size={compactControls ? 10 : 13} strokeWidth={2} />
                    </EditChip>
                </div>

                {canResize ? (
                    <div className="absolute top-2 right-2 z-[126] pointer-events-auto">
                        <EditChip
                            active={resizeActive}
                            label="تغيير الأبعاد"
                            onClick={() => toggleResizeBlock(widgetId)}
                        >
                            <Maximize2 size={12} strokeWidth={2} />
                        </EditChip>
                    </div>
                ) : null}

                {!resizeActive && isEditing ? (
                    <button
                        type="button"
                        aria-label={`سحب ${label}`}
                        onPointerDown={startDragSession}
                        className={`absolute left-1/2 z-[124] flex -translate-x-1/2 touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                            compactControls ? '-bottom-2 px-3 py-0.5' : '-bottom-3 px-5 py-1 flex-col items-center'
                        }`}
                    >
                        <span
                            className={`flex items-center justify-center rounded-full border border-[#E6C673]/25 bg-[#0A0C12]/80 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.45)] ${
                                compactControls ? 'h-5 min-w-[2rem] px-2' : 'h-7 min-w-[3.25rem] px-3'
                            }`}
                        >
                            <span className={`block rounded-full bg-[#E6C673]/60 ${compactControls ? 'h-[2px] w-5' : 'h-[2px] w-7'}`} />
                        </span>
                    </button>
                ) : null}
            </div>
        </>
    );
};
