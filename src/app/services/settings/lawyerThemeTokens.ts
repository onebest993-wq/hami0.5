import type { ThemeKey } from '@/app/types/common';

/** Lawyer dashboard palette — kept in sync with LawyerShared THEMES. */
export const LAWYER_THEME_TOKENS: Record<
    ThemeKey,
    { primary: string; secondary: string; bg: string; name: string }
> = {
    gold: { name: 'الذهبي الملكي', primary: '#E6C673', secondary: '#D4B360', bg: '#0B1021' },
    navy: { name: 'الكحلي الرسمي', primary: '#3B82F6', secondary: '#1D4ED8', bg: '#0F172A' },
    crimson: { name: 'الأحمر القرمزي', primary: '#EF4444', secondary: '#B91C1C', bg: '#280505' },
    emerald: { name: 'الأخضر الزمردي', primary: '#10B981', secondary: '#047857', bg: '#022C22' },
    black: { name: 'الأسود الفاحم', primary: '#9CA3AF', secondary: '#4B5563', bg: '#000000' },
    silver: { name: 'الفضي المعدني', primary: '#E2E8F0', secondary: '#94A3B8', bg: '#1E293B' },
    sky: { name: 'الأزرق السماوي', primary: '#38BDF8', secondary: '#0EA5E9', bg: '#0C4A6E' },
    brown: { name: 'البني الجلدي', primary: '#D97706', secondary: '#B45309', bg: '#451A03' },
    purple: { name: 'البنفسجي الداكن', primary: '#A855F7', secondary: '#7E22CE', bg: '#3B0764' },
    bronze: { name: 'البرونزي العتيق', primary: '#CD7F32', secondary: '#A0522D', bg: '#291508' },
};

export function applyLawyerThemeCssVars(themeKey: ThemeKey): void {
    const t = LAWYER_THEME_TOKENS[themeKey] ?? LAWYER_THEME_TOKENS.gold;
    const root = document.documentElement;
    root.style.setProperty('--hami-primary', t.primary);
    root.style.setProperty('--hami-secondary', t.secondary);
    root.style.setProperty('--hami-surface-bg', t.bg);
}
