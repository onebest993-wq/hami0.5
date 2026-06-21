import React from 'react';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import { normalizeBackgroundPreset } from '@/app/services/settings/backgroundPresets';
import {
    normalizeBackgroundPatternOpacity,
    resolveLawyerSurfaceBaseColor,
    resolvePatternPreviewStyle,
} from '@/app/services/settings/surfaceAppearance';
import { resolveHomeBlockAccent } from '@/app/services/settings/resolveHomeBlockStyle';

export function HomeBlockPatternOverlay({
    override,
    themePrimary,
}: {
    override?: HomeBlockStyleOverride;
    themePrimary: string;
}) {
    const { settings } = useLawyerSettings();
    const presetId = override?.backgroundPreset;
    if (!presetId || presetId === 'none') return null;

    const accent = resolveHomeBlockAccent(override, themePrimary);
    const patternOpacity =
        override?.patternOpacity !== undefined
            ? normalizeBackgroundPatternOpacity(override.patternOpacity)
            : normalizeBackgroundPatternOpacity(settings.appearance.backgroundPatternOpacity);
    const patternStyle = resolvePatternPreviewStyle(
        normalizeBackgroundPreset(presetId),
        accent,
        resolveLawyerSurfaceBaseColor(
            settings.appearance.theme,
            settings.appearance.themeMode,
            Boolean(settings.appearance.wallpaper),
        ),
        patternOpacity,
        settings.appearance.themeMode,
    );

    return (
        <div
            className="absolute inset-0 pointer-events-none rounded-[inherit] z-0"
            style={patternStyle}
            aria-hidden
        />
    );
}
