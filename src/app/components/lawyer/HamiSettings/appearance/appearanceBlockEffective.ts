import type { HomeBlockStyleOverride, HomeBlockShape } from '@/app/services/settings/homeLayout';
import type { AppearanceSettings } from '@/app/services/settings/types';
import {
    opacityToGlassTransparency,
    opacityToPatternIntensity,
    normalizeBackgroundPreset,
} from '@/app/services/settings';
import { resolveCardThemeKey, resolvePatternThemeKey } from '@/app/services/settings/themeResolve';
import { shapeKeyToHomeBlockShape } from '@/app/services/settings/resolveHomeBlockStyle';
import type { ShapeKey } from '@/app/types/common';

function homeBlockShapeToShapeKey(shape: HomeBlockShape): ShapeKey {
    return shape === 'sharp' ? 'square' : shape;
}

export const BLOCK_APPEARANCE_RESET: Partial<HomeBlockStyleOverride> = {
    cardTheme: undefined,
    patternTheme: undefined,
    backgroundPreset: undefined,
    patternOpacity: undefined,
    glassOpacity: undefined,
    containerBorder: undefined,
    shape: undefined,
    accentColor: undefined,
};

const APPEARANCE_OVERRIDE_KEYS = Object.keys(BLOCK_APPEARANCE_RESET) as (keyof HomeBlockStyleOverride)[];

export function blockHasAppearanceOverride(override?: HomeBlockStyleOverride): boolean {
    if (!override) return false;
    return APPEARANCE_OVERRIDE_KEYS.some((key) => override[key] !== undefined);
}

export function resolveEffectiveForBlock(
    appearance: AppearanceSettings,
    override?: HomeBlockStyleOverride,
) {
    return {
        cardThemeKey: override?.cardTheme ?? resolveCardThemeKey(appearance),
        patternThemeKey: override?.patternTheme ?? resolvePatternThemeKey(appearance),
        backgroundPreset:
            override?.backgroundPreset ?? normalizeBackgroundPreset(appearance.backgroundPreset),
        patternIntensity: opacityToPatternIntensity(
            override?.patternOpacity ?? appearance.backgroundPatternOpacity,
        ),
        glassTransparency: opacityToGlassTransparency(
            override?.glassOpacity ?? appearance.glassOpacity,
        ),
        containerBorder:
            override?.containerBorder !== undefined
                ? override.containerBorder
                : appearance.homeContainerBorder !== false,
        glassOpacity: override?.glassOpacity ?? appearance.glassOpacity,
        patternOpacity: override?.patternOpacity ?? appearance.backgroundPatternOpacity,
        blockShape: override?.shape ?? shapeKeyToHomeBlockShape(appearance.shape),
        shapeKey: homeBlockShapeToShapeKey(
            override?.shape ?? shapeKeyToHomeBlockShape(appearance.shape),
        ),
    };
}
