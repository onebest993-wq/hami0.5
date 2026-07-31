import React from 'react';
import type { ProfileBlockCanvasStyle, ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_CANVAS_FRAME_SHAPES,
    resolveBlockCanvasStyle,
} from '@/app/services/profile/profilePageCustomization';
import { CanvasMaterialGrid } from './CanvasMaterialGrid';

type TextBlockCanvasPanelProps = {
    block: ProfileCustomBlock;
    uploadingCanvasBg?: boolean;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
    onUploadCanvasBg?: () => void;
    onClearCanvasBg?: () => void;
};

export function TextBlockCanvasPanel({
    block,
    uploadingCanvasBg,
    onChange,
    onUploadCanvasBg,
    onClearCanvasBg,
}: TextBlockCanvasPanelProps) {
    const canvas = resolveBlockCanvasStyle(block);

    const patchCanvas = (patch: Partial<ProfileBlockCanvasStyle>) => {
        onChange({ canvasStyle: { ...canvas, ...patch } });
    };

    return (
        <div className="profile-studio-panel space-y-3" data-testid="text-block-canvas-panel">
            <button
                type="button"
                className="w-full flex items-center justify-between gap-3 py-2 min-h-[44px]"
                onClick={() => patchCanvas({ enabled: !canvas.enabled })}
                data-testid="text-canvas-enabled-toggle"
            >
                <span className="text-sm font-semibold text-white/90">تفعيل لوحة الكتابة</span>
                <span
                    className="profile-settings-luxury-toggle"
                    data-on={canvas.enabled ? 'true' : 'false'}
                    aria-hidden
                >
                    <span className="profile-settings-luxury-toggle-thumb" />
                </span>
            </button>

            {canvas.enabled ? (
                <>
                    <div>
                        <p className="profile-studio-field-label">خامة اللوحة</p>
                        <CanvasMaterialGrid
                            selected={canvas.material}
                            accentColor={canvas.accentColor ?? '#E6C673'}
                            backgroundColor={
                                canvas.backgroundColor?.startsWith('#')
                                    ? canvas.backgroundColor
                                    : '#0A0F1C'
                            }
                            onSelect={(material) => patchCanvas({ material })}
                        />
                    </div>

                    <div>
                        <p className="text-[10px] text-white/45 mb-1.5">شكل الإطار</p>
                        <div className="profile-settings-template-row">
                            {PROFILE_CANVAS_FRAME_SHAPES.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    data-selected={canvas.frameShape === s.id ? 'true' : 'false'}
                                    data-testid={`text-canvas-frame-${s.id}`}
                                    className="profile-settings-template-chip"
                                    onClick={() => patchCanvas({ frameShape: s.id })}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] text-white/45">
                            لون اللوحة
                            <input
                                type="color"
                                value={
                                    canvas.backgroundColor?.startsWith('#')
                                        ? canvas.backgroundColor
                                        : '#0A0F1C'
                                }
                                onChange={(e) => patchCanvas({ backgroundColor: e.target.value })}
                                className="profile-studio-color-swatch"
                                data-testid="text-canvas-bg-color"
                            />
                        </label>
                        <label className="text-[10px] text-white/45">
                            لون الإطار
                            <input
                                type="color"
                                value={canvas.accentColor ?? '#E6C673'}
                                onChange={(e) => patchCanvas({ accentColor: e.target.value })}
                                className="profile-studio-color-swatch"
                                data-testid="text-canvas-accent-color"
                            />
                        </label>
                    </div>

                    <label className="text-[10px] text-white/45 block">
                        حشوة اللوحة {canvas.paddingPx ?? 16}px
                        <input
                            type="range"
                            min={8}
                            max={40}
                            step={1}
                            value={canvas.paddingPx ?? 16}
                            onChange={(e) => patchCanvas({ paddingPx: Number(e.target.value) })}
                            className="profile-studio-mini-slider mt-2"
                            data-testid="text-canvas-padding"
                        />
                    </label>

                    {onUploadCanvasBg ? (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={Boolean(uploadingCanvasBg)}
                                onClick={onUploadCanvasBg}
                                data-testid="text-canvas-bg-upload"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl hami-profile-accent-btn border text-[11px] font-bold min-h-[44px]"
                            >
                                {uploadingCanvasBg
                                    ? 'جاري الرفع...'
                                    : canvas.backgroundImage
                                      ? 'تغيير خلفية اللوحة'
                                      : 'رفع خلفية اللوحة'}
                            </button>
                            {canvas.backgroundImage && onClearCanvasBg ? (
                                <button
                                    type="button"
                                    disabled={Boolean(uploadingCanvasBg)}
                                    onClick={onClearCanvasBg}
                                    data-testid="text-canvas-bg-clear"
                                    className="px-3 rounded-xl border border-red-400/30 text-red-300 text-[11px] font-bold min-h-[44px] min-w-[44px] touch-manipulation"
                                    aria-label="مسح خلفية اللوحة"
                                >
                                    مسح
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </>
            ) : (
                <p className="text-[10px] text-white/38 leading-relaxed">
                    النص يبقى حراً بدون إطار. فعّل اللوحة لإضافة خامة وشكل ولون.
                </p>
            )}
        </div>
    );
}
