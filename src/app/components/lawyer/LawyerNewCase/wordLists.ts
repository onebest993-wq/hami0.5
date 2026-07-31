export type JurisdictionId = 'civil' | 'criminal' | 'personal';

export interface JurisdictionItem {
    id: JurisdictionId;
    title: string;
}

export const JURISDICTIONS: JurisdictionItem[] = [
    { id: 'civil', title: 'القضاء المدني' },
    { id: 'criminal', title: 'القضاء الجزائي' },
    { id: 'personal', title: 'الأحوال الشخصية' },
];

export const FIXED_FEE_KEYWORDS = [
    'مرور',
    'مسيل',
    'مجرى',
    'شرب',
    'تعلي',
    'سفل',
    'شرفات',
    'نوافذ',
    'حدود',
    'جدران',
    'استملاك',
];

/** كلمات ممنوعة في كل الاختصاصات (عدا الجزائي المنفصل). */
export const UNIVERSAL_BLOCKED_WORDS = [
    'جنح',
    'جنايات',
    'تحقيق',
    'جزاء',
    'جزائية',
    'إداري',
    'إدارية',
    'موظفين',
    'قضاء موظفين',
];

/** كلمات تُرفض في القضاء المدني فقط — مسموحة في الأحوال الشخصية. */
export const CIVIL_ONLY_BLOCKED_WORDS = ['أحوال', 'شرعي', 'شرعية', 'شخصية'];

export const BLOCKED_WORDS = [...UNIVERSAL_BLOCKED_WORDS, ...CIVIL_ONLY_BLOCKED_WORDS];
