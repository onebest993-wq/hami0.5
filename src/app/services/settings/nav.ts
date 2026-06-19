import type { SettingsNavItem } from './types';

/** أقسام الإعدادات المعروضة — فقط ما يطابق التطبيق ويُستخدم فعلياً. */
export const SETTINGS_NAV: SettingsNavItem[] = [
    {
        id: 'appearance',
        label: 'المنظر',
        labelEn: 'Appearance',
        keywords: ['لون', 'ثيم', 'خلفية', 'شكل', 'خط', 'حركة', 'theme', 'wallpaper', 'motion'],
    },
    {
        id: 'security',
        label: 'الأمان',
        labelEn: 'Security',
        keywords: ['خصوصية', 'بصمة', 'قفل', 'تمويه', 'biometric', 'blur'],
    },
    {
        id: 'data',
        label: 'البيانات',
        labelEn: 'Data',
        keywords: ['نسخ', 'حفظ', 'تصدير', 'أرشيف', 'backup', 'استيراد'],
    },
    {
        id: 'account',
        label: 'الحساب',
        labelEn: 'Account',
        keywords: ['ملف', 'حساب', 'profile', 'دعم', 'خصوصية'],
    },
];

export const FONT_PRESETS = [
    { id: 'small' as const, label: 'صغير', px: 14 },
    { id: 'medium' as const, label: 'متوسط', px: 16 },
    { id: 'large' as const, label: 'كبير', px: 18 },
    { id: 'xlarge' as const, label: 'واضح', px: 20 },
];

export const AUTO_LOCK_OPTIONS = [
    { value: 0, label: 'معطّل' },
    { value: 1, label: 'دقيقة' },
    { value: 5, label: '5 دقائق' },
    { value: 15, label: '15 دقيقة' },
    { value: 30, label: '30 دقيقة' },
    { value: 60, label: 'ساعة' },
] as const;

export const IRAQ_COURTS_SAMPLE = [
    '',
    'محكمة التمييز',
    'محكمة الاستئناف',
    'محكمة بداءة',
    'محكمة الأحوال الشخصية',
    'محكمة التنفيذ',
];

/** @deprecated kept for migration — no longer shown in settings UI */
export const EXTENDED_THEMES = [
    { id: 'gold', color: '#E6C673', name: 'ذهبي ملكي' },
    { id: 'navy', color: '#3B82F6', name: 'كحلي قضائي' },
] as const;

export const SHAPE_OPTIONS = [
    { id: 'pill', label: 'كبسولة' },
    { id: 'rounded', label: 'مستدير' },
    { id: 'square', label: 'حاد' },
    { id: 'circle', label: 'دائري' },
] as const;

export const IRAQ_GOVERNORATES = [
    '',
    'بغداد',
    'البصرة',
    'نينوى',
    'أربيل',
    'النجف',
    'كربلاء',
    'ذي قار',
    'الأنبار',
    'كركوك',
    'ديالى',
];
