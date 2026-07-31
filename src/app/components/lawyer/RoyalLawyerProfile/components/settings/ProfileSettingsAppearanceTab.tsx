import React from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_ACCENT_COLORS,
    PROFILE_MATERIALS,
    PROFILE_PORTRAIT_FRAMES,
} from '@/app/services/profile/profilePageCustomization';

type ProfileSettingsAppearanceTabProps = {
    draft: ProfilePageCustomization;
    onDraftChange: (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => void;
    /** أثناء الحفظ/حذف صامت — امنع تبديل المظهر */
    disabled?: boolean;
};

export function ProfileSettingsAppearanceTab({
    draft,
    onDraftChange,
    disabled = false,
}: ProfileSettingsAppearanceTabProps) {
    const portraitFrame = draft.appearance.portraitFrame ?? 'classic';

    return (
        <div
            className="space-y-4 pb-2"
            data-testid="profile-settings-appearance-tab"
            aria-disabled={disabled || undefined}
        >
            <div>
                <p className="text-[11px] font-bold text-white/55 mb-2 px-1 tracking-wide">
                    لون التمييز والخلفية
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {PROFILE_ACCENT_COLORS.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            data-testid={`profile-accent-${c.id}`}
                            disabled={disabled}
                            onClick={() =>
                                onDraftChange((p) => ({
                                    ...p,
                                    appearance: { ...p.appearance, accentColor: c.id },
                                }))
                            }
                            data-selected={draft.appearance.accentColor === c.id}
                            className="profile-settings-color-swatch min-h-[44px]"
                            style={{
                                backgroundColor: c.hex,
                                color:
                                    c.id === 'navy' || c.id === 'wine' ? '#F4F0E8' : '#0a0c12',
                            }}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[11px] font-bold text-white/55 mb-2 px-1 tracking-wide">خامة الصفحة</p>
                <div className="grid grid-cols-2 gap-2">
                    {PROFILE_MATERIALS.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            data-testid={`profile-material-${m.id}`}
                            disabled={disabled}
                            onClick={() =>
                                onDraftChange((p) => ({
                                    ...p,
                                    appearance: { ...p.appearance, material: m.id },
                                }))
                            }
                            data-selected={draft.appearance.material === m.id}
                            className="profile-settings-material-chip min-h-[44px]"
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[11px] font-bold text-white/55 mb-2 px-1 tracking-wide">
                    إطار الصورة الشخصية
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PROFILE_PORTRAIT_FRAMES.map((frame) => (
                        <button
                            key={frame.id}
                            type="button"
                            data-testid={`profile-portrait-frame-${frame.id}`}
                            data-selected={portraitFrame === frame.id}
                            disabled={disabled}
                            onClick={() =>
                                onDraftChange((p) => ({
                                    ...p,
                                    appearance: { ...p.appearance, portraitFrame: frame.id },
                                }))
                            }
                            className="profile-settings-portrait-frame-chip min-h-[44px]"
                        >
                            <span
                                className="profile-settings-portrait-frame-preview"
                                data-frame={frame.id}
                                aria-hidden
                            />
                            <span className="min-w-0 text-right">
                                <span className="block text-[12px] font-bold text-white/88">
                                    {frame.label}
                                </span>
                                <span className="block text-[10px] text-white/40 mt-0.5">
                                    {frame.hint}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
