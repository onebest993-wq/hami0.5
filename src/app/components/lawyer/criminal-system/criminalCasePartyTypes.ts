import type { DefendantPersonalStage } from '@/app/types/criminal';
import type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';
import type { GuarantorDetails } from './criminalGuarantorModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';

export type CriminalLawyerRole = 'وكيل المشتكي' | 'وكيل المشكو منه' | 'شكوى متقابلة';
export type PhysicalLocation = 'judge_desk' | 'investigator_room' | 'prosecution' | 'police_station' | 'archive' | 'custom';
export type CriminalCaseStage =
    | 'مرحلة التحقيق'
    | 'تحقيق الأحداث'
    | 'محكمة الأحداث'
    | 'محكمة الجنح'
    | 'محكمة الجنايات'
    | 'cassation_court';
export type CrimeType = 'مخالفة' | 'جنحة' | 'جناية';
export type DefendantStatus =
    | 'حر'
    | 'مستقدم'
    | 'هارب'
    | 'ملقى القبض عليه'
    | 'موقوف'
    | 'مكفل'
    | 'bailed_pending_appeal'
    | 'psychiatric_eval'
    | 'provisional_delivery'
    | 'behavioral_surveillance'
    | 'juvenile_detention'
    | 'متوفى'
    | 'مشمول بالعفو';
export type InvestigationPapersAt = '' | 'مركز شرطة' | 'مكتب تحقيق قضائي';

export interface DetentionHistory {
    id: string;
    location: string;
    startDate: string;
    endDate?: string;
}

export type InAbsentiaDetails = {
    verdictDate: string;
    objectionDeadline: string;
    isObjectionFiled: boolean;
    notifiedDate?: string;
    notificationMethod?: string;
};

export type SocialInquiryWorkflowStatus = 'not_requested' | 'under_preparation' | 'submitted';

export type JuvenileDetentionPlacement = 'juvenile_observation' | 'rehabilitation_school';

export type SocialInquiryReport = {
    workflowStatus?: SocialInquiryWorkflowStatus;
    isAttached: boolean;
    receivedDate?: string;
    investigatorName?: string;
    recommendations?: string;
};

export type CriminalComplainant = {
    id: string;
    fullName: string;
    address: string;
    phone: string;
    /** المكتب يُمثّل هذا الطرف (توكل) — يُحدَّد من الواجهة بجانب الاسم. */
    isOfficeClient?: boolean;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    birthDate?: string;
    guardianName?: string;
    guardianRelationship?: string;
    /**
     * ⚖️ ازدواجية الصفة — «شكوى متقابلة» على مستوى المشتكي.
     * عند `true` يَكتسب هذا المشتكي صفة المتهم أيضاً (يبقى داخل مصفوفة complainants
     * ولا يُنقل إلى defendants — منع تخريب الداتا)، وتُستخدم الحقول accused* أدناه
     * لتخزين حالته الإجرائية كمتهم بشكل مستقل عن صفته الأصلية كمشتكي.
     *
     * ملاحظة: عند `caseRecord.isMutualComplaint === true` كل المشتكين يُعامَلون
     * كأنّ لديهم `isCrossComplaint = true` (سلوك تراثي).
     */
    isCrossComplaint?: boolean;
    /**
     * متهمون مُستهدفون بشكوى هذا المشتكي المتقابلة (إنشاء الإضبارة).
     * `undefined` = لا شكوى متقابلة على هذا المشتكي.
     * قائمة غير فارغة = الأطراف المقصودون بالشكوى المتقابلة فقط (متهمون و/أو مشتكون).
     */
    counterComplaintTargetDefendantIds?: string[];
    /** حالة المشتكي كمتهم (موقوف/مكفل/حر/هارب…) — منفصلة عن صفته كمشتكي. */
    accusedStatus?: DefendantStatus | '';
    /** جهة الإيداع للتوقيف — مرتبطة بـ accusedStatus. */
    accusedDetentionAuthority?: string;
    /** تاريخ انتهاء التوقيف لهذا المشتكي حين يكون موقوفاً. */
    accusedDetentionExpiryDate?: string;
    /** سجل دفعات التوقيف — مماثل لـ CriminalDefendant.detentionHistoryLog. */
    accusedDetentionHistoryLog?: DetentionHistory[];
    /** مجموع أيام التوقيف — للحساب التراكمي. */
    accusedTotalDetentionDays?: number;
    /** تفاصيل الكفالة عند كون المشتكي «مكفلاً» كمتهم. */
    accusedGuarantorDetails?: GuarantorDetails;
    /**
     * 🔒 قُفل سجل المشتكي بصفته متهماً (شكوى متقابلة) — يُفعَّل عند توثيق الوفاة
     *    أو سقوط الدعوى الفرعية بحقّه. مَفهومه مماثل لـ `isPartyRecordLocked` على المتهم.
     */
    accusedIsPartyRecordLocked?: boolean;
    /** مَرحلة المشتكي الشخصية بصفته متهماً (مثل lawsuit_dropped_death عند الوفاة). */
    accusedPersonalStage?: string;
    /**
     * 📦 محجوزات الأموال على المشتكي المتقابل (يَوازي `seizedAssets` للمتهم). يَظهر
     * فقط عندما يَكون المشتكي «هارباً» في شكوى متقابلة وتُصدر بحقّه أوامر حَجز.
     */
    accusedSeizedAssets?: SeizedAsset[];
};

export type CriminalDefendant = {
    id: string;
    fullName: string;
    address: string;
    birthYear: string;
    status: DefendantStatus | '';
    detentionAuthority: string;
    detentionExpiryDate: string;
    detentionHistoryLog: DetentionHistory[];
    totalDetentionDays: number;
    hasFelonyCourtPermit?: boolean;
    guarantorDetails?: GuarantorDetails;
    inAbsentiaDetails?: InAbsentiaDetails;
    /** قائمة الأموال المحجوزة على المتهم الهارب — تُملأ عبر قرار «حجز الأموال». */
    seizedAssets?: SeizedAsset[];
    /** المكتب يُمثّل هذا الطرف (توكل) — يُحدَّد من الواجهة بجانب الاسم. */
    isOfficeClient?: boolean;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    birthDate?: string;
    guardianName?: string;
    guardianRelationship?: string;
    socialInquiryReport?: SocialInquiryReport;
    /** المصير الإجرائي الفردي داخل الإضبارة الموحدة. */
    personalStage?: DefendantPersonalStage;
    /** قفل بيانات الطرف (شمع أحمر) — مثلاً بعد وفاة المتهم. */
    isPartyRecordLocked?: boolean;
    /** حالة المتهم داخل التحقيق — تصفية الخصوم (افتراضي active). */
    investigationStatus?: InvestigationDefendantStatus;
    /** هوية المتهم مجهولة حتى «كشف الهوية». */
    isIdentityUnknown?: boolean;
};

/** فئة العمر الإجرائية للمتهم المعلوم — بالغ (افتراضي) | حدث | دون 7 سنوات. */
export type DefendantAgeCategory = 'adult' | 'juvenile' | 'under_seven';
