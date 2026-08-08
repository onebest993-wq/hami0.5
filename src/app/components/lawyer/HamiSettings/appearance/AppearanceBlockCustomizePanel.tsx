import React, { useId, useMemo, useState } from 'react';
import { RotateCcw } from '@/app/components/ui/lucideIcons';
import {
    BACKGROUND_PRESETS,
    GLASS_TRANSPARENCY_PRESETS,
    LAWYER_THEME_TOKENS,
    PATTERN_INTENSITY_PRESETS,
    SHAPE_OPTIONS,
    resolvePatternPreviewStyle,
    resolveCardThemeBg,
} from '@/app/services/settings';
import { Segmented, Toggle, SETTING_GLASS_INNER } from '../settings-ui';
import { SettingsCollapseToggle } from '../components/SettingsCollapseToggle';
import { pickCollapsedItems } from '../components/collapseList';
import {
    APPEARANCE_THEME_KEYS,
    PATTERN_COLLAPSED_COUNT,
    THEME_COLLAPSED_COUNT,
} from './appearanceConstants';
import type { AppearanceBlockCustomize } from './useAppearanceBlockCustomize';
import { AppearanceThemeSwatch } from './AppearanceThemeSwatch';
import { AppearancePressButton } from './AppearancePressButton';
import type { ThemeKey, ShapeKey } from '@/app/types/common';

