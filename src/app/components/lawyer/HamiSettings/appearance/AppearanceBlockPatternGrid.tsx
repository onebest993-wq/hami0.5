import React from 'react';
import {
    LAWYER_THEME_TOKENS,
    resolvePatternPreviewStyle,
    resolveCardThemeBg,
    type BackgroundPresetId,
} from '@/app/services/settings';
import { SETTING_GLASS_INNER } from '../settings-ui/index';
import { AppearancePressButton } from './AppearancePressButton';
import type { AppearanceBlockCustomize } from './useAppearanceBlockCustomize';

type Preset = { id: BackgroundPresetId; label: string };

export function AppearanceBlockPatternGrid({
    customize,
    themePrimary,
    presets,
}: {
    customize: AppearanceBlockCustomize;
    themePrimary: string;
    presets: readonly Preset[];
}) {
    return (
        <div className="hami-appearance-pattern-grid">
            {presets.map((preset) => {
                const active = customize.effective.backgroundPreset === preset.id;
                const accent =
                    LAWYER_THEME_TOKENS[customize.effective.patternThemeKey]?.primary ?? themePrimary;
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
                        className={`relative rounded-lg overflow-hidden min-h-[44px] ${SETTING_GLASS_INNER} ${
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
    );
}
