import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, RotateCcw, X, Check } from '@/app/components/ui/lucideIcons';
import {
    clampProfileBackgroundEditState,
    computeProfileBackgroundCropRect,
    defaultProfileBackgroundEditState,
    exportProfileBackgroundImage,
    loadProfileImageBitmap,
    PROFILE_CANVAS_BACKGROUND_ASPECT,
    type ProfileBackgroundEditState,
} from '@/app/services/profile/profileImageEditor';

type ProfileCanvasBackgroundEditorProps = {
    open: boolean;
    file: File | null;
    onCancel: () => void;
    onConfirm: (file: File) => void | Promise<void>;
};

type DragState = {
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
};

function panFromDrag(
    dx: number,
    dy: number,
    frameW: number,
    frameH: number,
    _bitmapW: number,
    _bitmapH: number,
    baseState: ProfileBackgroundEditState,
): ProfileBackgroundEditState {
    const sensitivity = 2.2;
    const panDeltaX = (-dx / Math.max(frameW, 1)) * sensitivity;
    const panDeltaY = (-dy / Math.max(frameH, 1)) * sensitivity;
    return clampProfileBackgroundEditState({
        ...baseState,
        panX: baseState.panX + panDeltaX,
        panY: baseState.panY + panDeltaY,
    });
}