export function AppearanceBlockCustomizePanel({
    customize,
    themePrimary,
}: {
    customize: AppearanceBlockCustomize;
    themePrimary: string;
}) {
    const blockListId = useId();
    const disabled = customize.selectedCount === 0;
    const [patternsExpanded, setPatternsExpanded] = useState(false);
    const [cardThemesExpanded, setCardThemesExpanded] = useState(false);
    const [patternThemesExpanded, setPatternThemesExpanded] = useState(false);

    const visibleCardThemeKeys = useMemo(
        () =>
            pickCollapsedItems(
                APPEARANCE_THEME_KEYS,
                THEME_COLLAPSED_COUNT,
                cardThemesExpanded,
                customize.effective.cardThemeKey,
            ),
        [cardThemesExpanded, customize.effective.cardThemeKey],
    );
    const hiddenCardThemeCount = Math.max(0, APPEARANCE_THEME_KEYS.length - THEME_COLLAPSED_COUNT);

    const visiblePatternThemeKeys = useMemo(
        () =>
            pickCollapsedItems(
                APPEARANCE_THEME_KEYS,
                THEME_COLLAPSED_COUNT,
                patternThemesExpanded,
                customize.effective.patternThemeKey,
            ),
        [customize.effective.patternThemeKey, patternThemesExpanded],
    );
    const hiddenPatternThemeCount = Math.max(0, APPEARANCE_THEME_KEYS.length - THEME_COLLAPSED_COUNT);

    const visiblePresets = useMemo(
        () =>
            pickCollapsedItems(
                BACKGROUND_PRESETS,
                PATTERN_COLLAPSED_COUNT,
                patternsExpanded,
                BACKGROUND_PRESETS.find((p) => p.id === customize.effective.backgroundPreset),
            ),
        [customize.effective.backgroundPreset, patternsExpanded],
    );
    const hiddenPatternPresetCount = Math.max(0, BACKGROUND_PRESETS.length - PATTERN_COLLAPSED_COUNT);

    return (
        <div className="space-y-4" data-testid="appearance-block-customize-panel">
            <div>
                <p id={blockListId} className="text-[11px] font-bold text-white/80 mb-2">
                    الأقسام {customize.selectedCount > 0 ? `(${customize.selectedCount})` : ''}
                </p>
                <div
                    className="flex flex-wrap gap-1.5"
                    role="listbox"
                    aria-multiselectable
                    aria-labelledby={blockListId}
                >
                    <AppearancePressButton
                        type="button"
                        data-testid="appearance-block-select-all"
                        aria-pressed={customize.isAllSelected}
                        aria-label="تحديد كل الأقسام"
                        onPress={customize.toggleSelectAll}
                        className={`min-h-[40px] px-3.5 py-2 rounded-xl text-[10px] font-extrabold border-2 border-dashed touch-manipulation shrink-0 ${
                            customize.isAllSelected
                                ? 'border-[#E6C673]/70 bg-[#E6C673]/22 text-[#F7EBC4] shadow-[0_0_0_1px_rgba(230,198,115,0.2)]'
                                : 'border-[#E6C673]/35 bg-[#E6C673]/08 text-[#E6C673] hover:bg-[#E6C673]/14'
                        }`}
                    >
                        الكل
                    </AppearancePressButton>
                    {customize.blocks.map((id) => {
                        const active = customize.isSelected(id);
                        return (
                            <AppearancePressButton
                                key={id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                data-testid={`appearance-block-pick-${id}`}
                                onPress={() => customize.toggleBlock(id)}
                                className={`min-h-[40px] px-3 py-2 rounded-xl text-[10px] font-bold border touch-manipulation ${
                                    active
                                        ? 'border-[#E6C673]/50 bg-[#E6C673]/15 text-white'
                                        : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.05]'
                                }`}
                            >
                                {customize.blockLabel(id)}
                            </AppearancePressButton>
                        );
                    })}
                </div>
            </div>

            <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
                <BlockControlSection
                    label="لون السطح"
                    action={
                            <SettingsCollapseToggle
                                expanded={cardThemesExpanded}
                                hidden={hiddenCardThemeCount}
                                onToggle={() => setCardThemesExpanded((v) => !v)}
                                label="الألوان"
                            />
                        }
                    >
                        <ThemeSwatchGrid
                            keys={visibleCardThemeKeys}
                            activeKey={customize.effective.cardThemeKey}
                            onSelect={customize.setCardTheme}
                        />
                    </BlockControlSection>

                    <BlockControlSection
                        label="نقش الخلفية"
                        action={
                            <SettingsCollapseToggle
                                expanded={patternsExpanded}
                                hidden={hiddenPatternPresetCount}
                                onToggle={() => setPatternsExpanded((v) => !v)}
                                label="الزخارف"
                            />
                        }
                    >
                        <div className="hami-appearance-pattern-grid">
                            {visiblePresets.map((preset) => {
                                const active = customize.effective.backgroundPreset === preset.id;
                                const accent =
                                    LAWYER_THEME_TOKENS[customize.effective.patternThemeKey]?.primary ??
                                    themePrimary;
                                const base = resolveCardThemeBg({
                                    theme: customize.appearance.theme,
                                    cardTheme: customize.effective.cardThemeKey,
                                });
                                return (
                                    <AppearancePressButton
                                        key={preset.id}
                                        type="button"
                                        aria-label={preset.label}
                                        aria-pressed={active}
                                        onPress={() => customize.setBackgroundPreset(preset.id)}
                                        className={`relative rounded-lg overflow-hidden ${SETTING_GLASS_INNER} ${
                                            active ? 'ring-2 ring-[#E6C673]/45' : ''
                                        }`}
                                    >
                                        <div
                                            className="absolute inset-0"
                                            style={resolvePatternPreviewStyle(
                                                preset.id,
                                                accent,
                                                base,
                                                customize.effective.patternOpacity,
                                                'dark',
                                            )}
                                        />
                                        <span className="absolute inset-x-0 bottom-0 z-10 px-1 py-1 text-[8px] font-bold text-white/75 text-center bg-gradient-to-t from-black/80 to-transparent leading-tight">
                                            {preset.label}
                                        </span>
                                    </AppearancePressButton>
                                );
                            })}
                        </div>
                    </BlockControlSection>

                    <BlockControlSection
                        label="لون النقش"
                        action={
                            <SettingsCollapseToggle
                                expanded={patternThemesExpanded}
                                hidden={hiddenPatternThemeCount}
                                onToggle={() => setPatternThemesExpanded((v) => !v)}
                                label="الألوان"
                            />
                        }
                    >
                        <ThemeSwatchGrid
                            keys={visiblePatternThemeKeys}
                            activeKey={customize.effective.patternThemeKey}
                            onSelect={customize.setPatternTheme}
                        />
                    </BlockControlSection>

                    <BlockControlSection label="حدة الزخرفة">
                        <p className="text-[10px] text-white/45 mb-2 leading-relaxed">
                            خفيف: بالكاد ظاهرة · متوسط: متوازنة · واضح: زخرفة أوضح
                        </p>
                        <Segmented
                            equal
                            value={customize.effective.patternIntensity}
                            options={PATTERN_INTENSITY_PRESETS.map((o) => ({
                                value: o.id,
                                label: o.label,
                            }))}
                            onChange={(v) =>
                                customize.setPatternIntensity(
                                    v as (typeof PATTERN_INTENSITY_PRESETS)[number]['id'],
                                )
                            }
                        />
                    </BlockControlSection>

                    <BlockControlSection label="شفافية الحاويات">
                        <p className="text-[10px] text-white/45 mb-2 leading-relaxed">
                            خفيف: رؤية الخلفية بوضوح · متوسط: شفافية متوازنة · واضح: سطح أوضح
                        </p>
                        <Segmented
                            equal
                            value={customize.effective.glassTransparency}
                            options={GLASS_TRANSPARENCY_PRESETS.map((o) => ({
                                value: o.id,
                                label: o.label,
                            }))}
                            onChange={(v) =>
                                customize.setGlassTransparency(
                                    v as (typeof GLASS_TRANSPARENCY_PRESETS)[number]['id'],
                                )
                            }
                        />
                    </BlockControlSection>

                    <div className="hami-appearance-framed-toggle-row mb-3">
                        <span className="text-[11px] font-bold text-white/80">إطار الحاويات</span>
                        <Toggle
                            label="إطار الحاويات"
                            checked={customize.effective.containerBorder}
                            onChange={customize.setContainerBorder}
                        />
                    </div>

                    <BlockControlSection label="شكل البطاقات">
                        <Segmented
                            equal
                            value={customize.effective.shapeKey}
                            options={SHAPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                            onChange={(v) => customize.setShape(v as ShapeKey)}
                        />
                    </BlockControlSection>

                    {customize.hasCustomOverride ? (
                        <button
                            type="button"
                            onClick={customize.resetBlock}
                            className="flex w-full items-center justify-center gap-2 min-h-[44px] rounded-xl border border-white/10 text-[11px] font-bold text-white/65 hover:bg-white/[0.04] touch-manipulation"
                        >
                            <RotateCcw size={14} aria-hidden />
                            {customize.selectedCount > 1
                                ? 'إعادة الأقسام المحددة للمظهر العام'
                                : 'إعادة القسم للمظهر العام'}
                        </button>
                    ) : null}
                </div>
        </div>
    );
}

function BlockControlSection({
    label,
    action,
    children,
}: {
    label: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="mb-3 last:mb-0">
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[11px] font-bold text-white/80">{label}</p>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {children}
        </div>
    );
}

function ThemeSwatchGrid({
    keys,
    activeKey,
    onSelect,
}: {
    keys: ThemeKey[];
    activeKey: string;
    onSelect: (key: ThemeKey) => void;
}) {
    return (
        <div className="hami-appearance-theme-grid hami-appearance-theme-grid--compact">
            {keys.map((key) => (
                <AppearanceThemeSwatch
                    key={key}
                    themeKey={key}
                    active={activeKey === key}
                    onSelect={onSelect}
                    size="sm"
                />
            ))}
        </div>
    );
}
