import React from 'react';
import { ImagePlus } from 'lucide-react';
import type { ProfileBlockCanvasStyle, ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_CANVAS_FRAME_GLOWS,
    PROFILE_CANVAS_FRAME_SHAPES,
    resolveBlockCanvasStyle,
} from '@/app/services/profile/profilePageCustomization';
import { CanvasMaterialGrid } from './CanvasMaterialGrid';

type TextBlockCanvasPanelProps = {
    block: ProfileCustomBlock;
    uploadingCanvasBg?: boolean;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
    onUploadCanvasBg?: () => void;
};

export function TextBlockCanvasPanel({
    block,
    uploadingCanvasBg,
    onChange,
    onUploadCanvasBg,
}: TextBlockCanvasPanelProps) {
    const canvas = resolveBlockCanvasStyle(block);

    const patchCanvas = (patch: Partial<ProfileBlockCanvasStyle>) => {
        onChange({ canvasStyle: { ...canvas, ...patch } });
    };

    return (
        <div className="profile-settings-luxury-card p-3 space-y-3" data-testid="text-block-canvas-panel">
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
                        <p className="profile-studio-field-hint mb-2">
                            كل خامة طبقات ملمس وعمق — تتأثر بلون اللوحة ولون الإطار أدناه
                        </p>
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
                                    data-selected={canvas.frameShape === s.id}
                                    data-testid={`text-canvas-frame-${s.id}`}
                                    className="profile-settings-template-chip"
                                    onClick={() => patchCanvas({ frameShape: s.id })}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="profile-studio-field-label">توهج الإطار</p>
                        <div className="profile-studio-glow-grid">
                            {PROFILE_CANVAS_FRAME_GLOWS.map((g) => (
                                <button
                                    key={g.id}
                                    type="button"
                                    data-selected={canvas.frameGlow === g.id}
                                    data-glow={g.id}
                                    data-testid={`text-canvas-glow-${g.id}`}
                                    className="profile-studio-glow-chip"
                                    onClick={() => patchCanvas({ frameGlow: g.id })}
                                >
                                    <span className="profile-studio-glow-chip__orb" aria-hidden />
                                    <span className="profile-studio-glow-chip__label">{g.label}</span>
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
                                className="profile-studio-color-input bg-black/35"
                                data-testid="text-canvas-bg-color"
                            />
                        </label>
                        <label className="text-[10px] text-white/45">
                            لون الإطار
                            <input
                                type="color"
                                value={canvas.accentColor ?? '#E6C673'}
                                onChange={(e) => patchCanvas({ accentColor: e.target.value })}
                                className="profile-studio-color-input bg-black/35"
                                data-testid="text-canvas-accent-color"
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        disabled={uploadingCanvasBg}
                        onClick={onUploadCanvasBg}
                        data-testid="text-canvas-upload-bg"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl hami-profile-accent-btn border text-[11px] font-bold min-h-[44px]"
                    >
                        <ImagePlus size={14} />
                        {uploadingCanvasBg
                            ? 'جاري الرفع...'
                            : canvas.backgroundImage
                              ? 'تغيير خلفية اللوحة'
                              : 'رفع خلفية للوحة'}
                    </button>

                    <label className="text-[10px] text-white/45 block">
                        شدة التوهج {Math.round((canvas.glowIntensity ?? 0.55) * 100)}%
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={canvas.glowIntensity ?? 0.55}
                            onChange={(e) => patchCanvas({ glowIntensity: Number(e.target.value) })}
                            className="profile-studio-mini-slider mt-2"
                            data-testid="text-canvas-glow-intensity"
                        />
                    </label>

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
                </>
            ) : (
                <p className="text-[10px] text-white/38 leading-relaxed">
                    النص يبقى حراً بدون إطار. فعّل اللوحة لإضافة خامة، توهج، وخلفية مخصصة.
                </p>
            )}
        </div>
    );
}
