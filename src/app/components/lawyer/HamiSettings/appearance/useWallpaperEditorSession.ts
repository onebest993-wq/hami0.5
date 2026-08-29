import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import {
    WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    clampWallpaperEditorTransform,
    computeWallpaperCoverLayout,
    type WallpaperEditorTransform,
} from '@/app/services/settings/wallpaperEditorRender';
import { useWallpaperEditorPaint } from './useWallpaperEditorPaint';

export function useWallpaperEditorSession(
    previewUrl: string,
    initialTransform: WallpaperEditorTransform = WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    busy: boolean,
) {
    const {
        frameRef,
        layerRef,
        transformRef,
        frameMetricsRef,
        imageMetricsRef,
        ready,
        zoomScale,
        setZoomScale,
        schedulePaint,
        onImageReady,
    } = useWallpaperEditorPaint(previewUrl, initialTransform);

    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        base: WallpaperEditorTransform;
        maxPanX: number;
        maxPanY: number;
    } | null>(null);

    const endDrag = useCallback(() => {
        dragRef.current = null;
    }, []);

    const onPointerMove = useCallback(
        (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            event.preventDefault();
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            const normX =
                drag.maxPanX > 0 ? drag.base.offsetX + dx / drag.maxPanX : drag.base.offsetX;
            const normY =
                drag.maxPanY > 0 ? drag.base.offsetY + dy / drag.maxPanY : drag.base.offsetY;
            schedulePaint(
                clampWallpaperEditorTransform({
                    ...drag.base,
                    offsetX: normX,
                    offsetY: normY,
                }),
            );
        },
        [schedulePaint],
    );

    const onPointerUp = useCallback(
        (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            endDrag();
        },
        [endDrag, onPointerMove],
    );

    const onFramePointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (busy || !ready) return;
            const { w: frameW, h: frameH } = frameMetricsRef.current;
            const { w: imgW, h: imgH } = imageMetricsRef.current;
            if (frameW <= 0 || imgW <= 0) return;

            const layout = computeWallpaperCoverLayout(
                imgW,
                imgH,
                frameW,
                frameH,
                transformRef.current,
            );
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                base: { ...transformRef.current },
                maxPanX: layout.maxPanX,
                maxPanY: layout.maxPanY,
            };
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        },
        [busy, frameMetricsRef, imageMetricsRef, onPointerMove, onPointerUp, ready, transformRef],
    );

    const onZoomInput = useCallback(
        (value: number) => {
            setZoomScale(value);
            schedulePaint(
                clampWallpaperEditorTransform({
                    ...transformRef.current,
                    scale: value,
                }),
            );
        },
        [schedulePaint, setZoomScale, transformRef],
    );

    return {
        frameRef,
        layerRef,
        transformRef,
        ready,
        zoomScale,
        onImageReady,
        onFramePointerDown,
        onZoomInput,
    };
}
