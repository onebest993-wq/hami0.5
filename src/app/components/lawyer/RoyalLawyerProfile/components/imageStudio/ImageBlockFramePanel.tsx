import React from 'react';
import type { ProfileCustomBlock, ProfileImageFrameStyle } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_IMAGE_RIM_STYLES,
    PROFILE_MEDIA_TEMPLATES,
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
    const accent = frameStyle.accentColor ?? '#E6C673';

    const patchFrame = (patch: Partial<ProfileImageFrameStyle>) => {
        patchImageFrameStyle(block, patch, onChange);
    };

    return (
        <div className="space-y-3" data-testid="image-block-frame-panel">
            <div>
                <p className="profile-studio-field-label">شكل الإطار</p>
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
                            <span className="profile-studio-media-shape-chip__label">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="profile-studio-field-label">حافة الإطار</p>
                <div
                    className="profile-studio-rim-grid"
                    style={{ ['--img-accent' as string]: accent }}
                >
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
                <p className="profile-studio-field-label">لون الحافة</p>
                <label className="profile-studio-color-picker" data-testid="image-frame-accent-wrap">
                    <span className="profile-studio-color-picker__orb" aria-hidden>
                        <input
                            type="color"
                            value={accent}
                            onChange={(e) => patchFrame({ accentColor: e.target.value })}
                            className="profile-studio-color-swatch"
                            data-testid="image-frame-accent-color"
                            aria-label="لون حافة الإطار"
                        />
                    </span>
                    <span className="profile-studio-color-picker__meta">
                        <span className="profile-studio-color-picker__title">اختر لون الحافة</span>
                        <span className="profile-studio-color-picker__hint">يطبَّق فوراً على الإطار</span>
                    </span>
                </label>
            </div>
        </div>
    );
}
