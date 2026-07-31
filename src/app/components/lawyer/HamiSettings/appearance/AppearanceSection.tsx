import React from 'react';
import { useAppearanceSection } from './useAppearanceSection';
import { AppearanceHomeLayoutCard } from './AppearanceHomeLayoutCard';
import { AppearanceThemeAndSurfaceCard } from './AppearanceThemeAndSurfaceCard';
import { AppearanceReadabilityCard, AppearanceWallpaperCard } from './AppearanceWallpaperCard';
import { AppearancePerformanceCard } from './AppearancePerformanceCard';

export function AppearanceSection({ onEnterHomeLayoutEdit }: { onEnterHomeLayoutEdit?: () => void }) {
    const vm = useAppearanceSection();

    return (
        <div data-testid="settings-section-appearance" data-settings-interactive="true">
            <AppearanceHomeLayoutCard vm={vm} onEnterHomeLayoutEdit={onEnterHomeLayoutEdit} />
            <AppearanceThemeAndSurfaceCard vm={vm} />
            <AppearanceWallpaperCard vm={vm} />
            <AppearanceReadabilityCard vm={vm} />
            <AppearancePerformanceCard vm={vm} />
        </div>
    );
}
