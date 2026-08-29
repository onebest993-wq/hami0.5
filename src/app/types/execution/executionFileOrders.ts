/**
 * ExecutionFile domain slice: ExecutionFileOrders.
 */
import type { LedgerEntry } from './financial';
import type { CommercialPaperDetails, DocumentDetails, ShariaDeedDetails } from './document';

export interface ExecutionFileOrders {
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
}
