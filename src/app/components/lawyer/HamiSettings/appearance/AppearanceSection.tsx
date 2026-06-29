import React from 'react';
import { Palette } from 'lucide-react';
import { SectionHeader } from '../settings-ui';
import { useAppearanceSection } from './useAppearanceSection';
import { AppearanceHomeLayoutCard } from './AppearanceHomeLayoutCard';
import { AppearanceThemeAndSurfaceCard } from './AppearanceThemeAndSurfaceCard';
import { AppearanceReadabilityCard, AppearanceWallpaperCard } from './AppearanceWallpaperCard';
import { AppearancePerformanceCard } from './AppearancePerformanceCard';

export function AppearanceSection({
    onEnterHomeLayoutEdit,
}: {
    onEnterHomeLayoutEdit?: () => void;
}) {
    const vm = useAppearanceSection();

    return (
        <div data-testid="settings-section-appearance">
            <SectionHeader title="تخصيص المنظر" icon={Palette} />
            <AppearanceHomeLayoutCard onEnterHomeLayoutEdit={onEnterHomeLayoutEdit} vm={vm} />
            <AppearanceThemeAndSurfaceCard vm={vm} />
            <AppearanceWallpaperCard vm={vm} />
            <AppearanceReadabilityCard vm={vm} />
            <AppearancePerformanceCard vm={vm} />
        </div>
    );
}
