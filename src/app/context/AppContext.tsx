import React, { createContext, useContext } from 'react';

/**
 * سياق القشرة المشتركة — قيمة ثابتة عمداً.
 *
 * كان هذا المزوّد يلفّ الشجرة كاملة ويحمل حالات وهمية (`consultations`/`courtStats`)
 * ومُحدِّثات بلا مستهلك. الإحصائيات والاستشارات في مقر القيادة تُجلب من BFF.
 *
 * المستهلك الفعلي: `SharedComponents` يقرأ `themeConfig` للألوان والخلفية.
 */

export const THEME = {
    gold: '#E6C673',
    dark: '#05060D',
    cardBg: '#1A1E2E',
    glass: 'rgba(26, 30, 46, 0.8)',
} as const;

export interface ShellThemeConfig {
    mode: 'dark' | 'light' | 'auto';
    accentColor: string;
    cardColor: string;
    glowColor: string;
    shape: 'square' | 'rounded' | 'pill' | 'circle';
    backgroundImage: string | null;
    overlayOpacity: number;
    fontSize: 'sm' | 'md' | 'lg';
}

interface AppContextType {
    accentColor: string;
    themeConfig: ShellThemeConfig;
}

const SHELL_THEME: ShellThemeConfig = {
    mode: 'dark',
    accentColor: THEME.gold,
    cardColor: 'rgba(26, 30, 46, 0.6)',
    glowColor: THEME.gold,
    shape: 'rounded',
    backgroundImage: null,
    overlayOpacity: 0.7,
    fontSize: 'md',
};

const SHELL_CONTEXT_VALUE: AppContextType = Object.freeze({
    accentColor: SHELL_THEME.accentColor,
    themeConfig: SHELL_THEME,
});

const AppContext = createContext<AppContextType>(SHELL_CONTEXT_VALUE);

export const AppProvider = ({ children }: { children: React.ReactNode }) => (
    <AppContext.Provider value={SHELL_CONTEXT_VALUE}>{children}</AppContext.Provider>
);

export const useAppTheme = () => useContext(AppContext);
