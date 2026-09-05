import React, { useId } from 'react';
import { flushSync } from 'react-dom';
import {
    SettingsChevronLeftIcon,
    SettingsLayersIcon,
    SettingsPauseIcon,
} from '../settingsStemIconsLazy';
import { SettingsCollapseToggle } from '../components/SettingsCollapseToggle';
import { SETTING_ROW_BORDER } from '../settings-ui/tokens';
import { SettingRow, Toggle } from '../settings-ui/index';
import type { AppearanceSectionViewModel } from './useAppearanceSection';
import { AppearanceThemeSwatch } from './AppearanceThemeSwatch';
import { prefetchAppearanceCustomizeSheet } from './appearanceCustomizeSheetLoad';

export function AppearanceThemeAndSurfaceCard({ vm }: { vm: AppearanceSectionViewModel }) {
    const colorLabelId = useId();

    return (
        <>
            <button
                type="button"
                data-testid="appearance-block-customize-toggle"
                aria-haspopup="dialog"
                aria-expanded={vm.blockCustomize.panelOpen}
                onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.stopPropagation();
                    prefetchAppearanceCustomizeSheet();
                    flushSync(() => vm.blockCustomize.setPanelOpen((open) => !open));
                }}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                className={`flex w-full items-center justify-between gap-2 min-h-[44px] px-3 py-1.5 text-right touch-manipulation ${SETTING_ROW_BORDER}`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
                <span className="flex items-center gap-2.5 min-w-0">
                    <SettingsLayersIcon size={14} className="shrink-0 text-[#E6C673]/80" aria-hidden />
                    <span className="text-[13px] font-medium text-white/95">تخصيص قسم</span>
                </span>
                <SettingsChevronLeftIcon size={14} className="shrink-0 text-white/35" aria-hidden />
            </button>

            <div className="px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <label id={colorLabelId} className="text-[13px] font-medium text-white/95">
                        لون الواجهة
                    </label>
                    <SettingsCollapseToggle
                        expanded={vm.themesExpanded}
                        hidden={vm.hiddenThemeCount}
                        onToggle={() => vm.setThemesExpanded((v) => !v)}
                        label="الألوان"
                    />
                </div>
                <div className="hami-appearance-theme-grid">
                    {vm.visibleThemeKeys.map((key) => (
                        <AppearanceThemeSwatch
                            key={key}
                            themeKey={key}
                            active={vm.activeThemeKey === key}
                            onSelect={vm.selectTheme}
                        />
                    ))}
                </div>
                <p className="text-[11px] text-white/40 mt-2 text-center">{vm.activeThemeToken.name}</p>
            </div>

            <SettingRow
                icon={SettingsPauseIcon}
                label="تقليل الحركة"
                subLabel="يقلّل الانتقالات"
                isLast
                action={
                    <Toggle
                        testId="settings-toggle-appearance-reduceMotion"
                        checked={vm.appearance.reduceMotion}
                        onChange={(next) => vm.patchAppearance({ reduceMotion: next })}
                    />
                }
            />
        </>
    );
}
