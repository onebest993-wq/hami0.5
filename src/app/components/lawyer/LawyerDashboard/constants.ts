export const CAIRO_FONT_STYLE = { fontFamily: 'Cairo, sans-serif' } as const;
export const HEADER_BTN_BG_STYLE = { backgroundColor: 'rgba(15, 23, 42, 0.5)' } as const;

export { LawyerLazyFallback as LAWYER_LAZY_FALLBACK } from './LazyFallback';

export const LAWYER_SETTINGS_DEFAULTS = {
    themeMode: 'dark',
    theme: 'gold',
    shape: 'pill',
    language: 'ar',
    notifications: true,
    biometric: false,
    glassOpacity: 0.85,
    brandColor: '#E6C673',
    fontSize: 16,
    viewMode: 'list',
    privacyBlur: true,
    watermark: false,
    smartAlerts: true,
    autoSummary: false,
} as const;
