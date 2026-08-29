/**
 * Core execution scalar types (claim, status, occupation, currency, directorate).
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE EXECUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ClaimType = 
    | 'حكم مدني'
    | 'حكم شرعي'
    | 'سند اعتراف دين'
    | 'سند كمبيالة'
    | 'سند سفتجة'
    | 'سند شيك'
    | 'حجة نفقة اتفاقية'
    | 'حجة مخالعة'
    | 'حجة وصاية'
    | 'حجة حضانة'
    | 'مشاهدة'
    | 'استصحاب'
    | 'مبيت'
    | 'تخلية مأجور'
    | 'eviction'
    | 'مطاوعة'
    | 'تسليم طفل'
    /** صياغة بديلة في بيانات قديمة/واجهة */
    | 'تسليم ولد'
    | 'استحصال دين مالي'
    | 'إزالة تجاوز'
    | 'تسليم شيء معين'
    | 'نفقة'
    | 'نفقة ماضية'
    | 'نفقة عدة'
    | 'مهر مؤجل'
    | 'تعويض عن طلاق تعسفي'
    | 'أثاث زوجية';

export type ExecutionStatus = 
    | 'UNNOTIFIED'
    | 'GRACE_PERIOD'
    | 'READY_FOR_COERCIVE'
    | 'CLOSED_PAID';

/** دورة حياة الإضبارة التنفيذية — أربع حالات فقط في الواجهة */
export type DossierLifecycleStatus = 'active' | 'paused' | 'suspended' | 'finished';

/** توحيد قيم قديمة أو قادمة من تخزين سابق */
export function normalizeDossierLifecycleStatus(
    raw: string | undefined | null
): DossierLifecycleStatus {
    const s = String(raw ?? 'active').trim();
    if (s === 'closed' || s === 'finished') return 'finished';
    if (s === 'paused_creditor_death' || s === 'paused_debtor_death') return 'paused';
    if (s === 'active' || s === 'paused' || s === 'suspended') return s;
    return 'active';
}

export type Occupation = 
    | 'موظف'
    | 'كاسب'
    | 'متقاعد'
    | 'عاطل'
    | 'طالب';

export type Currency = 'IQD' | 'USD';

export type Directorate = 
    | 'الكرخ'
    | 'الرصافة'
    | 'الكاظمية'
    | 'المدائن'
    | 'النجف'
    | 'كربلاء'
    | 'بابل'
    | 'البصرة'
    | 'ذي قار'
    | 'ميسان'
    | 'واسط'
    | 'ديالى'
    | 'صلاح الدين'
    | 'الأنبار'
    | 'نينوى'
    | 'كركوك'
    | 'أربيل'
    | 'السليمانية'
    | 'دهوك';
