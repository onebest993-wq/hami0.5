import React from 'react';
import { RotateCcw } from '@/app/components/ui/icons/RotateCcw';
import {
    GLASS_TRANSPARENCY_PRESETS,
    PATTERN_INTENSITY_PRESETS,
    SHAPE_OPTIONS,
} from '@/app/services/settings';
import { Segmented } from '../settings-ui/index';
import { SettingsCollapseToggle } from '../components/SettingsCollapseToggle';
import type { AppearanceBlockCustomize } from './useAppearanceBlockCustomize';
import { AppearanceBlockPatternGrid } from './AppearanceBlockPatternGrid';
import { AppearanceBlockControlSection } from './AppearanceBlockControlSection';
import { AppearanceFramedContainerBorderRow } from './AppearanceFramedContainerBorderRow';
import { AppearanceThemeSwatchGrid } from './AppearanceThemeSwatchGrid';
import { useAppearanceBlockCollapse } from './useAppearanceBlockCollapse';
import type { ShapeKey } from '@/app/types/common';

export function AppearanceBlockStyleControls({
    customize,
    themePrimary,
}: {
    customize: AppearanceBlockCustomize;
    themePrimary: string;
}) {
    const disabled = customize.selectedCount === 0;
    const collapse = useAppearanceBlockCollapse(customize);

    return (
        <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
            <AppearanceBlockControlSection
                label="لون السطح"
                action={
                    <SettingsCollapseToggle
                        expanded={collapse.cardThemesExpanded}
                        hidden={collapse.hiddenCardThemeCount}
                        onToggle={() => collapse.setCardThemesExpanded((v) => !v)}
                        label="الألوان"
                    />
                }
            >
                <AppearanceThemeSwatchGrid
                    keys={collapse.visibleCardThemeKeys}
                    activeKey={customize.effective.cardThemeKey}
                    onSelect={customize.setCardTheme}
                />
            </AppearanceBlockControlSection>

            <AppearanceBlockControlSection
                label="نقش الخلفية"
                action={
                    <SettingsCollapseToggle
                        expanded={collapse.patternsExpanded}
                        hidden={collapse.hiddenPatternPresetCount}
                        onToggle={() => collapse.setPatternsExpanded((v) => !v)}
                        label="الزخارف"
                    />
                }
            >
                <AppearanceBlockPatternGrid
                    customize={customize}
                    themePrimary={themePrimary}
                    presets={collapse.visiblePresets}
                />
            </AppearanceBlockControlSection>

            <AppearanceBlockControlSection
                label="لون النقش"
                action={
                    <SettingsCollapseToggle
                        expanded={collapse.patternThemesExpanded}
                        hidden={collapse.hiddenPatternThemeCount}
                        onToggle={() => collapse.setPatternThemesExpanded((v) => !v)}
                        label="الألوان"
                    />
                }
            >
                <AppearanceThemeSwatchGrid
                    keys={collapse.visiblePatternThemeKeys}
                    activeKey={customize.effective.patternThemeKey}
                    onSelect={customize.setPatternTheme}
                />
            </AppearanceBlockControlSection>

            <AppearanceBlockControlSection label="حدة الزخرفة">
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
            </AppearanceBlockControlSection>

            <AppearanceBlockControlSection label="شفافية الحاويات">
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
            </AppearanceBlockControlSection>

            <AppearanceFramedContainerBorderRow
                checked={customize.effective.containerBorder}
                onChange={customize.setContainerBorder}
            />

            <AppearanceBlockControlSection label="شكل البطاقات">
                <Segmented
                    equal
                    value={customize.effective.shapeKey}
                    options={SHAPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                    onChange={(v) => customize.setShape(v as ShapeKey)}
                />
            </AppearanceBlockControlSection>

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
    );
}
