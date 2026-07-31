import type { ShapeKey, ThemeKey } from '@/app/types/common';
import { LAWYER_THEME_TOKENS, normalizeThemeKey } from '@/app/services/settings/lawyerThemeTokens';

/** مطابق لـ LawyerShared.THEMES — مصدر الحقيقة الألوان في lawyerThemeTokens */
export const THEMES = LAWYER_THEME_TOKENS;

export const SHAPES: Record<ShapeKey, string> = {
    square: 'rounded-none',
    rounded: 'rounded-xl',
    pill: 'rounded-2xl',
    circle: 'rounded-[3rem]',
};

function normalizeShapeKey(raw: unknown): ShapeKey {
    if (typeof raw === 'string' && raw in SHAPES) return raw as ShapeKey;
    return 'pill';
}

/** أنماط الثيم/الشكل للوحة المحامي — خارج LawyerShared حتى لا تسحب app-workspace */
export function useThemeStyles(activeTheme: ThemeKey, activeShape: ShapeKey) {
    const themeKey = normalizeThemeKey(activeTheme);
    const shapeKey = normalizeShapeKey(activeShape);
    const theme = THEMES[themeKey];
    const shapeClass = SHAPES[shapeKey];

    return {
        theme,
        shapeClass,
        glass: `bg-[${theme.bg}]/60 backdrop-blur-md border border-[${theme.primary}]/20`,
    };
}
