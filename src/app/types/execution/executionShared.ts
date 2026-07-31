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
    /** تكليف بالحضور وتبليغات الموظف/المدين */
    | 'summons'
    /** محاضر وإجراءات (وفاة طرف، حالة الإضبارة، كفيل…) */
    | 'procedure'
    /** مخاطبات الجهات الرسمية */
    | 'communication'
    /** التخلية: مهلة سكنية واستعانة بالشرطة */
    | 'eviction'
    /** حركات المركز المالي غير الدفعات (فتح وعاء المطالبة…) */
    | 'action'
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
    snapshot?: unknown;
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
