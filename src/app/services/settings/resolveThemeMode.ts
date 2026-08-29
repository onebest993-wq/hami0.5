import type { ThemeMode } from '@/app/types/common';

/** Pure theme-mode resolve — kept out of apply.ts so appearance-lite never imports boot-ui. */
export function resolveThemeMode(themeMode: ThemeMode): 'light' | 'dark' {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    /* WebView الأصلي يتبع ثيم النظام الفاتح فيومض الواجهة — الإقلاع دائماً داكن */
    if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-hami-native') === '1') {
        return 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}
