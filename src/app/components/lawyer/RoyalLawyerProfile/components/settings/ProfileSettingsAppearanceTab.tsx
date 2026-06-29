import React from 'react';
import { Shuffle } from 'lucide-react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_ACCENT_COLORS,
    PROFILE_MATERIALS,
} from '@/app/services/profile/profilePageCustomization';

type ProfileSettingsAppearanceTabProps = {
    draft: ProfilePageCustomization;
    randomDisabled: boolean;
    randomCooldownSec: number;
    onDraftChange: (updater: (prev: ProfilePageCustomization) => ProfilePageCustomization) => void;
    onRandomAppearance: () => void;
};

export function ProfileSettingsAppearanceTab({
    draft,
    randomDisabled,
    randomCooldownSec,
    onDraftChange,
    onRandomAppearance,
}: ProfileSettingsAppearanceTabProps) {
    return (
        <div className="space-y-4 pb-2" data-testid="profile-settings-appearance-tab">
            <div className="profile-settings-luxury-card p-3">
                <button
                    type="button"
                    disabled={randomDisabled}
                    onClick={onRandomAppearance}
                    className="profile-settings-random-btn min-h-[44px] w-full"
                >
                    <Shuffle size={16} strokeWidth={2.2} />
                    {randomDisabled
                        ? `التوليد العشوائي (${randomCooldownSec}ث)`
                        : 'التوليد العشوائي'}
                </button>
            </div>
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
                            onClick={() =>
                                onDraftChange((p) => ({
                                    ...p,
                                    appearance: { ...p.appearance, accentColor: c.id },
                                }))
                            }
                            data-selected={draft.appearance.accentColor === c.id}
                            className="profile-settings-color-swatch min-h-[44px]"
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
        </div>
    );
}
