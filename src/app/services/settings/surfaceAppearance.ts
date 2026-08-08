import type { CSSProperties } from 'react';
import type { ThemeKey, ThemeMode } from '@/app/types/common';
import { resolveThemeMode } from './resolveThemeMode';
import { LAWYER_THEME_TOKENS } from './lawyerThemeTokens';
import {
    BACKGROUND_PRESET_MAP,
    normalizeBackgroundPreset,
    type BackgroundPresetId,
} from './backgroundPresets';
import type { AppearanceSettings } from './types';

export const BACKGROUND_PATTERN_OPACITY_MIN = 0.05;
export const BACKGROUND_PATTERN_OPACITY_MAX = 0.78;

/** كثافة/شفافية بطاقات لوحة القيادة — 0 شفاف، 1 كثيف */
export const GLASS_OPACITY_MIN = 0;
export const GLASS_OPACITY_MAX = 1;
export const GLASS_OPACITY_DEFAULT = 0.92;

export function normalizeGlassOpacity(raw: unknown): number {
    if (typeof raw !== 'number' || Number.isNaN(raw)) return GLASS_OPACITY_DEFAULT;
    return Math.min(GLASS_OPACITY_MAX, Math.max(GLASS_OPACITY_MIN, raw));
}

/** الوضع الفاتح — رمادي هادئ دافئ لتقليل الوهج */
export const LAWYER_LIGHT_SURFACE_BG = '#cfd3db';
export const LAWYER_LIGHT_SURFACE_NAME = 'فاتح هادئ';
export const LAWYER_LIGHT_TEXT = '#3f4654';

/** يُعاد ضبط القيم القديمة المحفوظة إلى النطاق الجديد */
function remapLegacyPatternOpacity(raw: number): number {
    if (raw > BACKGROUND_PATTERN_OPACITY_MAX) {
        return BACKGROUND_PATTERN_OPACITY_MIN + (raw - BACKGROUND_PATTERN_OPACITY_MIN) * 0.65;
    }
    return raw;
}

export function normalizeBackgroundPatternOpacity(raw: unknown): number {
    if (typeof raw !== 'number' || Number.isNaN(raw)) return 0.32;
    const remapped = remapLegacyPatternOpacity(raw);
    return Math.min(BACKGROUND_PATTERN_OPACITY_MAX, Math.max(BACKGROUND_PATTERN_OPACITY_MIN, remapped));
}

/** @deprecated blur removed — kept for legacy persisted settings */
export function normalizeBackgroundPatternBlur(_raw: unknown): number {
    return 0;
}

function svgDataUrl(svg: string): string {
    return `url("data:image/svg+xml,${encodeURIComponent(svg.trim())}")`;
}

function resolvePatternAccent(theme: ThemeKey, themeMode: ThemeMode): string {
    const token = LAWYER_THEME_TOKENS[theme] ?? LAWYER_THEME_TOKENS.gold;
    if (resolveThemeMode(themeMode) === 'light') {
        return token.secondary;
    }
    return token.primary;
}

function buildPresetSvg(presetId: BackgroundPresetId, accent: string): string | null {
    const preset = BACKGROUND_PRESET_MAP[presetId];
    if (!preset?.svg) return null;
    return preset.svg.replace(/\{\{ACCENT\}\}/g, accent);
}

/**
 * شفافية طبقة الزخرفة على البطاقة — تتبع المنزلق/المستوى بلا أرضية تلغي «خفيف».
 */
export function resolvePatternLayerOpacity(rawOpacity: unknown, themeMode: ThemeMode): number {
    let opacity = normalizeBackgroundPatternOpacity(rawOpacity);
    if (resolveThemeMode(themeMode) === 'light') {
        opacity = opacity * 0.88;
    }
    const scaled = opacity * 0.95;
    return Math.min(0.92, Math.max(0.05, scaled));
}

export function resolveLawyerSurfaceBaseColor(
    themeKey: ThemeKey,
    themeMode: ThemeMode,
    hasWallpaper: boolean,
): string {
    if (hasWallpaper) return 'transparent';
    if (resolveThemeMode(themeMode) === 'light') return LAWYER_LIGHT_SURFACE_BG;
    const token = LAWYER_THEME_TOKENS[themeKey] ?? LAWYER_THEME_TOKENS.gold;
    return token.bg;
}

type PatternAppearance = Pick<
    AppearanceSettings,
    'backgroundPreset' | 'backgroundPatternOpacity' | 'theme' | 'themeMode'
>;

export function resolvePatternOverlayStyle(
    appearance: PatternAppearance,
    enabled: boolean,
): CSSProperties | null {
    if (!enabled) return null;

    const presetId = normalizeBackgroundPreset(appearance.backgroundPreset);
    if (presetId === 'none') return null;

    const preset = BACKGROUND_PRESET_MAP[presetId];
    if (!preset) return null;

    const accent = resolvePatternAccent(appearance.theme, appearance.themeMode);
    const opacity = resolvePatternLayerOpacity(
        appearance.backgroundPatternOpacity,
        appearance.themeMode,
    );

    const svg = buildPresetSvg(presetId, accent);
    if (!svg) return null;

    return {
        backgroundImage: svgDataUrl(svg),
        backgroundSize: preset.backgroundSize,
        backgroundRepeat: preset.backgroundSize.includes('100%') ? 'no-repeat' : 'repeat',
        backgroundPosition: 'center',
        opacity,
    };
}

/**
 * زخرفة بطاقة رئيسية حيّة — شريط التخصيص يُترجم بوضوح على البطاقة
 * (معاينة الإعدادات أقوى؛ الحيّة تبقى تحت سقف يمنع طمس المحتوى).
 */
export function resolveHomeBlockPatternStyle(
    presetId: BackgroundPresetId,
    accent: string,
    patternOpacity = 0.32,
    themeMode: ThemeMode = 'dark',
): CSSProperties | null {
    if (presetId === 'none') return null;
    const preset = BACKGROUND_PRESET_MAP[presetId];
    if (!preset?.svg) return null;
    const svg = preset.svg.replace(/\{\{ACCENT\}\}/g, accent);
    const layerOpacity = resolvePatternLayerOpacity(patternOpacity, themeMode);
    return {
        backgroundImage: svgDataUrl(svg),
        backgroundSize: preset.backgroundSize,
        backgroundRepeat: preset.backgroundSize.includes('100%') ? 'no-repeat' : 'repeat',
        backgroundPosition: 'center',
        opacity: layerOpacity,
    };
}

/** معاينة مصغّرة في الإعدادات — فروق خفيف/متوسط/واضح واضحة */
export function resolvePatternPreviewStyle(
    presetId: BackgroundPresetId,
    accent: string,
    baseColor: string,
    patternOpacity = 0.32,
    themeMode: ThemeMode = 'dark',
): CSSProperties {
    if (presetId === 'none') {
        return { backgroundColor: baseColor };
    }
    const preset = BACKGROUND_PRESET_MAP[presetId];
    if (!preset) return { backgroundColor: baseColor };
    const svg = preset.svg?.replace(/\{\{ACCENT\}\}/g, accent);
    const normalized = normalizeBackgroundPatternOpacity(patternOpacity);
    const previewOpacity = 0.22 + normalized * 0.78;
    return {
        backgroundColor: baseColor,
        ...(svg
            ? {
                  backgroundImage: svgDataUrl(svg),
                  backgroundSize: preset.backgroundSize,
                  backgroundRepeat: preset.backgroundSize.includes('100%') ? 'no-repeat' : 'repeat',
                  backgroundPosition: 'center',
              }
            : {}),
        opacity: Math.min(1, previewOpacity),
    };
}
