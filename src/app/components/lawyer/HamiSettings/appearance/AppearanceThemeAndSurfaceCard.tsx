import React from 'react';
import { Shapes, Square } from 'lucide-react';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import {
    BACKGROUND_PATTERN_OPACITY_MIN,
    BACKGROUND_PATTERN_OPACITY_MAX,
    GLASS_OPACITY_MIN,
    GLASS_OPACITY_MAX,
    LAWYER_THEME_TOKENS,
    SHAPE_OPTIONS,
    resolvePatternPreviewStyle,
    type AppSettingsState,
} from '@/app/services/settings';
import { SettingsCollapseToggle } from '../components/SettingsCollapseToggle';
import { SettingCard, SettingRow, Toggle, Segmented, SliderRow, SETTING_GLASS_INNER } from '../settings-ui';
import type { AppearanceSectionViewModel } from './useAppearanceSection';

export function AppearanceThemeAndSurfaceCard({ vm }: { vm: AppearanceSectionViewModel }) {
    return (
        <SettingCard className="mb-4">
            <div className="p-4 border-b border-white/[0.03]">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                        <label className="text-sm font-bold text-white block">لون الخلفية</label>
                        <p className="text-[10px] text-white/40 mt-1">{settingWiringHint('appearance.theme')}</p>
                    </div>
                    <SettingsCollapseToggle
                        expanded={vm.themesExpanded}
                        hidden={vm.hiddenThemeCount}
                        onToggle={() => vm.setThemesExpanded((v) => !v)}
                        label="الألوان"
                    />
                </div>
                <div className="grid grid-cols-5 gap-2 mt-3">
                    {vm.visibleThemeKeys.map((key) => {
                        const token = LAWYER_THEME_TOKENS[key];
                        const active = vm.activeTheme === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => vm.selectTheme(key)}
                                title={token.name}
                                className={`relative h-12 rounded-xl overflow-hidden transition-all ${SETTING_GLASS_INNER} ${
                                    active ? 'ring-2 ring-[#E6C673]/50 scale-[1.02]' : 'hover:bg-white/[0.05]'
                                }`}
                                aria-pressed={active}
                            >
                                <div className="absolute inset-0" style={{ backgroundColor: token.bg }} />
                                <div
                                    className="absolute inset-0 opacity-50"
                                    style={{
                                        background: `radial-gradient(circle at 70% 80%, ${token.primary}66, transparent 62%)`,
                                    }}
                                />
                                <div
                                    className="absolute bottom-0 inset-x-0 h-2.5"
                                    style={{ backgroundColor: token.primary }}
                                />
                            </button>
                        );
                    })}
                </div>
                <p className="text-[10px] text-white/45 mt-2 text-center">{vm.themeToken.name}</p>
            </div>

            <div className="p-4 border-b border-white/[0.03]">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                        <label className="text-sm font-bold text-white block">خلفية اللوحة</label>
                        <p className="text-[10px] text-white/40 mt-1">
                            {settingWiringHint('appearance.backgroundPreset')}
                        </p>
                    </div>
                    <SettingsCollapseToggle
                        expanded={vm.patternsExpanded}
                        hidden={vm.hiddenPatternCount}
                        onToggle={() => vm.setPatternsExpanded((v) => !v)}
                        label="الزخارف"
                    />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                    {vm.visiblePresets.map((preset) => {
                        const active = vm.activePreset === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => vm.selectBackgroundPreset(preset.id)}
                                className={`relative h-[4.5rem] rounded-xl overflow-hidden transition-colors ${SETTING_GLASS_INNER} ${
                                    active ? 'ring-2 ring-[#E6C673]/45' : 'hover:bg-white/[0.05]'
                                }`}
                                aria-pressed={active}
                            >
                                <div
                                    className="absolute inset-0"
                                    style={resolvePatternPreviewStyle(
                                        preset.id,
                                        vm.previewAccent,
                                        vm.previewBaseColor,
                                        vm.appearance.backgroundPatternOpacity,
                                        'dark',
                                    )}
                                />
                                <span className="absolute inset-x-0 bottom-0 z-10 px-1.5 py-1.5 text-[9px] font-bold text-white/80 text-center leading-tight bg-gradient-to-t from-black/75 to-transparent">
                                    {preset.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={vm.patternControlsDisabled ? 'opacity-40 pointer-events-none' : ''}>
                <SliderRow
                    label="حدة الزخرفة"
                    value={vm.appearance.backgroundPatternOpacity}
                    min={BACKGROUND_PATTERN_OPACITY_MIN}
                    max={BACKGROUND_PATTERN_OPACITY_MAX}
                    step={0.01}
                    debounceMs={72}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => vm.patchAppearance({ backgroundPatternOpacity: v })}
                />
            </div>

            <div className="p-4 border-b border-white/[0.03]">
                <SliderRow
                    label="كثافة الحاويات"
                    value={vm.appearance.glassOpacity}
                    min={GLASS_OPACITY_MIN}
                    max={GLASS_OPACITY_MAX}
                    step={0.01}
                    debounceMs={72}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => vm.patchAppearance({ glassOpacity: v })}
                />
            </div>

            <SettingRow
                icon={Square}
                label="إطار الحاويات"
                action={
                    <Toggle
                        label="إطار الحاويات"
                        checked={vm.appearance.homeContainerBorder !== false}
                        onChange={(v) => vm.patchAppearance({ homeContainerBorder: v })}
                    />
                }
            />
            <SettingRow
                icon={Shapes}
                label="شكل البطاقات"
                isLast
                action={
                    <Segmented
                        value={vm.appearance.shape}
                        options={SHAPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                        onChange={(v) => vm.selectShape(v as AppSettingsState['appearance']['shape'])}
                    />
                }
            />
        </SettingCard>
    );
}
