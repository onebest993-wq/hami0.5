import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
    WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    clampWallpaperEditorTransform,
    computeWallpaperCoverLayout,
    type WallpaperEditorTransform,
} from '@/app/services/settings/wallpaperEditorRender';

type FrameMetrics = { w: number; h: number };
type ImageMetrics = { w: number; h: number };

function applyCoverLayout(
    layer: HTMLElement,
    imgW: number,
    imgH: number,
    frameW: number,
    frameH: number,
    transform: WallpaperEditorTransform,
) {
    const layout = computeWallpaperCoverLayout(imgW, imgH, frameW, frameH, transform);
    layer.style.width = `${layout.drawW}px`;
    layer.style.height = `${layout.drawH}px`;
    layer.style.transform = `translate3d(${layout.left}px, ${layout.top}px, 0)`;
    return layout;
}

export function useWallpaperEditorPaint(
    previewUrl: string,
    initialTransform: WallpaperEditorTransform = WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
) {
    const frameRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef(clampWallpaperEditorTransform(initialTransform));
    const frameMetricsRef = useRef<FrameMetrics>({ w: 0, h: 0 });
    const imageMetricsRef = useRef<ImageMetrics>({ w: 0, h: 0 });
    const rafRef = useRef<number | null>(null);
    const pendingTransformRef = useRef<WallpaperEditorTransform | null>(null);

    const [ready, setReady] = useState(false);
    const [zoomScale, setZoomScale] = useState(() => transformRef.current.scale);

    const paintLayer = useCallback((transform: WallpaperEditorTransform) => {
        const layer = layerRef.current;
        const { w: frameW, h: frameH } = frameMetricsRef.current;
        const { w: imgW, h: imgH } = imageMetricsRef.current;
        if (!layer || frameW <= 0 || imgW <= 0) return null;
        const clamped = clampWallpaperEditorTransform(transform);
        transformRef.current = clamped;
        return applyCoverLayout(layer, imgW, imgH, frameW, frameH, clamped);
    }, []);

    const schedulePaint = useCallback(
        (transform: WallpaperEditorTransform) => {
            pendingTransformRef.current = transform;
            if (rafRef.current != null) return;
            rafRef.current = window.requestAnimationFrame(() => {
                rafRef.current = null;
                const pending = pendingTransformRef.current;
                if (pending) paintLayer(pending);
            });
        },
        [paintLayer],
    );

    useLayoutEffect(() => {
        transformRef.current = clampWallpaperEditorTransform(initialTransform);
        setZoomScale(transformRef.current.scale);
        setReady(false);
    }, [initialTransform, previewUrl]);

    const onImageReady = useCallback(
        (img: HTMLImageElement) => {
            if (!img.naturalWidth || !img.naturalHeight) return;
            imageMetricsRef.current = { w: img.naturalWidth, h: img.naturalHeight };
            const markReady = () => {
                setReady(true);
                paintLayer(transformRef.current);
            };
            if (typeof img.decode === 'function') {
                void img.decode().then(markReady).catch(markReady);
                return;
            }
            markReady();
        },
        [paintLayer],
    );

    useLayoutEffect(() => {
        const el = frameRef.current;
        if (!el) return;

        const measure = () => {
            const rect = el.getBoundingClientRect();
            const next = { w: rect.width, h: rect.height };
            const prev = frameMetricsRef.current;
            if (Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5) return;
            frameMetricsRef.current = next;
            paintLayer(transformRef.current);
        };

        measure();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const obs = new ResizeObserver(measure);
        obs.observe(el);
        return () => obs.disconnect();
    }, [paintLayer, ready]);

    useLayoutEffect(() => {
        return () => {
            if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return {
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
    };
}
