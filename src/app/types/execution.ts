import type { EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollectionMachine';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 EXECUTION TYPES - النماذج النوعية للتنفيذ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Comprehensive TypeScript interfaces for the execution system
 * Replaces all 'any' types with proper definitions
 * 
 * @version 1.0.0
 * @author Hami Legal System
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
    | 'تسليم ولد';

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

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FinancialAmount {
    debtAmount: number;
    courtFees: number;
    directorateFees: number;
    lawyerFees: number;
    clientFees: number;
    executionFee: number;
    total: number;
}

export interface PaymentRecord {
    id: string;
    date: string;
    amount: number;
    type: 'debtPayment' | 'courtFeesPayment' | 'directorateFeesPayment' | 'clientFeesPayment';
    description: string;
    receiptNumber?: string;
}

export interface LedgerEntry {
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
}

export interface GhuramaDistributionLog {
    transactionId: string;
    dateIso: string;
    totalAmountDistributed: number;
    distributionDetails: Array<{
        creditorId: string;
        creditorName: string;
        debtBeforeDistribution: number;
        amountDistributed: number;
    }>;
}

/** محضر المتابعة — قرار منفذ العدل على تحرك الطرف الآخر */
export type OtherPartyActionOutcome = 'approved' | 'rejected' | 'pending';

export interface OtherPartyActionLogEntry {
    id: string;
    /** YYYY-MM-DD */
    date: string;
    content: string;
    outcome: OtherPartyActionOutcome;
    decisionNote?: string;
    savedAt?: string;
    /** ربط بصف قرار المنفذ عند الإرسال من السجل اليدوي */
    decisionRowId?: string;
    /** ربط بخيار كatalog — للسجلات الناتجة عن تتبع يدوي */
    linkedOptionId?: string;
}

/** تتبع يدوي لوكيل المدين — تقديم الدائن وقرار المنفذ */
export type OtherPartyTrackedExecutorOutcome =
    | 'none'
    | 'submitted'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'alternative';

export interface OtherPartyRequestTrackEntry {
    optionId: string;
    label?: string;
    /** YYYY-MM-DD — تاريخ تقديم الدائن (يدوي) */
    submittedDate?: string;
    executorOutcome: OtherPartyTrackedExecutorOutcome;
    /** إخفاء يدوي من قائمة الخيارات */
    hidden?: boolean;
    notes?: string;
    /** بطاقة مركز القرارات المرتبطة */
    decisionId?: string;
    updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ALIMONY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AlimonyCalculation {
    monthlyAmount: number;
    numberOfMonths: number;
    totalAccumulated: number;
    startDate: string;
    lastCalculationDate: string;
}

export interface AlimonyData {
    monthly: number;
    calculated: AlimonyCalculation;
    childrenCount?: number;
    wifeAmount?: number;
    childAmount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DocumentType = 
    | 'civil_judgment'
    | 'sharia_deed'
    | 'commercial_paper'
    | 'promissory_note';

export interface DocumentDetails {
    type: DocumentType;
    number: string;
    date: string;
    issuingCourt: string;
    registerNumber?: string;
}

// Sharia Deed Specific
export interface ShariaDeedDetails extends DocumentDetails {
    type: 'sharia_deed';
    shariaDeedNumber: string;
    shariaRegisterNumber: string;
    shariaIssueDate: string;
    shariaIssuingCourt: string;
}

// Commercial Paper Specific
export interface CommercialPaperDetails extends DocumentDetails {
    type: 'commercial_paper';
    paperNumber: string;
    paperIssueDate: string;
    paperDueDate: string;
    paperDrawer: string;
    paperDrawee: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TimelineEventType = 
    | 'notification'
    | 'payment'
    | 'decision'
    | 'coercive'
    | 'settlement'
    | 'appointment'
    | 'appeal'
    | 'other_party'
    | 'other';

/** حالة البطاقة في تبويبي مركز القرارات (طلبات حالية / قرارات سابقة) */
export type ExecutionDecisionHubStatus = 'pending' | 'accepted' | 'rejected';

/** مرحلة الطعن على قرار المنفذ: تظلم ثم تمييز */
export type ExecutionDecisionAppealPhase = 'grievance' | 'cassation' | null;

/** أولوية العرض في «رادار» السجل الذكي — منفصل عن نوع الحدث (تبليغ/دفعة/…) */
export type TimelineSmartPriority = 'normal' | 'urgent' | 'deadline';

export interface TimelineEvent {
    id: string;
    /** يسمح بقيم إضافية من واجهة التنفيذ حتى تتم مواءمة السجل تدريجياً */
    type: TimelineEventType | string;
    title: string;
    description?: string;
    details?: string;
    date: string;
    /** وقت تسجيل الحدث في السجل الزمني (ISO) */
    timestamp?: string;
    /** القسم أو الأداة التي أُنشئ منها السجل */
    source?: string;
    isNew?: boolean;
    /** تثبيت يدوي في أعلى الرادار */
    isPinned?: boolean;
    /** تاريخ انتهاء مهلة قانونية (يُفضّل YYYY-MM-DD أو ISO) */
    deadlineDate?: string;
    /** أولوية بطاقة الرادار — تُحدَّث آلياً عند اقتراب deadlineDate */
    smartPriority?: TimelineSmartPriority;
    /** اسم أيقونة Lucide اختياري للعرض المخصص */
    icon?: string;
    /** مثال ذمة مقسومة: `metadata.timelineDebtorKey` = مفتاح المدين في `debtorWorkspaceEntries` */
    metadata?: Record<string, unknown>;
    /** نقل إلى سلة مهملات الإضبارة — لا يُعرض في السجل الفعّال */
    trashedAt?: string;
    /**
     * لقطة حالة الإضبارة وقت تسجيل الحدث — لمعاينة «آلة الزمن» (سيتم تقوية النوع لاحقاً).
     * يُخزَّن مكافئها في Supabase كعمود `snapshot_data` (jsonb).
     */
    snapshot?: any;
}

// ═══════════════════════════════════════════════════════════════════════════
// COERCIVE ACTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type CoerciveActionType = 
    | 'seizure'
    | 'arrest'
    | 'travel_ban'
    | 'summons'
    | 'imprisonment';

export interface CoerciveAction {
    id: string;
    type: CoerciveActionType;
    title: string;
    description: string;
    date: string;
    status: 'pending' | 'executed' | 'cancelled';
    targetDebtor: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEIZED ASSETS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type AssetType = 
    | 'real_estate'
    | 'vehicle'
    | 'bank_account'
    | 'salary'
    | 'movable'
    | 'other';

export interface SeizedAsset {
    id: string;
    type: AssetType | string;
    description?: string;
    estimatedValue?: number;
    seizureDate?: string;
    status: 'seized' | 'auctioned' | 'released' | 'pending' | 'sold' | string;
    notes?: string;
    /** بديل قديم لـ notes في بعض مسارات العرض/التخزين */
    note?: string;
    /** حقول ديناميكية من نماذج الواجهة */
    details?: Record<string, string>;
    /** بعد فك الحجز أو إتمام البيع — تُقفَل السجلات ولا تُحسب للشارات */
    seizure_record_locked?: boolean;
    /** تاريخ المزايدة المقترح/المحدد (YYYY-MM-DD) */
    auction_date_ymd?: string | null;
    /** سعر البيع بالدينار عند اختيار «تم بيعه» */
    sale_price_iqd?: string | null;
    /** تاريخ فك الحجز */
    released_at_ymd?: string | null;
    /** بعد الضغط على «تم بيعه» — إظهار حقل السعر ثم التأكيد */
    seizure_awaiting_sale_price?: boolean;
    /** مسودة السعر أثناء خطوة التأكيد */
    seizure_sale_price_draft?: string;

    /** قيد قانوني: لا مزايدة/بيع قبل تأييد وضع الإشارة (مرور/طابو) */
    isMarkConfirmed?: boolean;
    markConfirmationLetterNo?: string;
    markConfirmationLetterDateYmd?: string | null;
}

export type RealEstateGender = 'دار' | 'شقة' | 'عرصة' | 'بستان';

export type SeizedPropertyStatus =
    | 'seized'
    | 'estimation_objected'
    | 'valued'
    | 'estimated'
    | 'published'
    | 'auction_scheduled'
    | 'initial_award'
    | 'no_bidders'
    | 'sold';

export interface SeizedProperty {
    id: string;
    decisionRowId?: string;
    propertyNumber: string;
    district?: string;
    propertyGender: RealEstateGender;
    seizureMarkLetterNumber?: string;
    seizureMarkDate?: string | null;
    seizureMarkEntity?: string;
    newspaperName?: string;
    publicationDateYmd?: string | null;
    estimatedPriceIqd?: number | null;
    deedNotes?: string;
    status: SeizedPropertyStatus;
    seizedAtIso: string;
    subject?: string;
    expertEstimatedAmountIqd?: number | null;
    expertNames?: string[];
    expertReportDateYmd?: string | null;
    /** عدد الخبراء المطلوب في اللجنة — دائماً فردي (1، 3، 5…) */
    expertCommitteeSize?: number | null;
    /** آخر نوع اعتراض: على التقرير (زيادة العدد) أو على الخبراء (استبدال) */
    lastExpertObjectionKind?: 'report' | 'experts' | null;
    auctionDateYmd?: string | null;
    lastBidderOrBuyerName?: string;
    finalAwardAmountIqd?: number | null;
    auctionDepositAmountIqd?: number | null;
    initialAwardBuyerName?: string;
    initialAwardAmountIqd?: number | null;
    initialAwardRecordedAtIso?: string;
    noBiddersRecordedAtIso?: string;
    titleTransferCompletedAtIso?: string;
    buyerDeliveryCompletedAtIso?: string;
    proceedsDisburseCompletedAtIso?: string;
    experts?: {
        expertName: string;
        estimatedPriceIqd: number | null;
        recordedAtIso: string;
    };
    auction?: {
        auctionDateYmd: string;
        recordedAtIso: string;
    };
    award?: {
        buyerName: string;
        awardAmountIqd: number | null;
        recordedAtIso: string;
    };
    increase10?: {
        recordedAtIso: string;
        notes?: string;
    };
    reauctionDefault?: {
        recordedAtIso: string;
        notes?: string;
    };
}

export type SeizedMovableStatus = SeizedPropertyStatus;

export interface SeizedMovable {
    id: string;
    decisionRowId?: string;
    movableDescription: string;
    movableLocation: string;
    judicialCustodianName: string;
    seizureMarkLetterNumber?: string;
    seizureMarkDate?: string | null;
    seizureMarkEntity?: string;
    newspaperName?: string;
    publicationDateYmd?: string | null;
    status: SeizedMovableStatus;
    seizedAtIso: string;
    subject?: string;
    expertEstimatedAmountIqd?: number | null;
    expertNames?: string[];
    expertReportDateYmd?: string | null;
    /** عدد الخبراء المطلوب في اللجنة — دائماً فردي (1، 3، 5…) */
    expertCommitteeSize?: number | null;
    /** آخر نوع اعتراض: على التقرير (زيادة العدد) أو على الخبراء (استبدال) */
    lastExpertObjectionKind?: 'report' | 'experts' | null;
    auctionDateYmd?: string | null;
    lastBidderOrBuyerName?: string;
    finalAwardAmountIqd?: number | null;
    auctionDepositAmountIqd?: number | null;
    initialAwardBuyerName?: string;
    initialAwardAmountIqd?: number | null;
    initialAwardRecordedAtIso?: string;
    noBiddersRecordedAtIso?: string;
    buyerDeliveryCompletedAtIso?: string;
    proceedsDisburseCompletedAtIso?: string;
    experts?: {
        expertName: string;
        estimatedPriceIqd: number | null;
        recordedAtIso: string;
    };
    auction?: {
        auctionDateYmd: string;
        recordedAtIso: string;
    };
    award?: {
        buyerName: string;
        awardAmountIqd: number | null;
        recordedAtIso: string;
    };
    increase10?: {
        recordedAtIso: string;
        notes?: string;
    };
    reauctionDefault?: {
        recordedAtIso: string;
        notes?: string;
    };
}

export interface ThirdPartySeizureAsset {
    id: string;
    decisionRowId?: string;
    thirdPartyName: string;
    expectedAmountIqd?: number | null;
    letterDetails?: string;
    status: 'waiting' | 'received' | 'archived';
    record_locked?: boolean;
    actualReceivedAmountIqd?: number | null;
    received_at_iso?: string | null;
    archived_at_ymd?: string | null;
    awaiting_receive?: boolean;
    receive_amount_draft?: string;
}

export type ThirdPartySeizureStatus = 'notified' | 'replied' | 'funds_received';

export type ThirdPartySeizureReplyStatus = 'pending' | 'acknowledged' | 'denied';

export interface ThirdPartySeizure {
    id: string;
    decisionRowId?: string;
    thirdPartyName: string;
    requestedAmountIqd: number | null;
    notificationDateIso: string | null;
    replyStatus: ThirdPartySeizureReplyStatus;
    transferredAmountIqd: number | null;
    status: ThirdPartySeizureStatus;
    /** اختار المحامي «التسليم لاحقاً» — يبقى المسار مفتوحاً حتى «تم التسليم» */
    funds_delivery_deferred?: boolean;
}

/** خيارات جاهزة لنوع الشارة — يُسمح أيضاً بنص يدوي عند اختيار «يدوي» */
export type StandaloneExecutionMarkType =
    | 'تثبيت حجز احتياطي'
    | 'مفاتحة عامة'
    | 'تعميم منع تصرف'
    | 'يدوي';

export interface StandaloneExecutionMark {
    id: string;
    decisionRowId?: string;
    markType: string;
    targetEntity: string;
    markDetails: string;
    letterDetails?: string;
    isMarkConfirmed?: boolean;
    status: 'active' | 'archived';
    record_locked?: boolean;
    archived_at_ymd?: string | null;
}

export interface RealEstateSeizureAsset {
    id: string;
    decisionRowId?: string;
    propertyNoAndDistrict: string;
    propertyGender: RealEstateGender;
    estimatedPriceIqd?: number | null;
    deedNotes?: string;
    status: 'seized' | 'sold' | 'archived';
    record_locked?: boolean;
    auction_date_ymd?: string | null;
    sale_price_iqd?: string | null;
    awaiting_sale_price?: boolean;
    sale_price_draft?: string;
    archived_at_ymd?: string | null;

    /** قيد قانوني: لا مزايدة/بيع قبل تأييد وضع الإشارة (الطابو) */
    isMarkConfirmed?: boolean;
    markConfirmationLetterNo?: string;
    markConfirmationLetterDateYmd?: string | null;
 }

/** مراحل تكليف حضور المدين — مسار الموظف (جميع أنواع التنفيذ عند المدين الموظف) */
export type EmployeeSummonsAssignmentPhase =
    | 'none'
    | 'active'
    | 'absent_declared'
    | 'investigation_pending'
    | 'warrant_ui';

/** تبليغ بالنشر — حالة مسجّلة لمدين واحد */
export interface PublicationNoticeDebtorState {
    /** تاريخ النشر في الجريدة (YYYY-MM-DD) */
    publicationDateYmd: string;
    newspaper1: string;
    newspaper2: string;
    recordedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
}

export interface EmployeeSummonsAssignmentState {
    phase: EmployeeSummonsAssignmentPhase;
    /** ذمة مقسومة: مفتاح المدين المستهدف (يتوافق مع مفاتيح debtorWorkspaceEntries) */
    assignedDebtorKey?: string | null;
    purpose?: string;
    /** تاريخ التبليغ الفعلي بالتكليف YYYY-MM-DD */
    notifyDate?: string;
    durationDays?: number;
    /** نهاية المدة = تاريخ التبليغ + الأيام المختارة (تقويمي) */
    deadlineDate?: string;
    confirmedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
    /** يزيد عند كل تسجيل «عدم حضور» بعد انتهاء المدة — لتتبع إعادة دورة التكليف في السجل */
    taklifCycleGeneration?: number;
    investigationDecisionId?: string | null;
    investigationApproved?: boolean;
    /** بعد تأكيد «صدور أمر قبض» من الواجهة */
    arrestOrderRecorded?: boolean;
}

export interface ExecutionAICopilotCitation {
    title: string;
    url: string;
    source?: 'iraqi_official' | 'web' | 'rag';
    publishedAt?: string;
}

export interface ExecutionAICopilotSuggestion {
    id: string;
    title: string;
    rationale: string;
    priority: 'critical' | 'high' | 'medium';
    type?: 'حرج' | 'مهم' | 'تحسيني' | 'استباقي' | 'تحري_مالي' | 'إجراء_فوري';
    deadline?: string;
    draftText?: string;
    citations?: ExecutionAICopilotCitation[];
}

export interface ExecutionAICopilotResult {
    summary: string;
    confidence: number;
    generatedAt: string;
    suggestions: ExecutionAICopilotSuggestion[];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION FILE TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionFile {
    // Basic Info
    id: string;
    directorate: Directorate;
    fileNumber: string;
    /** سنة الإضبارة في العرض (مثل 1540/2026) */
    fileYear?: string;
    executionDate: string;
    submissionDate: string;
    
    // Claim Info
    claimType: ClaimType;
    documentType: DocumentType;
    documentDate: string;
    
    // Parties
    creditors: Creditor[];
    debtors: Debtor[];
    /**
     * تعدّد الخصوم والتضامن — امتداد اختياري؛ الأطراف الأساسية تبقى في creditors / debtors.
     */
    party_multiplicity?: PartyMultiplicityExtension;
    
    // Financial
    debtAmount: number;
    currency: Currency;
    courtFees: number;
    directorateFees: number;
    lawyerFees: number;
    clientFees: number;
    executionFee: number;
    
    // Payments
    paidDebt: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    /**
     * الرصيد المتبقي العام للإضبارة (مسار الذمم الفردية).
     * عند الغياب يُشتق من debtAmount − paidDebt في منطق المخزن.
     */
    total_remaining_balance?: number;
    /** اسم قديم/وارد من واجهات أخرى للرصيد المتبقي — يُفضَّل `total_remaining_balance` */
    remainingDebt?: number;
    
    status: ExecutionStatus;
    isPaused: boolean;

    /** أسماء بديلة تستخدمها بعض الشاشات (legacy / UI) */
    totalAmount?: number;
    paidAmount?: number;
    docType?: string;
    docNumber?: string;
    judgmentDate?: string;
    notificationDate?: string;
    pauseReason?: string;
    
    // Timeline
    timelineEvents: TimelineEvent[];
    /** ملاحظات محفوظة من أدوات الإضبارة (لا تُدرَج المهام غير المنجزة هنا) */
    caseNotesLog?: Array<{
        id: string;
        title: string;
        body: string;
        createdAt: string;
        trashedAt?: string;
        /** تثبيت في درج الملاحظات داخل «سجل الملاحظات والمهام» */
        pinned?: boolean;
    }>;
    /** مهام معلّقة من «سجل الملاحظات» — تظهر في الشريط العلوي حتى الإنجاز */
    caseTasksPending?: Array<{
        id: string;
        title: string;
        body: string;
        dueDate: string;
        createdAt: string;
        trashedAt?: string;
        /** قائمة خطوات المهمة (مثل خطة عمل مرقّمة) */
        steps?: Array<{
            id: string;
            text: string;
            order: number;
            dueDate?: string;
            status: 'pending' | 'done' | 'failed';
        }>;
        /** هل المهمة مثبّتة (تظهر أسفل بطاقة المدين) */
        pinned?: boolean;
    }>;
    /** المهام المثبّتة أسفل بطاقة المدين (نسخة من المهمة الأصلية) */
    pinnedTasks?: Array<{
        id: string;
        taskId: string;
        title: string;
        body: string;
        createdAt: string;
        steps?: Array<{ id: string; text: string; order: number; dueDate?: string; status: 'pending' | 'done' | 'failed'; }>;
    }>;
    /** مساعد الذكاء الاصطناعي داخل الإضبارة */
    ai_copilot_enabled?: boolean;
    ai_copilot_mode?: 'hybrid' | 'manual' | 'always_on';
    ai_copilot_last_run_at?: string | null;
    ai_copilot_last_result?: ExecutionAICopilotResult | null;
    
    // Coercive Actions
    coerciveActions?: CoerciveAction[];
    /** مفاتيح إجراءات إكراهية نشطة في الواجهة / التخزين المحلي (مثلاً salary) */
    activeCoerciveActions?: string[];
    seizedAssets?: SeizedAsset[];
    /** طلبات حجز بانتظار موافقة المنفذ — المفتاح هو معرّف صف القرار */
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
    seizedProperties?: SeizedProperty[];
    seizedMovables?: SeizedMovable[];
    /** سجل حجوزات العقار (منفصل عن seizedAssets لضمان عدم التداخل) */
    realEstateSeizureAssets?: RealEstateSeizureAsset[];
    /** حجز مال المدين لدى الغير (منفصل عن أنواع الحجز الأخرى) */
    thirdPartySeizureAssets?: ThirdPartySeizureAsset[];
    thirdPartySeizures?: ThirdPartySeizure[];
    /** شارة تنفيذية مستقلة/تعميمات (إداري فقط بلا أي منطق مالي) */
    standaloneExecutionMarks?: StandaloneExecutionMark[];
    
    // Alimony (if applicable)
    alimony?: AlimonyData;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    notes?: string;

    /** تاريخ نقل الإضبارة إلى سلة المهملات (ISO) — غيابه = غير محذوفة */
    executionTrashDeletedAt?: string | null;

    /** تاريخ أرشفة الإضبارة (ISO) — غيابه = غير مؤرشفة */
    executionArchivedAt?: string | null;

    /** أخفى المحامي إشارة «عدم حضور المدين» يدوياً (بعد إعلان انتهاء المدة دون حضور) */
    debtor_absence_badge_dismissed?: boolean;
    
    // State Machine
    gracePeriodActive?: boolean;
    gracePeriodEnded?: boolean;
    debtorNotificationDate?: string | null;
    /** آخر تبليغ للمدين — للشارة بجانب الاسم (تعديل/حذف) */
    debtor_summons_marker?: {
        id: string;
        date: string;
        purpose: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null;
    /** آخر تبليغ لكل مدين (ذمة مقسومة) */
    debtor_summons_marker_by_debtor?: Record<
        string,
        {
            id: string;
            date: string;
            purpose: string;
            recordedAt?: string;
            badgeHiddenAt?: string;
            periodEndedAt?: string;
        } | null
    >;
    /** عدد التبليغات لكل مدين */
    notification_count_by_debtor?: Record<string, number>;

    /**
     * تكليف بالحضور — مسار المدين الموظف بعد تسجيل مذكرة الإخبار بالتنفيذ (أي تنفيذ).
     * يُدار من تبويب «التكليف بالحضور» داخل مركز التبليغ.
     * @deprecated لصالح `employee_summons_assignments_by_debtor` — يُقرأ للتوافق مع الملفات القديمة فقط.
     */
    employee_summons_assignment?: EmployeeSummonsAssignmentState | null;
    /**
     * تكليف حضور لكل مدين (ذمة مقسومة) — المفتاح يطابق مفاتيح `debtorWorkspaceEntries`.
     */
    employee_summons_assignments_by_debtor?: Record<string, EmployeeSummonsAssignmentState>;

    /**
     * تبليغ بالنشر (جريدتان) — لكل مدين عند تعدد الخصوم؛ المفتاح يطابق مفاتيح مساحة عمل المدين.
     * المدة ١٥ يوماً تقويمياً من اليوم التالي لتاريخ النشر.
     */
    publication_notice_by_debtor?: Record<string, PublicationNoticeDebtorState>;
    /** تاريخ التبليغ الفعلي لكل مدين (ذمة مقسومة) */
    debtor_notification_date_by_debtor?: Record<string, string>;
    /** مرجع تاريخ مذكرة الإخبار لكل مدين (ذمة مقسومة) */
    execution_memo_anchor_date_by_debtor?: Record<string, string>;
    /** حالة مسار التبليغ/الإحضار لكل مدين (initial_notice | forced_attendance | arrest_warrant) */
    active_notice_state_by_debtor?: Record<string, string>;
    /** إعلان انتهاء المهلة الرضائية لكل مدين (غير تخلية) */
    notice_voluntary_period_end_declared_by_debtor?: Record<string, boolean>;
    /** إخفاء شارة عدم الحضور لكل مدين */
    debtor_absence_badge_dismissed_by_debtor?: Record<string, boolean>;

    /**
     * غير تخلية: تاريخ مذكرة الإخبار بالتنفيذ الفعلي (أول تسجيل أو إعادة تبليغ بالمذكرة).
     * يُستخدم لاحتساب 7 أيام تقويمية من اليوم التالي له — وليس من تاريخ الضغط.
     */
    execution_memo_anchor_date?: string | null;
    /**
     * غير تخلية: أعلن المحامي انتهاء مدة التنفيذ الرضائي (بعد 7 أيام تقويمية دون حضور).
     * يفتح مسار «تبليغ» لاحق دون اشتراط إجراء إكراهي.
     */
    notice_voluntary_period_end_declared?: boolean;

    /** محضر المتابعة — سجل تحركات الطرف الآخر (نص حر) */
    other_party_actions_log?: OtherPartyActionLogEntry[] | null;

    /** وكيل المدين — تتبع يدوي لطلبات الدائن وقرار المنفذ */
    other_party_request_tracks?: OtherPartyRequestTrackEntry[] | null;

    /** آلة حياة الإضبارة: نشطة | متوقفة | مستأخرة | انتهاء */
    dossier_lifecycle_status?: DossierLifecycleStatus;
    /** سبب الحالة عند عدم كون الإضبارة نشطة */
    dossier_status_reason?: string;
    /** تاريخ مرتبط بالحالة (YYYY-MM-DD) */
    dossier_status_date?: string;
    /** تاريخ آخر إجراء قاطع للتقادم (YYYY-MM-DD) — يُزامن مع رادار المادة 112 */
    dossier_last_action_date?: string;
    /** Legacy: يُستخدم في لوحة التنفيذ لحساب التقادم */
    lastActionDate?: string | null;

    /** وفاة المدين — للعرض والتوافق مع بيانات قديمة؛ لا يُستخدم لتعطيل الإجراءات */
    is_debtor_deceased?: boolean;
    /** صفة المدين الأساسي: طبيعي | معنوي */
    debtor_entity_kind?: 'natural_person' | 'legal_entity';
    /** @deprecated — استخدم debtor_entity_kind */
    debtor_entity_type?: string;
    /** صفة كل مدين في تعدّد الخصوم */
    debtor_entity_kind_by_debtor?: Record<string, 'natural_person' | 'legal_entity'>;
    /** وفاة الدائن — للعرض والتوافق */
    is_creditor_deceased?: boolean;
    /** ورثة مسجّلون — يُزامَن مع مسار الوفاة */
    dossier_heirs_list?: string[];
    /** اسم المدين عند تسجيل الوفاة (مرجع عرض) */
    deceased_debtor_legal_name_snapshot?: string;
    /** اسم الدائن عند تسجيل الوفاة (مرجع عرض) */
    deceased_creditor_legal_name_snapshot?: string;

    /** محضر المتابعة — التنفيذ الجبري الشخصي (طلبات المنفذ) */
    forced_bring_in_personal_outcome?: 'brought' | 'absconded' | null;
    /** سجّل مرة واحدة: مسودة مذكرة إحضار + مهمة ميدانية بعد موافقة المنفذ على طلب الإحضار */
    forced_bring_in_personal_followup_logged?: boolean;
    /** مفاتحة محكمة التحقيق لأمر قبض */
    personal_arrest_warrant_stage?: 'none' | 'pending_court' | 'issued' | null;
    /** شارة المدين: مطلوب بمذكرة قبض */
    debtor_wanted_arrest_warrant?: boolean;
    /** منع سفر فعّال (بعد موافقة المنفذ) */
    debtor_travel_ban_active?: boolean;
    /** منع سفر — لكل مدين في الذمة المقسومة */
    debtor_travel_ban_active_by_debtor?: Record<string, boolean>;
    /** تراجع عن منع سفر — لكل مدين */
    travel_ban_withdrawn_at_by_debtor?: Record<string, string>;
    /** تراجع عن دورة طلب منع سفر — لكل مدين */
    travel_ban_request_cycle_withdrawn_at_by_debtor?: Record<string, string>;
    /** حبس تنفيذي — تاريخ انتهاء المدة (YYYY-MM-DD) */
    executive_detention_until?: string | null;
    executive_detention_days_total?: number | null;
    debtor_executive_detention_active?: boolean;
    /** إخلاء سبيل / إغلاق دورة التنفيذ الجبري — إخفاء شارات الطلبات النشطة */
    personal_coercive_cycle_closed_at?: string | null;
    /** انتهاء مدة الحبس أو إغلاق مسار الحبس — إخفاء شارة «حبس تنفيذي» من القرارات */
    executive_detention_released_or_closed_at?: string | null;
    /** تراجع المحامي عن طلب منع السفر — إعادة الدورة */
    travel_ban_withdrawn_at?: string | null;
    /** تراجع عن دورة الطلب مع إبقاء إشارة المنع حتى سداد الدين */
    travel_ban_request_cycle_withdrawn_at?: string | null;
    /** تذكير قبل انتهاء الحبس بيومين */
    executive_detention_reminder_sent?: boolean;
    /** تأكيد يدوي: المدين حاضر أمام المنفذ (شرط طلب الحبس التنفيذي) */
    debtor_marked_present_for_detention?: boolean;
    /**
     * بعد إلقاء القبض فعلياً على المدين أو بدء حبس حضوري (غير غيابي) — تُخفى شارة «مذكرة قبض».
     * لا تُضبط عند الحبس الغيابي؛ تُعاد إلى false عند تسجيل «تم صدور أمر قبض» من جديد.
     */
    debtor_arrest_warrant_cleared_after_custody?: boolean;
    /** طلب الحبس التنفيذي بصفة غيابي — يُذكر في الطلب والشارة والسجل */
    executive_detention_request_in_absentia?: boolean;
    /**
     * بعد موافقة المنفذ على مفاتحة التحقيق: الجلسة مفتوحة حتى «تم حضور المدين» أو إكمال مسار القبض.
     * false يعيد إتاحة «إنشاء طلب مفاتحة» رغم بقاء صف موافَق عليه في التخزين.
     */
    personal_arrest_investigation_session_open?: boolean;
    /** بعد موافقة المنفذ على الحبس التنفيذي: موافقة أو رفض قاضي البداءة قبل تثبيت مدة الحبس */
    executive_detention_judge_outcome?: 'approved' | 'rejected' | null;
    /** معرّف صف قرار المنفذ الذي يُسمح بعده بتسجيل قرار قاضي البداءة (دورة واحدة) */
    executive_detention_judge_eligible_decision_id?: string | null;
    /** معرّف صف قرار قاضي البداءة المستقل عن طلب المنفذ */
    executive_detention_judge_decision_id?: string | null;
    /**
     * مرحلة مسار عرض الإضبارة/الحبس — منفصلة عن صفوف القرارات
     * idle: لا مسار | handed_to_judge: وافق المنفذ | judge_decided: سُجّل قرار القاضي | detention_active: المدة جارية
     */
    executive_dossier_phase?:
        | 'handed_to_judge'
        | 'judge_decided'
        | 'detention_active'
        | null;

    /** استئخار تنفيذ — تعطيل أدوات التنفيذ في الإضبارة */
    stay_of_execution?: {
        active: boolean;
        decision_number?: string;
        court_name?: string;
        next_hearing_date?: string;
    } | null;

    /** وفاة الدائن — مستقل عن وفاة المدين (يُفضّل على party_death_case القديم) */
    creditor_party_death_case?: {
        deceased_party: 'creditor';
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** وفاة المدين — مستقل عن وفاة الدائن */
    debtor_party_death_case?: {
        deceased_party: 'debtor';
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** وفاة طرف — مسار بلا ورثة (إغلاق إضبارة) أو إحلال ورثة */
    party_death_case?: {
        deceased_party: 'debtor' | 'creditor';
        /** قديم — لم يعد يُجمع من الواجهة */
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        /** death_only: إبلاغ أول دون إحلال؛ ثم النافذة تصبح «طلب إحلال مورث» فقط */
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** مسار تبليغ الورثة بعد إحلالهم (خاص بوفاة المدين) */
    heirs_notification_workflow?: {
        hasReceivedInitialNotice: boolean;
        /**
         * تتبّع مستقل لكل وريث (كل وريث له دورة حياة خاصة به):
         * مذكرة الإخبار (7 أيام) ← التكليف بالحضور (3 أيام) ← مفاتحة التحقيق ← حضور الوريث.
         */
        byHeir?: Record<
            string,
            {
                heirName: string;
                memoDate?: string | null;
                memoStatus?: 'none' | 'active' | 'attended' | 'closed_manual';
                summonDate?: string | null;
                summonStatus?: 'none' | 'active' | 'expired';
                investigationRequestStatus?: 'none' | 'requested';
                investigationDecisionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
                investigationDecisionId?: string | null;
                arrestWarrantStatus?: 'none' | 'issued';
                lastActionAt?: string | null;
            }
        >;
    } | null;

    /** إنهاء صفة موظف — اعتبار المدين كاسباً وإخفاء أداة حجز الراتب */
    debtor_kasab_termination?: {
        active: boolean;
        termination_date?: string;
    } | null;

    /**
     * إنهاء الحالة الوظيفية: اعتبار المدين كاسباً (بدون راتب).
     * بيانات قديمة قد تحتوي mode آخر — تُعامل كإنهاء فعلي عند القراءة فقط.
     */
    employment_termination?: {
        mode: 'no_salary';
        effective_date: string;
    } | null;

    /** وجهة مفاتحة حجز الراتب بعد التقاعد */
    garnishment_target?: 'employer' | 'national_retirement_board';

    /**
     * بعد موافقة المنفذ على طلب يصنَّف كـ «تبليغ/إخبار» في مركز القرارات —
     * يفتح مسارات الإجراءات الجبريّة المعتمدة على التبليغ (useDecisionDispatcher).
     */
    executor_coercive_unlock?: boolean;

    /** معرف الإضبارة الأم (في حالة التوحيد: parent-child relationship) */
    parentId?: string;
    /** رقم الإضبارة الأم المعروض (بعد التوحيد) */
    parentDisplayNumber?: string;

    transferPendingFileNumberChange?: boolean;

    /** رمز آمن لمشاركة الإضبارة (طلب توحيد الأضابير) */
    linkToken?: string;
    /** الأضابير الموحّدة مع هذه الإضبارة */
    linkedDossiers?: Array<{
        linkedId: string;
        type: 'own' | 'colleague';
        directorate?: string;
        fileNumber?: string;
        fileYear?: string;
        linkToken?: string;
        linkedAt: string;
    }>;

    /** سجل مخاطبات الإنابة (تبويب التحكم في الإضبارة) */
    inaba_correspondence_log?: Array<{
        id: string;
        subFileId: string;
        directorate: string;
        subject: string;
        requestDate: string;
        createdAt: string;
        status: 'pending_executor' | 'sent' | 'rejected';
        decisionRowId?: string;
        sentAt?: string;
    }>;

    /** جدول تقسيط شهري مبدئي لحجز الراتب بعد موافقة المنفذ على طلب الحجز */
    salary_garnishment_installment_schedule?: {
        executionDecisionId?: string;
        monthlyAmountIqd?: number;
        startDate?: string;
        notes?: string;
        createdAt: string;
    } | null;

    notificationCount?: number;
    executionFeeAdded?: boolean;
    isHolidayExtension?: boolean;
    
    // Documents
    documentDetails?: DocumentDetails | ShariaDeedDetails | CommercialPaperDetails;
    
    // Financial Ledger
    financialLedger?: LedgerEntry[];
    
    /** من نموذج فتح الإضبارة: مشاهدة واستصحاب */
    includesSleepover?: boolean;
    visitationChildrenNames?: string[];
    /** جدول مشاهدة واستصحاب — تأسيس + مواعيد سنة */
    visitationSchedule?: import('@/app/types/visitationSchedule').VisitationScheduleBundle;
    /** أثاث زوجية — قائمة القطع المحكوم بها */
    maritalFurnitureItems?: import('@/app/types/maritalFurniture').MaritalFurnitureItem[];
    maritalFurnitureDeliveryScheduleYmd?: string;
    maritalFurnitureDeliveryScheduleLabel?: string;
    maritalFurnitureDeliveryScheduledAt?: string;
    maritalFurnitureDeliveryRecordedAt?: string;
    /** نزع حضانة (قيمة المطالبة المخزّنة: تسليم ولد) */
    /** وفاة مستحقي النفقة المستمرة — تتبع جزئي دون إحلال ورثة */
    alimony_beneficiary_death?: {
        wife_deceased?: boolean;
        children_deceased_count?: number;
        last_report_at?: string;
    };
    custodyWardNames?: string[];
    /** مواعيد وتسليم المحضونين — نزع حضانة */
    custodyWardDelivery?: import('@/app/types/custodyWardDelivery').CustodyWardDeliveryBundle;
    /** تسليم شيء معين — وصف المحكوم به */
    specificDeliveryItemName?: string;
    /** تسليم شيء معين — منقول | غير منقول */
    specificDeliveryItemNature?: 'movable' | 'immovable';
    /** تسليم شيء معين — قائمة الأشياء المحكوم بتسليمها (متعددة) */
    specificDeliveryItems?: Array<{
        id: string;
        name: string;
        nature: 'movable' | 'immovable';
        status: 'pending' | 'financialized';
        financializedAmount?: number;
        financializedAt?: string;
        declaredDestroyed?: boolean;
        judgmentValueIqd?: number;
    }>;
    /** بعد تحويل المطالبة مالياً لتعذر التسليم */
    specificDeliveryFinancialized?: boolean;
    specificDeliveryConvertedAmount?: number;
    specificDeliveryFinancializedAt?: string;

    // ─── التبليغ والإحضار الجبري (محرك الحصانة) ───
    /** طبيعة المطالبة لغرض الإحضار؛ إن لم تُحدَّد تُستنتج من نوع الدعوى */
    summoningClaimNature?: 'مالي' | 'غير مالي';
    /** تعليم صريح: مطالبة نفقة (يُكمّل استنتاج claimType) */
    isAlimony?: boolean;
    /** هل راتب الموظف المحجوز يغطي النفقة المستحقة؟ */
    salaryCoversAlimony?: boolean;
    /** كفيل ضامن على مستوى الملف (يُكمّل بيانات المدين و executionTarget) */
    hasGuarantor?: boolean;
    /** طلب كفيل من محضر المتابعة — بيانات الكفيل تُكمَل في الملف بعد موافقة المنفذ */
    guarantor_followup?: {
        executor_approved: boolean;
        /** مصدر السجل — يمنع اختلاط الكفيل المالي مع التعهد الإجرائي */
        channel?: 'financial' | 'procedural';
        /** بعد موافقة المنفذ: لا تُعاد دورة الطلب حتى يُكمَل الحفظ هنا */
        details_saved?: boolean;
        guarantee_type?: 'amount' | 'attendance';
        guarantor_name?: string;
        guarantor_workplace?: string;
        /** راتب الكفيل الشهري (د.ع) إن وُجد */
        guarantor_salary_iqd?: number | null;
        /** مقدار الاستقطاع من راتب الكفيل (د.ع) إن وُجد */
        guarantor_deduction_iqd?: number | null;
        /** تعليم الدائن في الشارات بعد حفظ البيانات */
        creditor_notation_registered?: boolean;
    } | null;
    guarantor_followup_history?: Array<
        NonNullable<ExecutionFile['guarantor_followup']> & { archivedAt: string }
    >;
    /** كفالة/تعهد إجرائي عام — غير مرتبط بالمركز المالي أو نوع قرار محدد */
    procedural_guarantee?: {
        enabled: boolean;
        purpose?: string;
        guarantor_name?: string;
        pledge_amount_iqd?: number | null;
        deadline_ymd?: string | null;
        saved_at?: string;
        /** بعد الحفظ الناجح — تُغلق الحاوية وتُنقل البيانات لبطاقة الضامن */
        committed_to_followup?: boolean;
    } | null;
    procedural_guarantee_history?: Array<
        NonNullable<ExecutionFile['procedural_guarantee']> & { archivedAt: string }
    >;
    guarantor_notification?: {
        noticeDateYmd: string;
        reason: string;
        endedAt?: string | null;
        attendedAt?: string | null;
    } | null;
    forcedAttendanceIssued?: boolean;
    activeNoticeState?: string | null;
    debtorAttendedVoluntarily?: boolean;
    debtorEvaded?: boolean;
    arrestWarrantUnlocked?: boolean;
    executionTarget?: string;
    debtorArrested?: boolean;
    nonInterferenceIssued?: boolean;
    /** بعد أول إخبار = 1؛ يزيد مع كل إعادة إحالة بعد تحقق الغرض (تبليغ لاحق بلا مهلة) */
    summoningRound?: number;
    voluntaryAttendanceCount?: number;
    /** مسار الكاسب بعد مذكرة الإحضار الجبري */
    investigationCourtRequested?: boolean;
    /** تنازل صريح عن مسار مفاتحة التحقيق — تُخفى البطاقة حتى إعادة تسجيل «متخفي» */
    investigation_court_withdrawn_at?: string | null;
    investigationMemoIssued?: boolean;
    investigationPathDebtorPresent?: boolean;
    forcedPathAttendanceSecured?: boolean;

    /** تخلية مأجور / تسليم عقار — بيانات العين (إلزامية عند فتح الإضبارة بهذا النوع) */
    property_number?: string;
    /** المقاطعة */
    district?: string;
    property_type?: string;
    full_address?: string;

    /** تخلية: تجاري (لا مهلة تخلية سكنية) | سكني (مهلة تخلية بحد أقصى 90 يوماً) */
    eviction_premises_use?: 'commercial' | 'residential';
    /** تاريخ انتهاء مهلة التخلية التي يحددها المنفذ للعقار السكني (YYYY-MM-DD) */
    eviction_vacate_deadline?: string | null;
    /** أول يوم احتساب مدة مهلة التخلية السكنية (YYYY-MM-DD) — للعرض والسجل والتقويم */
    eviction_residential_grace_period_start?: string | null;
    /** سكني: موافقة المنفذ على منح المهلة (بعد تسجيل تاريخ انتهائها) */
    eviction_executor_vacate_grant_approved?: boolean;
    /** سكني: المحامي أنهى المهلة يدوياً قبل تاريخ الانتهاء (ISO) */
    eviction_residential_grace_manually_ended_at?: string | null;
    /** تخلية: القوة الجبرية (مرافقة جهة أمنية) — تظهر كشارة حتى الإتمام */
    eviction_police_assistance?: {
        decisionId: string;
        agencyName: string;
        dueYmd: string;
        savedAt: string;
        completedAt?: string | null;
    } | null;
    /** إظهار تبويب المحجوزات/الأموال في واجهة التخلية بعد طلب أتعاب أو مصاريف */
    eviction_assets_tab_unlocked?: boolean;
    /** مصاريف مباشرة على إضبارة التخلية (تتبع — لا تُدمج تلقائياً في المتبقي إلا إذا ربطت لاحقاً بدفعة) */
    eviction_case_expenses?: Array<{ id: string; amount: number; note: string; date: string }>;
    encroachment_case_expenses?: Array<{
        id: string;
        amount: number;
        note: string;
        date: string;
        requestTitle: string;
        workflowKey: string;
    }>;
    /** طُلِب صراحةً من المحامي صرف الأتعاب المحكومة (يشغّل احتساب رسم التحصيل 3% في مسار التخلية) */
    eviction_lawyer_fee_requested?: boolean;
    /** تاريخ أول إخبار بالتنفيذ — ثابت لحساب مهلة الـ7 أيام ولا يُستبدل بالتبليغات اللاحقة */
    eviction_first_notice_date?: string | null;
    /**
     * تخلية + كاسب — أول إخبار: هل أتعاب المحاماة مشمولة صراحةً في مذكرة الإخبار الأصلية.
     * false/غير مُحدَّد = مسار اعتيادي دون اعتبار الأتعاب جزءاً من صياغة المذكرة الأولى.
     */
    eviction_initial_notice_lawyer_fees_included?: boolean;
    /** آخر تبليغ لاحق (تخلية): هل عُيِّن صراحةً أن الغاية استحصال مؤيد من المنفذ */
    eviction_last_summons_for_collection?: boolean;
    /** عند تبليغ لاستحصال: فرع التبليغ العادي مقابل مسار الإحضار الجبري */
    eviction_last_collection_summons_branch?: 'ordinary' | 'coercive' | null;
    /** آلة حالات تبليغ الكاسب لاستحصال الأتعاب/المصاريف (واجهة التخلية) */
    eviction_earner_fee_collection_sm?: EvictionEarnerFeeCollectionSM;
    /** تخلية: عدم المطالبة بالأتعاب المحكومة عند فتح الإضبارة — إخفاء الأتعاب من الوعاء حتى التفعيل */
    eviction_lawyer_fee_waived_at_intake?: boolean;

    /**
     * تخلية: المحامي أعلن يدوياً انتهاء مدة التنفيذ الرضائي (بعد مرور 7 أيام تقويمية من اليوم التالي لتاريخ الإخبار الفعلي).
     * لا يُستبدل الاحتساب التلقائي بهذا الحقل إلا بعد الضغط على الزر المخصص.
     */
    eviction_voluntary_period_end_declared?: boolean;

    /** تخلية: تاريخ تبليغ الورثة (YYYY-MM-DD) — يضبطه المحامي دون إجبار */
    eviction_heirs_notification_date_ymd?: string | null;

    /**
     * حراس قضائيون — يدعم أكثر من حارس؛ كل سجل له اسم وراتب.
     */
    eviction_judicial_custodians?: Array<{
        id: string;
        fullName: string;
        salary: string;
        decisionId?: string;
        savedAt: string;
    }>;
    /** @deprecated يُستبدل بـ eviction_judicial_custodians — يُقرأ للتوافق مع ملفات قديمة */
    eviction_judicial_custodian?: {
        decisionId?: string;
        fullName: string;
        salary: string;
        savedAt: string;
    } | null;

    // ─── لوحة التنفيذ — حقول عرض/حالة (توافق نماذج قديمة وربط 1:1) ───
    creditorAttended?: boolean;
    /** إيقاف مؤقت للعرض — منفصل عن isPaused عند الحاجة */
    executionPaused?: boolean;
    debtorForcedToAttend?: boolean;
    executionFeeInjected?: boolean;
    executionNumber?: string;
    executionYear?: string;
    executionType?: string;
    classification?: string;
    lawyerFeesAmount?: number;
    clientFeesAmount?: number;
    monthlyAlimony?: number;
    accumulatedAlimony?: number;
    initiator?: string;
    representedParty?: string;
    daysSinceNotice?: number;
    isAlimonyCase?: boolean;
    lastPaymentDate?: string | null;
    shariaDeedNumber?: string;
    shariaRegisterNumber?: string;
    shariaIssueDate?: string;
    shariaIssuingCourt?: string;
    chequeBankName?: string;
    chequeIssueDate?: string;
    chequeNumber?: string;
    garnishmentAmount?: number;
    employeeSalary?: number;
    perDebtorSalaries?: Record<string, string>;
    perDebtorGarnishments?: Record<string, string>;
    pastWifeAlimony?: number;
    pastChildrenAlimony?: number;
    monthlyWifeAlimony?: number;
    monthlyChildrenAlimony?: number;
    childrenCount?: number;

    ghuramaDistributionLogs?: GhuramaDistributionLog[];
}

/** موافقة منفذ على الكفيل مع بيانات لم تُثبَّت بعد — حتى يُضغط «حفظ» صراحةً */
export function guarantorFollowupAwaitingDetailsSave(
    gf: ExecutionFile['guarantor_followup'] | null | undefined
): boolean {
    if (!gf?.executor_approved) return false;
    return gf.details_saved !== true;
}

/** إظهار شارة الكفيل لدى الدائن الأول بعد موافقة المنفذ (قبل أو بعد تثبيت البيانات) */
export function guarantorFollowupCreditorNotationActive(
    gf: ExecutionFile['guarantor_followup'] | null | undefined
): boolean {
    return gf?.executor_approved === true;
}

/** وصفية تبليغ لاحق في تخلية — كاسب */
export interface EvictionSubsequentSummonsMeta {
    forCollection: boolean;
    branch: 'ordinary' | 'coercive' | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionFormData {
    directorate: string;
    fileNumber: string;
    claimType: string;
    documentType: string;
    documentDate: string;
    executionDate: string;
    
    creditors: Party[];
    debtors: Party[];
    
    debtAmount: string;
    currency: Currency;
    courtFees: string;
    lawyerFees: string;
    
    // Alimony specific
    alimonyChildrenCount?: string;
    alimonyWifeAmount?: string;
    alimonyChildAmount?: string;
    
    // Document specific
    shariaDeedNumber?: string;
    shariaRegisterNumber?: string;
    shariaIssueDate?: string;
    shariaIssuingCourt?: string;
    
    paperNumber?: string;
    paperIssueDate?: string;
    paperDueDate?: string;
    paperDrawer?: string;
    paperDrawee?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL/COMPONENT PROPS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionDashboardProps {
    file?: ExecutionFile;
    executionId?: string;
    onClose: () => void;
    onUpdate?: (file: ExecutionFile) => void;
}

export interface FinancialOperationsCenterProps {
    executionId: string;
    debtAmount: number;
    courtFees: number;
    directorateFees: number;
    clientFees: number;
    lawyerFees: number;
    paidDebt: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    remaining: number;
    currency: Currency;
    onPayment: (payment: PaymentRecord) => void;
}

export interface TimelineEventCardProps {
    event: TimelineEvent;
    onUpdate?: (event: TimelineEvent) => void;
    onDelete?: (eventId: string) => void;
}

export interface PartyCardProps {
    party: Party;
    type: 'creditor' | 'debtor';
    onUpdate?: (party: Party) => void;
    onDelete?: (partyId: string | number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════

export default {
    // Types are exported individually above
};
