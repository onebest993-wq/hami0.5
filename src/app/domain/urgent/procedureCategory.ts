/**
 * تصنيف ثنائي لنوع الطلب/الإجراء — يتحكم بمسار التظلم والتمييز.
 */
export type ProcedureCategory = 'petition_orders' | 'urgent_judiciary';

/** أوامر ولائية — مسار التظلم (3 أيام) ثم التمييز */
export const PETITION_ORDERS_DROPDOWN_OPTIONS = [
    'وضع إشارة عدم التصرف',
    'الحجز الاحتياطي',
    'منع السفر',
    'أمر ولائي آخر (تحديد يدوي)',
] as const;

/** دعاوى مستعجلة — تمييز مباشر (7 أيام) */
export const URGENT_JUDICIARY_DROPDOWN_OPTIONS = [
    'الكشف المستعجل وتثبيت الحالة',
    'سماع شاهد (خطر الفوات)',
    'الحراسة القضائية',
    'إعادة المرافق المقطوعة',
    'الاستئذان بالتنفيذ على نفقة الخصم',
    'استكتاب وإقرار بالسندات',
] as const;

export const PROCEDURE_CATEGORY_GROUP_LABELS: Record<ProcedureCategory, string> = {
    petition_orders: 'أوامر ولائية',
    urgent_judiciary: 'دعاوى مستعجلة',
};

export const PETITION_ORDER_MANUAL_OPTION = PETITION_ORDERS_DROPDOWN_OPTIONS[3];

const URGENT_JUDICIARY_LEGACY_ALIASES = [
    'سماع شاهد يخشى فوات فرصة الاستشهاد به',
    'وضع الأموال تحت الحراسة القضائية',
    'إعادة المرافق المقطوعة تعسفاً (ماء/كهرباء/هاتف)',
    'الاستئذان بالتنفيذ أو العمل على نفقة الخصم',
    'استكتاب السندات العادية والإقرار بالبصمة أو التوقيع',
    'الكشف العقاري',
    'تثبيت حالة',
    'رفع التجاوز',
    'طرد الغاصب المستعجل',
] as const;

const URGENT_JUDICIARY_LOOKUP = new Set<string>([
    ...URGENT_JUDICIARY_DROPDOWN_OPTIONS,
    ...URGENT_JUDICIARY_LEGACY_ALIASES,
]);

const PETITION_ORDERS_LEGACY_ALIASES = [
    'وضع إشارة عدم تصرف/إشارة دعوى',
    'إيقاف الإجراءات التنفيذية/المزايدة',
    'إيقاف صرف مبالغ/خطاب ضمان',
    'الاستئخار المؤقت',
] as const;

const PETITION_ORDERS_LOOKUP = new Set<string>([
    ...PETITION_ORDERS_DROPDOWN_OPTIONS,
    ...PETITION_ORDERS_LEGACY_ALIASES,
]);

export function getUnifiedActionTypeOptions(): string[] {
    return [...PETITION_ORDERS_DROPDOWN_OPTIONS, ...URGENT_JUDICIARY_DROPDOWN_OPTIONS];
}

export function isPetitionOrdersCategory(
    storedCategory: unknown,
    specificActionType: string,
): boolean {
    return resolveProcedureCategory(storedCategory, specificActionType) === 'petition_orders';
}

export function isUrgentJudiciaryCategory(
    storedCategory: unknown,
    specificActionType: string,
): boolean {
    return resolveProcedureCategory(storedCategory, specificActionType) === 'urgent_judiciary';
}

/** يُحفظ على الإضبارة عند الإنشاء؛ يُستنتج للبيانات القديمة من specificActionType */
export function resolveProcedureCategory(
    storedCategory: unknown,
    specificActionType: string,
): ProcedureCategory {
    if (storedCategory === 'petition_orders' || storedCategory === 'urgent_judiciary') {
        return storedCategory;
    }

    const t = String(specificActionType ?? '').trim();
    if (!t) return 'petition_orders';

    if (URGENT_JUDICIARY_LOOKUP.has(t)) return 'urgent_judiciary';

    if (PETITION_ORDERS_LOOKUP.has(t) || t.includes('إشارة')) return 'petition_orders';

    const urgentKeywords = [
        'كشف',
        'تثبيت',
        'شاهد',
        'حراسة',
        'استئذان',
        'نفقة الخصم',
        'استكتاب',
        'البصمة',
        'المرافق',
    ];
    if (urgentKeywords.some((k) => t.includes(k))) return 'urgent_judiciary';

    const petitionKeywords = ['حجز', 'منع سفر', 'منع السفر', 'ولائي'];
    if (petitionKeywords.some((k) => t.includes(k))) return 'petition_orders';

    return 'petition_orders';
}

export function cassationAdvisoryHint(category: ProcedureCategory): string {
    if (category === 'urgent_judiciary') {
        return 'القرار قابل للطعن تمييزاً مباشراً أمام محكمة الاستئناف بصفتها التمييزية خلال 7 أيام من اليوم التالي للتبليغ';
    }
    return 'قرار التظلم قابل للطعن تمييزاً أمام محكمة الاستئناف بصفتها التمييزية خلال 7 أيام من اليوم التالي للتبليغ';
}
