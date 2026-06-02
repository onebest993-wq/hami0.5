/**
 * تصنيف ثنائي لنوع الطلب/الإجراء — يتحكم بمسار التظلم والتمييز.
 */
export type ProcedureCategory = 'petition_orders' | 'urgent_judiciary';

export const PETITION_ORDERS_DROPDOWN_OPTIONS = [
    'وضع إشارة عدم التصرف',
    'أمر ولائي آخر (تحديد يدوي)',
] as const;

export const URGENT_JUDICIARY_DROPDOWN_OPTIONS = [
    'الحجز الاحتياطي',
    'منع السفر',
    'إعادة المرافق المقطوعة تعسفاً (ماء/كهرباء/هاتف)',
    'الكشف المستعجل وتثبيت الحالة',
    'استكتاب السندات العادية والإقرار بالبصمة أو التوقيع',
    'سماع شاهد يخشى فوات فرصة الاستشهاد به',
    'وضع الأموال تحت الحراسة القضائية',
    'الاستئذان بالتنفيذ أو العمل على نفقة الخصم',
] as const;

export const PETITION_ORDER_MANUAL_OPTION = PETITION_ORDERS_DROPDOWN_OPTIONS[1];

const URGENT_JUDICIARY_LOOKUP = new Set<string>([
    ...URGENT_JUDICIARY_DROPDOWN_OPTIONS,
    'الكشف العقاري',
    'تثبيت حالة',
    'رفع التجاوز',
    'طرد الغاصب المستعجل',
    'الحراسة القضائية',
]);

const PETITION_ORDERS_LOOKUP = new Set<string>([
    ...PETITION_ORDERS_DROPDOWN_OPTIONS,
    'وضع إشارة عدم تصرف/إشارة دعوى',
    'إيقاف الإجراءات التنفيذية/المزايدة',
    'إيقاف صرف مبالغ/خطاب ضمان',
    'الاستئخار المؤقت',
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
        'حجز',
        'منع سفر',
        'المرافق',
        'كشف',
        'تثبيت',
        'شاهد',
        'حراسة',
        'استئذان',
        'نفقة الخصم',
        'استكتاب',
        'البصمة',
    ];
    if (urgentKeywords.some((k) => t.includes(k))) return 'urgent_judiciary';

    return 'petition_orders';
}

export function cassationAdvisoryHint(category: ProcedureCategory): string {
    if (category === 'urgent_judiciary') {
        return '⚠️ القرار قابل للطعن تمييزاً مباشراً أمام محكمة الاستئناف بصفتها التمييزية خلال 7 أيام من اليوم التالي للتبليغ';
    }
    return '⚠️ قرار التظلم قابل للطعن تمييزاً أمام محكمة الاستئناف بصفتها التمييزية خلال 7 أيام من اليوم التالي للتبليغ';
}
