import React, { memo } from 'react';
import { Move } from '@/app/components/ui/icons/Move';
import { ZoomIn } from '@/app/components/ui/icons/ZoomIn';
import {
    WALLPAPER_EDITOR_ASPECT,
    WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    type WallpaperEditorTransform,
} from '@/app/services/settings/wallpaperEditorRender';
import { SETTING_GLASS_INNER } from '../settings-ui/index';
import { useWallpaperEditorSession } from './useWallpaperEditorSession';

type WallpaperEditorPanelProps = {
    previewUrl: string;
    initialTransform?: WallpaperEditorTransform;
    busy?: boolean;
    onApply: (transform: WallpaperEditorTransform) => void;
    onCancel: () => void;
};

export const WallpaperEditorPanel = memo(function WallpaperEditorPanel({
    previewUrl,
    initialTransform = WALLPAPER_EDITOR_DEFAULT_TRANSFORM,
    busy = false,
    onApply,
    onCancel,
}: WallpaperEditorPanelProps) {
    const {
        frameRef,
        layerRef,
        transformRef,
        ready,
        zoomScale,
        onImageReady,
        onFramePointerDown,
        onZoomInput,
    } = useWallpaperEditorSession(previewUrl, initialTransform, busy);

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
