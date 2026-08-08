import React, { useId } from 'react';
import { flushSync } from 'react-dom';
import { ChevronLeft, Layers } from '@/app/components/ui/lucideIcons';
import { SettingsCollapseToggle } from '../components/SettingsCollapseToggle';
import { SettingCard, SETTING_GLASS_INNER } from '../settings-ui';
import type { AppearanceSectionViewModel } from './useAppearanceSection';
import { AppearanceThemeSwatch } from './AppearanceThemeSwatch';

export function AppearanceThemeAndSurfaceCard({ vm }: { vm: AppearanceSectionViewModel }) {
    const colorLabelId = useId();

    return (
        <SettingCard className="mb-4">
            <div className="p-4 border-b border-white/[0.03]">
                <button
                    type="button"
                    data-testid="appearance-block-customize-toggle"
                    aria-haspopup="dialog"
                    aria-expanded={vm.blockCustomize.panelOpen}
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.stopPropagation();
                        flushSync(() => vm.blockCustomize.setPanelOpen((open) => !open));
                    }}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    className="flex w-full items-center justify-between gap-3 min-h-[44px] rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-right touch-manipulation hover:bg-white/[0.05] active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${SETTING_GLASS_INNER} text-[#E6C673]`}>
                            <Layers size={17} aria-hidden />
                        </div>
                        <span className="text-sm font-bold text-white block min-w-0">تخصيص قسم</span>
                    </div>
                    <ChevronLeft size={18} className="shrink-0 text-white/45" aria-hidden />
                </button>
            </div>

            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                        <label id={colorLabelId} className="text-sm font-bold text-white block">
                            لون الواجهة
                        </label>
                        <p className="text-[10px] text-white/45 mt-0.5 leading-relaxed">
                            يُطبَّق على خلفية اللوحة والبطاقات — كما في المعاينة
                        </p>
                    </div>
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
                <p className="text-xs text-white/60 mt-2 text-center">{vm.activeThemeToken.name}</p>
            </div>
        </SettingCard>
    );
}
