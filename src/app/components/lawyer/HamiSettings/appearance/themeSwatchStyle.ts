import type { CSSProperties } from 'react';
import type { ThemeKey } from '@/app/types/common';
import { LAWYER_THEME_TOKENS } from '@/app/services/settings';

/** معاينة واضحة — اللون الأساسي والخلفية كما في الثيم الفعلي */
export function resolveThemeSwatchSurface(token: { primary: string; bg: string }): string {
    return token.primary;
}

export function resolveThemeSwatchStyle(themeKey: ThemeKey): CSSProperties {
    const token = LAWYER_THEME_TOKENS[themeKey] ?? LAWYER_THEME_TOKENS.gold;
    return {
        backgroundColor: token.bg,
        backgroundImage: `linear-gradient(145deg, ${token.primary} 0%, color-mix(in srgb, ${token.primary} 62%, ${token.bg}) 38%, ${token.bg} 100%)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${token.primary} 48%, rgba(255,255,255,0.14))`,
    };
}
