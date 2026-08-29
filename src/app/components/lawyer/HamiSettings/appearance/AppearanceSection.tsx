import React, { Suspense, lazy, useEffect } from 'react';
import { useAppearanceSection } from './useAppearanceSection';
import { useSettingsSectionActive } from '../settingsSectionActiveContext';
import { useAppearanceChapter } from './useAppearanceChapter';
import { AppearanceChapterList } from './AppearanceChapterList';
import { prefetchAppearanceCustomizeSheet } from './appearanceCustomizeSheetLoad';

const AppearanceBlockCustomizeSheet = lazy(() =>
    import('./AppearanceBlockCustomizeSheet').then((m) => ({ default: m.AppearanceBlockCustomizeSheet })),
);

export function AppearanceSection() {
    const vm = useAppearanceSection();
    const sectionActive = useSettingsSectionActive();
    const chapter = useAppearanceChapter();

    useEffect(() => {
        if (!sectionActive) return;
        prefetchAppearanceCustomizeSheet();
    }, [sectionActive]);

    useEffect(() => {
        if (!sectionActive && vm.blockCustomize.panelOpen) {
            vm.blockCustomize.setPanelOpen(false);
        }
    }, [sectionActive, vm.blockCustomize.panelOpen, vm.blockCustomize.setPanelOpen]);

    return (
        <>
            <div data-testid="settings-section-appearance" data-settings-interactive="true">
                <AppearanceChapterList vm={vm} openId={chapter.openId} onToggle={chapter.toggle} />
            </div>
            {vm.blockCustomize.panelOpen ? (
                <Suspense fallback={null}>
                    <AppearanceBlockCustomizeSheet
                        open={vm.blockCustomize.panelOpen}
                        customize={vm.blockCustomize}
                        themePrimary={vm.activeThemeToken.primary}
                        onClose={() => vm.blockCustomize.setPanelOpen(false)}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
