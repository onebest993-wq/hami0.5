/**
 * Seized assets, property/movable workflows, third-party seizure, marks, summons.
 */

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
