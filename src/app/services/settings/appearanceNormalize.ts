import type { Language } from '@/app/types/common';
import type { AppearanceSettings } from './types';
import type { ColorApplyTarget } from './surfaceApplyTarget';
/** الواجهة عربية RTL فقط — أي لغة محفوظة قديمة تُوحَّد */
export function normalizeAppearanceLanguage(_raw: unknown): Language {
    return 'ar';
}

/** blur الزخرفة غير مربوط بالعرض حالياً */
export function normalizeAppearancePatternBlur(_raw: unknown): number {
    return 0;
}

/** يوحّد الإعدادات القديمة — لون واحد للوحة والبطاقات، زخرفة على البطاقات فقط */
export function collapseLegacyThemeApplyTarget(
    appearance: Pick<AppearanceSettings, 'theme' | 'cardTheme' | 'patternTheme' | 'themeApplyTarget'>,
): {
    themeApplyTarget: ColorApplyTarget;
    cardTheme: AppearanceSettings['theme'];
    patternTheme: AppearanceSettings['theme'];
} {
    const cardTheme = appearance.cardTheme ?? appearance.theme;
    const patternTheme = appearance.patternTheme ?? cardTheme;

    return { themeApplyTarget: 'board', cardTheme, patternTheme };
}