export function ProfileCanvasBackgroundEditor({
    open,
    file,
    onCancel,
    onConfirm,
}: ProfileCanvasBackgroundEditorProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
    const [state, setState] = useState<ProfileBackgroundEditState>(defaultProfileBackgroundEditState);
    const [exporting, setExporting] = useState(false);
    const [frameSize, setFrameSize] = useState({ w: 320, h: 180 });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [open, file]);

    useEffect(() => {
        if (!open || !file) {
            setBitmap(null);
            setState(defaultProfileBackgroundEditState());
            return;
        }
        let cancelled = false;
        void loadProfileImageBitmap(file)
            .then((bmp) => {
                if (!cancelled) {
                    setBitmap(bmp);
                    setState(defaultProfileBackgroundEditState());
                } else {
                    bmp.close();
                }
            })
            .catch(() => {
                if (!cancelled) onCancel();
            });
        return () => {
            cancelled = true;
        };
    }, [open, file, onCancel]);

    useEffect(() => {
        if (!open) return;
        const node = frameRef.current;
        if (!node || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect) return;
            setFrameSize({ w: rect.width, h: rect.height });
        });
        ro.observe(node);
        return () => ro.disconnect();
    }, [open, bitmap]);

    useEffect(() => {
        return () => {
            bitmap?.close();
        };
    }, [bitmap]);

    const previewStyle = useMemo(() => {
        if (!bitmap) return undefined;
        const crop = computeProfileBackgroundCropRect(bitmap.width, bitmap.height, state);
        const coverScale = Math.max(frameSize.w / crop.sw, frameSize.h / crop.sh);
        const imgW = bitmap.width * coverScale;
        const imgH = bitmap.height * coverScale;
        const offsetX = frameSize.w / 2 - (crop.sx + crop.sw / 2) * coverScale;
        const offsetY = frameSize.h / 2 - (crop.sy + crop.sh / 2) * coverScale;
        return {
            width: `${imgW}px`,
            height: `${imgH}px`,
            transform: `translate(${offsetX}px, ${offsetY}px)`,
        };
    }, [bitmap, frameSize.h, frameSize.w, state]);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!bitmap || exporting) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startPanX: state.panX,
                startPanY: state.panY,
            };
        },
        [bitmap, exporting, state.panX, state.panY],
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId || !bitmap) return;
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            const next = panFromDrag(dx, dy, frameSize.w, frameSize.h, bitmap.width, bitmap.height, {
                scale: state.scale,
                panX: drag.startPanX,
                panY: drag.startPanY,
            });
            setState(next);
        },
        [bitmap, frameSize.h, frameSize.w, state.scale],
    );

    const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
        }
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!bitmap || !file || exporting) return;
        setExporting(true);
        try {
            const preferPng = file.type === 'image/png';
            const exported = await exportProfileBackgroundImage(bitmap, state, file.name, {
                preferPng,
            });
            await onConfirm(exported);
        } finally {
            setExporting(false);
        }
    }, [bitmap, exporting, file, onConfirm, state]);

    if (!open || !file || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[320] flex flex-col bg-[#05060D]/96 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] px-4"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تحرير خلفية اللوحة"
            data-testid="profile-canvas-bg-editor"
        >
            <div className="flex items-center justify-between gap-3 shrink-0 py-2">
                <h2 className="text-sm font-bold text-[#F4F0E8]">تحرير خلفية اللوحة</h2>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={exporting}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 text-white/60 touch-manipulation"
                    aria-label="إلغاء"
                >
                    <X size={18} />
                </button>
            </div>

            <p className="text-[11px] text-white/45 leading-relaxed shrink-0 mb-3">
                اسحب الصورة لضبط الموضع، واستخدم التكبير للإطار المثالي. تُحفظ بأعلى دقة ممكنة.
            </p>

            <div
                ref={frameRef}
                className="relative mx-auto w-full max-w-[min(100%,520px)] overflow-hidden rounded-2xl border border-[#E6C673]/25 bg-[#0A0F1C] touch-none select-none"
                style={{ aspectRatio: String(PROFILE_CANVAS_BACKGROUND_ASPECT) }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                data-testid="profile-canvas-bg-editor-frame"
            >
                {bitmap && previewStyle && previewUrl ? (
                    <img
                        src={previewUrl}
                        alt=""
                        draggable={false}
                        className="absolute top-0 left-0 max-w-none pointer-events-none"
                        style={previewStyle}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs">
                        جاري التحميل...
                    </div>
                )}
                <div
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#E6C673]/35 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]"
                    aria-hidden
                />
            </div>

            <div className="mt-4 space-y-3 max-w-[min(100%,520px)] mx-auto w-full shrink-0">
                <label className="flex items-center gap-3 text-[11px] text-white/55">
                    <ZoomOut size={14} className="shrink-0" aria-hidden />
                    <input
                        type="range"
                        min={1}
                        max={4}
                        step={0.01}
                        value={state.scale}
                        onChange={(e) =>
                            setState((prev) =>
                                clampProfileBackgroundEditState({
                                    ...prev,
                                    scale: Number(e.target.value),
                                }),
                            )
                        }
                        className="flex-1 profile-studio-mini-slider"
                        data-testid="profile-canvas-bg-zoom"
                    />
                    <ZoomIn size={14} className="shrink-0" aria-hidden />
                </label>

                <button
                    type="button"
                    onClick={() => setState(defaultProfileBackgroundEditState())}
                    disabled={exporting}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl border border-white/10 text-white/65 text-[11px] font-bold touch-manipulation"
                >
                    <RotateCcw size={14} aria-hidden />
                    إعادة الضبط
                </button>
            </div>

            <div className="mt-auto pt-4 flex gap-2 max-w-[min(100%,520px)] mx-auto w-full shrink-0">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={exporting}
                    className="flex-1 min-h-[48px] rounded-xl border border-white/12 text-white/70 text-sm font-bold touch-manipulation"
                >
                    إلغاء
                </button>
                <button
                    type="button"
                    onClick={() => void handleConfirm()}
                    disabled={!bitmap || exporting}
                    className="flex-1 min-h-[48px] rounded-xl border border-[#E6C673]/80 bg-[#E6C673] text-[#0A0F1C] text-sm font-bold touch-manipulation disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    data-testid="profile-canvas-bg-apply"
                >
                    <Check size={16} aria-hidden />
                    {exporting ? 'جاري الحفظ...' : 'تطبيق الخلفية'}
                </button>
            </div>
        </div>,
        document.body,
    );
}
