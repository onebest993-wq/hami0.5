import React, { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Move, ZoomIn } from '@/app/components/ui/lucideIcons';
import {
    WALLPAPER_EDITOR_ASPECT,
    WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    clampWallpaperEditorTransform,
    computeWallpaperCoverLayout,
    type WallpaperEditorTransform,
} from '@/app/services/settings/wallpaperEditorRender';
import { SETTING_GLASS_INNER } from '../settings-ui';

type WallpaperEditorPanelProps = {
    previewUrl: string;
    initialTransform?: WallpaperEditorTransform;
    busy?: boolean;
    onApply: (transform: WallpaperEditorTransform) => void;
    onCancel: () => void;
};

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

export const WallpaperEditorPanel = memo(function WallpaperEditorPanel({
    previewUrl,
    initialTransform = WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    busy = false,
    onApply,
    onCancel,
}: WallpaperEditorPanelProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef(clampWallpaperEditorTransform(initialTransform));
    const frameMetricsRef = useRef<FrameMetrics>({ w: 0, h: 0 });
    const imageMetricsRef = useRef<ImageMetrics>({ w: 0, h: 0 });
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        base: WallpaperEditorTransform;
        maxPanX: number;
        maxPanY: number;
    } | null>(null);
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
        (event: React.PointerEvent<HTMLDivElement>) => {
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
        [busy, onPointerMove, onPointerUp, ready],
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
        [schedulePaint],
    );

    return (
        <div
            className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-3"
            data-testid="settings-wallpaper-editor"
        >
            <div className="flex items-center gap-2 mb-2">
                <Move size={14} className="text-[#E6C673]" aria-hidden />
                <p className="text-xs font-bold text-white">ضبط مكان الخلفية</p>
            </div>
            <p className="text-[10px] text-white/55 mb-3 leading-relaxed">
                اسحب لتحريك الصورة، وكبّر/صغّر ثم اضغط «تطبيق» لمعاينة الشكل النهائي على اللوحة
            </p>

            <div
                ref={frameRef}
                className={`relative mx-auto w-full max-w-[220px] overflow-hidden rounded-xl ring-2 ring-[#E6C673]/35 touch-none select-none ${SETTING_GLASS_INNER}`}
                style={{
                    aspectRatio: `${WALLPAPER_EDITOR_ASPECT}`,
                    contain: 'layout paint',
                }}
                data-testid="settings-wallpaper-editor-frame"
                onPointerDown={onFramePointerDown}
            >
                <div
                    ref={layerRef}
                    className="absolute left-0 top-0 will-change-transform"
                    style={{ transform: 'translate3d(0,0,0)' }}
                >
                    <img
                        src={previewUrl}
                        alt=""
                        draggable={false}
                        decoding="async"
                        onLoad={(event) => onImageReady(event.currentTarget)}
                        className="block h-full w-full max-w-none pointer-events-none select-none"
                    />
                </div>
                {!ready ? (
                    <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 text-[10px] font-bold text-white/60"
                        aria-hidden
                    >
                        جاري التحميل…
                    </div>
                ) : null}
                <div
                    className="pointer-events-none absolute inset-0 border border-white/10"
                    aria-hidden
                />
            </div>

            <label className="mt-3 flex items-center gap-2 text-[10px] font-bold text-white/70">
                <ZoomIn size={14} className="text-[#E6C673] shrink-0" aria-hidden />
                <span className="shrink-0">تكبير</span>
                <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoomScale}
                    disabled={busy || !ready}
                    data-testid="settings-wallpaper-editor-zoom"
                    className="flex-1 min-h-[44px] accent-[#E6C673]"
                    onInput={(e) => onZoomInput(Number(e.currentTarget.value))}
                />
                <span className="tabular-nums text-white/50 w-8 text-left">
                    {Math.round(zoomScale * 100)}%
                </span>
            </label>

            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={onCancel}
                    data-testid="settings-wallpaper-editor-cancel"
                    className="flex-1 min-h-[44px] rounded-xl border border-white/10 text-[11px] font-bold text-white/70 touch-manipulation disabled:opacity-50"
                >
                    إلغاء
                </button>
                <button
                    type="button"
                    disabled={busy || !ready}
                    onClick={() => onApply(transformRef.current)}
                    data-testid="settings-wallpaper-editor-apply"
                    className="flex-1 min-h-[44px] rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/15 text-[11px] font-bold text-[#E6C673] touch-manipulation disabled:opacity-50"
                >
                    {busy ? 'جاري التطبيق…' : 'تطبيق الخلفية'}
                </button>
            </div>
        </div>
    );
});
