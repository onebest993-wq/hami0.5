import React from 'react';
import type { ProfileCustomBlock, ProfileImageFrameStyle } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_CANVAS_FRAME_GLOWS,
    PROFILE_IMAGE_RIM_STYLES,
    PROFILE_MEDIA_TEMPLATES,
    mediaTemplateClipPath,
    resolveImageFrameStyle,
} from '@/app/services/profile/profilePageCustomization';
import { patchImageFrameStyle } from '../profileImageFrameUtils';

type ImageBlockFramePanelProps = {
    block: ProfileCustomBlock;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
};

export function ImageBlockFramePanel({ block, onChange }: ImageBlockFramePanelProps) {
    const selectedTemplate = block.mediaTemplate ?? 'circle';
    const frameStyle = resolveImageFrameStyle(block);

    const patchFrame = (patch: Partial<ProfileImageFrameStyle>) => {
        patchImageFrameStyle(block, patch, onChange);
    };

    return (
        <div className="space-y-3" data-testid="image-block-frame-panel">
            <div>
                <p className="profile-studio-field-label">شكل الإطار</p>
                <p className="profile-studio-field-hint">قوالب فنية — تُطبَّق فوراً على المعاينة</p>
                <div className="profile-studio-media-shape-grid">
                    {PROFILE_MEDIA_TEMPLATES.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange({ mediaTemplate: t.id })}
                            data-selected={selectedTemplate === t.id ? 'true' : 'false'}
                            data-template={t.id}
                            data-testid={`image-template-${t.id}`}
                            className="profile-studio-media-shape-chip min-h-[44px]"
                        >
                            <span
                                className="profile-studio-media-shape-chip__preview"
                                style={{
                                    clipPath: mediaTemplateClipPath(t.id),
                                    WebkitClipPath: mediaTemplateClipPath(t.id),
                                }}
                                aria-hidden
                            />
                            <span className="profile-studio-media-shape-chip__label">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="profile-studio-field-label">حافة الإطار</p>
                <div className="profile-studio-rim-grid">
                    {PROFILE_IMAGE_RIM_STYLES.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            data-selected={frameStyle.rimStyle === r.id ? 'true' : 'false'}
                            data-rim={r.id}
                            data-testid={`image-rim-${r.id}`}
                            className="profile-studio-rim-chip min-h-[44px]"
                            onClick={() => patchFrame({ rimStyle: r.id })}
                        >
                            <span className="profile-studio-rim-chip__frame" aria-hidden />
                            <span className="profile-studio-rim-chip__label">{r.label}</span>
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
                            data-selected={frameStyle.frameGlow === g.id ? 'true' : 'false'}
                            data-glow={g.id}
                            data-testid={`image-glow-${g.id}`}
                            className="profile-studio-glow-chip min-h-[44px]"
                            onClick={() => patchFrame({ frameGlow: g.id })}
                        >
                            <span className="profile-studio-glow-chip__orb" aria-hidden />
                            <span className="profile-studio-glow-chip__label">{g.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <label className="text-[10px] text-white/45 block">
                شدة التوهج {Math.round((frameStyle.glowIntensity ?? 0.6) * 100)}%
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((frameStyle.glowIntensity ?? 0.6) * 100)}
                    onChange={(e) => patchFrame({ glowIntensity: Number(e.target.value) / 100 })}
                    className="mt-1 w-full accent-[var(--profile-accent)]"
                    data-testid="image-frame-glow-intensity"
                />
            </label>

            <label className="text-[10px] text-white/45 block">
                لون التمييز
                <input
                    type="color"
                    value={frameStyle.accentColor ?? '#E6C673'}
                    onChange={(e) => patchFrame({ accentColor: e.target.value })}
                    className="profile-studio-color-input bg-transparent"
                    data-testid="image-frame-accent-color"
                />
            </label>

            <button
                type="button"
                className="w-full flex items-center justify-between py-2 px-1 text-[11px] text-white/70 min-h-[44px]"
                onClick={() => patchFrame({ vignette: !(frameStyle.vignette !== false) })}
                data-testid="image-frame-vignette-toggle"
            >
                <span>تظليل حواف الصورة (Vignette)</span>
                <span
                    className="profile-settings-luxury-toggle"
                    data-on={frameStyle.vignette !== false ? 'true' : 'false'}
                >
                    <span className="profile-settings-luxury-toggle-thumb" />
                </span>
            </button>
        </div>
    );
}
