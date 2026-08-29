/**
 * Party / creditor / debtor / multiplicity types.
 */
import type { Occupation } from './core';

// ═══════════════════════════════════════════════════════════════════════════
// PARTY (CREDITOR/DEBTOR) TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Party {
    id: number | string;
    name: string;
    /** بعض الشاشات/الواردات تستخدم fullName بدل name */
    fullName?: string;
    phone: string;
    address: string;
    occupation: Occupation;
    isClient: boolean;
    nationality: string;
    civilId?: string;
    kinship?: string;
    notificationDate?: string | null;
    /** وفاة الطرف — العرض القانوني يُشتق برمجياً دون تغيير name المخزّن */
    isDeceased?: boolean;
    /** أسماء الورثة المسجّلة مع إعلان الوفاة */
    heirs?: string[];
    /** بيانات الورثة التفصيلية (اختياري) */
    heirs_details?: Array<{
        name: string;
        phone?: string;
        address?: string;
        /** موكل المحامي — يُحدَّد يدوياً لكل وارث من نافذة التعديل، لا يُشتق تلقائياً من الطرف المتوفى */
        isClient?: boolean;
    }>;
}

export interface Creditor extends Party {
    type: 'creditor';
    /** إشعار واجهي: كفيل ضامن مُسجَّل لاحقاً لصالح التحصيل من جهة هذا الدائن */
    guarantorExecutionNotation?: boolean;
    /** مبلغ دين الدائن ضمن قسمة الغرماء (د.ع) — اختياري لتوافق ملفات قديمة */
    allocated_debt?: number;
    /** ما تم توزيعه/استيفاؤه لصالح هذا الدائن ضمن قسمة الغرماء (د.ع) — اختياري */
    paid_amount?: number;
}

export interface Debtor extends Party {
    type: 'debtor';
    notificationDate: string | null;
    gracePeriodEnded?: boolean;
    /** صريح: موظف (true) مقابل كاسب (false) — يُفضَّل على الاشتقاق من occupation عند الحفظ */
    isEmployee?: boolean;
    /** مسار الإنشاء من واجهة فتح الإضبارة (لا يتغير عند التبديل لاحقاً) — لنص زر ⋮ فقط */
    employmentInitialWasEmployee?: boolean;
    /** للإحضار الجبري: موظف مقابل كاسب أو متقاعد (يُستمد من occupation إن وُجد) */
    employmentType?: 'موظف' | 'كاسب' | 'متقاعد';
    /** طبيعي مقابل معنوي — يحدّد مسار محضر المتابعة */
    entityKind?: 'natural_person' | 'legal_entity';
    /** توافق مع seizureMatrix */
    entityType?: 'natural_person' | 'legal_entity' | string;
    /** يوجد كفيل ضامن يوجّه الإجراء عن المدين في المطالبة المالية */
    hasGuarantor?: boolean;
    /** حصة المدين من الدين المقسوم (تعدّد الخصوم) — افتراضي 0 عند الغياب */
    allocated_debt?: number;
    /** ما دُفِع باسم هذا المدين فقط — افتراضي 0 عند الغياب */
    paid_amount?: number;
    /** تكافل وتضامن — ذمة موحّدة لهذا المدين مع بقية المدينين المتضامنين */
    isSolidaryLiability?: boolean;
    /** مطالبة أتعاب المحاماة لهذا المدين — عند تعدد الدائنين والمدين مستقل */
    lawyerFeesClaimAmount?: number;
}

/** دائن إضافي — تعدّد الخصوم (امتداد بلا تغيير البطاقة الأساسية) */
export interface AdditionalExecutionCreditor {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: 'موظف' | 'كاسب' | string;
    employmentType?: 'موظف' | 'كاسب' | 'متقاعد';
    isEmployee?: boolean;
    isClient?: boolean;
    /** حصة دين هذا الدائن (د.ع) — لقسمة الغرماء والتسديد التناسبي */
    allocated_debt?: number;
    /** ما استُوفي لصالح هذا الدائن (د.ع) */
    paid_amount?: number;
}

/** مدين إضافي مع ذمّة مالية فردية */
export interface AdditionalExecutionDebtor {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: 'موظف' | 'كاسب' | string;
    employmentType?: 'موظف' | 'كاسب' | 'متقاعد';
    isEmployee?: boolean;
    /** مسار الإنشاء (موظف/كاسب) — ثابت بعد الحفظ الأول */
    employmentInitialWasEmployee?: boolean;
    entityKind?: 'natural_person' | 'legal_entity';
    entityType?: 'natural_person' | 'legal_entity' | string;
    status: 'Active' | 'Cleared';
    allocated_debt: number;
    paid_amount: number;
    /** تكافل وتضامن — ذمة موحّدة لهذا المدين */
    isSolidaryLiability?: boolean;
    /** مطالبة أتعاب المحاماة لهذا المدين */
    lawyerFeesClaimAmount?: number;
}

/** تعدّد الخصوم + التضامن والتكافل — حقول اختيارية على ملف التنفيذ */
export interface PartyMultiplicityExtension {
    additionalCreditors: AdditionalExecutionCreditor[];
    additionalDebtors: AdditionalExecutionDebtor[];
    isSolidaryLiability: boolean;
    /** الباقي من الدين — حصة المدينين المستقلين */
    independentRemainderDebt?: number;
    /** @deprecated — الباقي للضامnين (نموذج قديم) */
    solidaryRemainderDebt?: number;
}
