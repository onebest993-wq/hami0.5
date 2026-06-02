import type { SettingsNavItem } from './types';

export const SETTINGS_NAV: SettingsNavItem[] = [
    {
        id: 'appearance',
        label: 'المظهر',
        labelEn: 'Appearance',
        keywords: ['ثيم', 'لون', 'خط', 'زجاج', 'خلفية', 'شكل', 'theme', 'font', 'wallpaper'],
    },
    {
        id: 'notifications',
        label: 'الإشعارات',
        labelEn: 'Notifications',
        keywords: ['تنبيه', 'صوت', 'هدوء', 'push', 'قضية', 'تقويم', 'مجتمع'],
    },
    {
        id: 'security',
        label: 'الأمان',
        labelEn: 'Security',
        keywords: ['خصوصية', 'بصمة', 'قفل', 'تمويه', 'لقطة', 'biometric', 'blur'],
    },
    {
        id: 'workflow',
        label: 'سير العمل',
        labelEn: 'Workflow',
        keywords: ['محكمة', 'علامة', 'تلخيص', 'قائمة', 'شبكة', 'ذكاء', 'watermark'],
    },
    {
        id: 'data',
        label: 'البيانات',
        labelEn: 'Data',
        keywords: ['نسخ', 'سحابة', 'مزامنة', 'حفظ', 'تصدير', 'أرشيف', 'backup'],
    },
    {
        id: 'account',
        label: 'الحساب',
        labelEn: 'Account',
        keywords: ['ملف', 'لغة', 'حساب', 'profile', 'language'],
    },
    {
        id: 'advanced',
        label: 'متقدم',
        labelEn: 'Advanced',
        keywords: ['أداء', 'مطور', 'إعادة', 'reset', 'performance'],
    },
];

export const EXTENDED_THEMES = [
    { id: 'gold', color: '#E6C673', name: 'ذهبي ملكي' },
    { id: 'navy', color: '#3B82F6', name: 'كحلي قضائي' },
    { id: 'crimson', color: '#EF4444', name: 'قرمزي' },
    { id: 'emerald', color: '#10B981', name: 'زمردي' },
    { id: 'black', color: '#9CA3AF', name: 'فحمي' },
    { id: 'silver', color: '#E2E8F0', name: 'فضي' },
    { id: 'sky', color: '#38BDF8', name: 'سماوي' },
    { id: 'brown', color: '#D97706', name: 'بني' },
    { id: 'purple', color: '#A855F7', name: 'بنفسجي' },
    { id: 'bronze', color: '#CD7F32', name: 'برونزي' },
] as const;

export const SHAPE_OPTIONS = [
    { id: 'pill', label: 'كبسولة' },
    { id: 'rounded', label: 'مستدير' },
    { id: 'square', label: 'حاد' },
    { id: 'circle', label: 'دائري' },
] as const;

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
