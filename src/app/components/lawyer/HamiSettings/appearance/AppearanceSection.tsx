import React from 'react';
import { useAppearanceSection } from './useAppearanceSection';
import { AppearanceThemeAndSurfaceCard } from './AppearanceThemeAndSurfaceCard';
import { AppearanceWallpaperCard } from './AppearanceWallpaperCard';
import { AppearancePerformanceCard } from './AppearancePerformanceCard';
import { AppearanceBlockCustomizeSheet } from './AppearanceBlockCustomizeSheet';

export function AppearanceSection() {
    const vm = useAppearanceSection();

    return (
        <>
            <div data-testid="settings-section-appearance" data-settings-interactive="true">
                <AppearanceThemeAndSurfaceCard vm={vm} />
                <AppearanceWallpaperCard vm={vm} />
                <AppearancePerformanceCard vm={vm} />
            </div>
            <AppearanceBlockCustomizeSheet
                open={vm.blockCustomize.panelOpen}
                customize={vm.blockCustomize}
                themePrimary={vm.themeToken.primary}
                onClose={() => vm.blockCustomize.setPanelOpen(false)}
            />
        </>
    );
}
