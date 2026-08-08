import type { ThemeKey } from '@/app/types/common';
import { LAWYER_THEME_TOKENS } from './lawyerThemeTokens';
import type { AppearanceSettings } from './types';
import type { HomeBlockStyleOverride } from './homeLayout';

/** دمج المظهر العام مع تجاوزات القسم الواحد */
export function mergeBlockScopedAppearance(
    appearance: AppearanceSettings,
    override?: HomeBlockStyleOverride,
): Pick<AppearanceSettings, 'theme' | 'cardTheme' | 'patternTheme' | 'brandColor'> {
    const globalCardTheme = appearance.cardTheme ?? appearance.theme;
    const cardTheme = override?.cardTheme ?? globalCardTheme;
    /** لون النقش لا يتبع لون بطاقة القسم إلا إذا عُيِّن صراحةً على القسم */
    const patternTheme =
        override?.patternTheme ?? appearance.patternTheme ?? globalCardTheme;
    return {
        theme: appearance.theme,
        cardTheme,
        patternTheme,
        brandColor: appearance.brandColor,
    };
}

/** لون/لمسة بطاقات الرئيسية — منفصل عن خلفية اللوحة عند التخصيص */
export function resolveCardThemeKey(
    appearance: Pick<AppearanceSettings, 'theme' | 'cardTheme'>,
): ThemeKey {
    return appearance.cardTheme ?? appearance.theme;
}

export function resolveBoardThemeKey(appearance: Pick<AppearanceSettings, 'theme'>): ThemeKey {
    return appearance.theme;
}

/** لون نقوش/زخرفة البطاقة — منفصل عن لون خلفية البطاقة */
export function resolvePatternThemeKey(
    appearance: Pick<AppearanceSettings, 'theme' | 'cardTheme' | 'patternTheme'>,
): ThemeKey {
    return appearance.patternTheme ?? resolveCardThemeKey(appearance);
}

export function resolveCardThemePrimary(
    appearance: Pick<AppearanceSettings, 'theme' | 'cardTheme' | 'brandColor'>,
): string {
    const key = resolveCardThemeKey(appearance);
    const token = LAWYER_THEME_TOKENS[key] ?? LAWYER_THEME_TOKENS.gold;
    return token.primary;
}

export function resolvePatternThemePrimary(
    appearance: Pick<AppearanceSettings, 'theme' | 'cardTheme' | 'patternTheme' | 'brandColor'>,
): string {
    const key = resolvePatternThemeKey(appearance);
    const token = LAWYER_THEME_TOKENS[key] ?? LAWYER_THEME_TOKENS.gold;
    return token.primary;
}

export function resolveCardThemeBg(
    appearance: Pick<AppearanceSettings, 'theme' | 'cardTheme'>,
): string {
    const key = resolveCardThemeKey(appearance);
    const token = LAWYER_THEME_TOKENS[key] ?? LAWYER_THEME_TOKENS.gold;
    return token.bg;
}
