import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import { clampFocus, clampZoom } from '../utils/profileFocusZoomClamp';
import {
    capturePointerSafe,
    preventDefaultIfCancelable,
    releasePointerSafe,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';
import { useNonPassiveTouchPrevent } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useNonPassiveTouchPrevent';

type GalleryViewerMode = 'view' | 'adjust';

type Args = {
    item: ProfileGalleryItem;
    open: boolean;
    canAdjust: boolean;
    initialMode: GalleryViewerMode;
    onClose: () => void;
    onSaveAdjust?: (next: ProfileGalleryItem) => void;
};

type PinchSession = {
    pointerIds: [number, number];
    startDistance: number;
    startZoom: number;
};

function pointerDistance(
    a: { clientX: number; clientY: number },
    b: { clientX: number; clientY: number },
): number {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function itemSnapshot(item: ProfileGalleryItem): ProfileGalleryItem {
    return {
        url: item.url,
        focusX: item.focusX ?? 50,
        focusY: item.focusY ?? 50,
        zoom: item.zoom ?? 100,
        ...(item.storagePath ? { storagePath: item.storagePath } : null),
    };
}

export function useProfileGalleryViewerAdjust({
    item,
    open,
    canAdjust,
    initialMode,
    onClose,
    onSaveAdjust,
}: Args) {
    const stageRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const activePointers = useRef(new Map<number, { clientX: number; clientY: number }>());
    const pinchRef = useRef<PinchSession | null>(null);
    const [mode, setMode] = useState<GalleryViewerMode>(initialMode);
    const [draft, setDraft] = useState<ProfileGalleryItem>(item);
    /** بعد «تم» اعرض المسودة حتى يصل تحديث الأب — يمنع ومضة focus/zoom القديمة */
    const [displayOverride, setDisplayOverride] = useState<ProfileGalleryItem | null>(null);
    /**
     * تكبير جلسة معاينة فقط (وضع العرض) — لا يُحفظ.
     * null = استخدم zoom العنصر/المسودة المعروضة.
     */
    const [viewZoom, setViewZoom] = useState<number | null>(null);
    useNonPassiveTouchPrevent(
        stageRef,
        open && mode === 'adjust',
        undefined,
        '[data-gallery-controls]',
    );

    useEffect(() => {
        if (!open) return;
        setMode(canAdjust && initialMode === 'adjust' ? 'adjust' : 'view');
        setDisplayOverride(null);
        setViewZoom(null);
        setDraft(itemSnapshot(item));
        activePointers.current.clear();
        pinchRef.current = null;
        dragging.current = false;
    }, [open, item, canAdjust, initialMode]);

    const baseDisplay = mode === 'adjust' ? draft : (displayOverride ?? item);
    const display: ProfileGalleryItem =
        mode === 'view' && viewZoom != null
            ? { ...baseDisplay, zoom: viewZoom }
            : baseDisplay;

    const applyZoomDelta = useCallback(
        (delta: number) => {
            if (mode === 'adjust') {
                setDraft((prev) => ({ ...prev, zoom: clampZoom((prev.zoom ?? 100) + delta) }));
                return;
            }
            setViewZoom((prev) => {
                const current = prev ?? baseDisplay.zoom ?? 100;
                return clampZoom(current + delta);
            });
        },
        [mode, baseDisplay.zoom],
    );

    const zoomOut = useCallback(() => applyZoomDelta(-10), [applyZoomDelta]);
    const zoomIn = useCallback(() => applyZoomDelta(10), [applyZoomDelta]);

    const computeFocus = useCallback((clientX: number, clientY: number) => {
        const el = stageRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            focusX: clampFocus(((clientX - rect.left) / rect.width) * 100),
            focusY: clampFocus(((clientY - rect.top) / rect.height) * 100),
        };
    }, []);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest('[data-gallery-controls]')) return;
        activePointers.current.set(event.pointerId, {
            clientX: event.clientX,
            clientY: event.clientY,
        });

        if (activePointers.current.size >= 2) {
            dragging.current = false;
            const pts = [...activePointers.current.entries()].slice(0, 2);
            const dist = pointerDistance(pts[0]![1], pts[1]![1]);
            if (dist > 0) {
                pinchRef.current = {
                    pointerIds: [pts[0]![0], pts[1]![0]],
                    startDistance: dist,
                    startZoom: display.zoom ?? 100,
                };
            }
            return;
        }

        if (mode !== 'adjust') return;
        preventDefaultIfCancelable(event);
        dragging.current = true;
        capturePointerSafe(event.currentTarget, event.pointerId);
        const next = computeFocus(event.clientX, event.clientY);
        if (next) setDraft((prev) => ({ ...prev, ...next }));
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (activePointers.current.has(event.pointerId)) {
            activePointers.current.set(event.pointerId, {
                clientX: event.clientX,
                clientY: event.clientY,
            });
        }

        const pinch = pinchRef.current;
        if (pinch) {
            const a = activePointers.current.get(pinch.pointerIds[0]);
            const b = activePointers.current.get(pinch.pointerIds[1]);
            if (a && b && pinch.startDistance > 0) {
                const ratio = pointerDistance(a, b) / pinch.startDistance;
                const nextZoom = clampZoom(pinch.startZoom * ratio);
                if (mode === 'adjust') {
                    setDraft((prev) => ({ ...prev, zoom: nextZoom }));
                } else {
                    setViewZoom(nextZoom);
                }
            }
            return;
        }

        if (mode !== 'adjust' || !dragging.current) return;
        const next = computeFocus(event.clientX, event.clientY);
        if (next) setDraft((prev) => ({ ...prev, ...next }));
    };

    const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
        activePointers.current.delete(event.pointerId);
        if (pinchRef.current?.pointerIds.includes(event.pointerId)) {
            pinchRef.current = null;
        }
        dragging.current = false;
        releasePointerSafe(event.currentTarget, event.pointerId);
    };

    const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -8 : 8;
        applyZoomDelta(delta);
    };

    const enterAdjust = useCallback(() => {
        setDraft((prev) => ({
            ...prev,
            zoom: viewZoom ?? prev.zoom ?? item.zoom ?? 100,
        }));
        setMode('adjust');
    }, [viewZoom, item.zoom]);

    const handleConfirm = () => {
        onSaveAdjust?.(draft);
        setDisplayOverride(draft);
        setViewZoom(null);
        setMode('view');
        if (initialMode === 'adjust') onClose();
    };

    const handleCancelAdjust = () => {
        setDraft(itemSnapshot(item));
        setViewZoom(null);
        if (initialMode === 'adjust') onClose();
        else setMode('view');
    };

    const setModeSafe = useCallback((next: React.SetStateAction<GalleryViewerMode>) => {
        setMode((prev) => {
            const resolved = typeof next === 'function' ? next(prev) : next;
            if (resolved === 'view') {
                setViewZoom(null);
            }
            return resolved;
        });
    }, []);

    return {
        stageRef,
        mode,
        setMode: setModeSafe,
        draft,
        setDraft,
        display,
        onPointerDown,
        onPointerMove,
        finishPointer,
        onWheel,
        handleConfirm,
        handleCancelAdjust,
        zoomOut,
        zoomIn,
        enterAdjust,
    };
}
