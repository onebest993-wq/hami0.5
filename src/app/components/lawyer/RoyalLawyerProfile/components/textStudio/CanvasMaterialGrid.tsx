import React from 'react';
import type { ProfileBlockCanvasStyle } from '@/app/services/profile/profilePageCustomization';
import { PROFILE_CANVAS_MATERIALS } from '@/app/services/profile/profilePageCustomization';
import { ProfileTextCanvasMaterialStack } from '../profileTextCanvas/ProfileTextCanvasMaterialStack';

type CanvasMaterialGridProps = {
    selected: ProfileBlockCanvasStyle['material'];
    accentColor: string;
    backgroundColor: string;
    onSelect: (material: NonNullable<ProfileBlockCanvasStyle['material']>) => void;
};

export function CanvasMaterialGrid({
    selected,
    accentColor,
    backgroundColor,
    onSelect,
}: CanvasMaterialGridProps) {
    return (
        <div className="profile-studio-material-grid" data-testid="text-canvas-material-grid">
            {PROFILE_CANVAS_MATERIALS.map((m) => (
                <button
                    key={m.id}
                    type="button"
                    data-selected={selected === m.id ? 'true' : 'false'}
                    data-material={m.id}
                    data-testid={`text-canvas-material-${m.id}`}
                    className="profile-studio-material-chip min-h-[44px]"
                    onClick={() => onSelect(m.id)}
                >
                    <span className="profile-studio-material-chip__stage" aria-hidden>
                        <ProfileTextCanvasMaterialStack
                            material={m.id}
                            accentColor={accentColor}
                            backgroundColor={backgroundColor}
                            mini
                        />
                    </span>
                    <span className="profile-studio-material-chip__label">{m.label}</span>
                </button>
            ))}
        </div>
    );
}
