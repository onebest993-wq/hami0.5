import type {
    EmployeeSummonsAssignmentState,
    EvictionSubsequentSummonsMeta,
    PublicationNoticeDebtorState,
} from '@/app/types/execution';
import type { SummonsProfile } from './summonsHubHelpers';

export interface UnifiedSummonsHubProps {
    isOpen: boolean;
    onClose: () => void;
    /** عند فتح المركز من شارة (مثلاً التبليغ بالنشر) */
    initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    onDebtorNotification: (
        date: string,
        purpose: string,
        isHolidayExtension?: boolean,
        evictionSubsequentMeta?: EvictionSubsequentSummonsMeta,
        /** أول إخبار — تخلية كاسب: شمول أتعاب المحاماة في المذكرة الأصلية (undefined إن لم يَنطبق) */
        initialNoticeLawyerFeesIncluded?: boolean,
        notifyOpts?: { forceExecutionMemo?: boolean }
    ) => void;
    notificationCount: number;
    /** بعد الإخبار الأول: يُسمح بتبليغ لاحق فقط بعد حضور/تأمين إحضار (يُمرَّر من لوحة التنفيذ) */
    subsequentNoticeUnlocked?: boolean;
    /**
     * إن true: يُعرض حقل «نوع التبليغ والغاية» ويُدمَج في الطلب فقط عندما subsequentNoticeUnlocked (مسار موظف/كاسب غير تخلية).
     * إن false (هجين/تخلية): يُتعامل مع الحقل كما بعد التبليغ الأول دون هذا القفل الإضافي.
     */
    noticeKindGoalStrictBinding?: boolean;
    canForceSummon?: boolean;
    forceSummonLockReason?: string;
    isGovernmentEmployee?: boolean;
    hasSalaryCoerciveStep?: boolean;
    onRegisterDebtorVoluntaryAttendance?: () => boolean | void;
    onOpenCoerciveModal?: () => void;
    summonsProfile?: SummonsProfile;
    summoningRound?: number;
    earnerForcedActionUnlocked?: boolean;
    forcedAttendanceIssued?: boolean;
    onEarnerIssueForcedMemo?: () => void;
    /** تخلية: واجهة مبسّطة (بدون شريط المهلة/تمديد العطلة) + زر إعلان انتهاء المدة الرضائية */
    summonsEvictionSimplifiedUi?: boolean;
    showEvictionVoluntaryPeriodEndButton?: boolean;
    onEvictionVoluntaryPeriodEnd?: () => void;
    /** تخلية: حضور المدين وفتح التنفيذ — حصراً من تبويب المدين (لا من مودال التنفيذ) */
    evictionDebtorExecutionStrip?: {
        visible: boolean;
        showAttendanceButton: boolean;
        showCoerciveButton: boolean;
        onRegisterAttendance?: () => void;
        onOpenCoercive?: () => void;
    };
    /** لصياغة عناوين التبليغ الثاني+ (موظف مقابل كاسب) */
    debtorIsGovernmentEmployee?: boolean;
    /** تخلية: إخفاء إحضار جبري واختصارات الإكراه أثناء مهلة الإخبار الأولى أو للموظف دائماً في هذا المسار */
    evictionSummonsPipelineCoerciveLocked?: boolean;
    /** تخلية + كاسب + موافقة منفذ على الاستحصال: يُسمح بإظهار خيار «التبليغ لغرض الاستحصال» ثم الفرع عادي/جبري */
    evictionEarnerCollectionBranchEligible?: boolean;
    /**
     * تخلية — أول إخبار فقط: إظهار «هل أتعاب المحاماة مشمولة في مذكرة الإخبار الأصلية؟»
     * يُعرض فقط إذا كانت الإضبارة أصلاً تتضمن مطالبة بأتعاب محكومة عند الفتح (لا يُعرض إن تنازل المحامي عنها عند الإنشاء).
     */
    showInitialNoticeLawyerFeesMemoOption?: boolean;
    debtorEvaded?: boolean;
    onEarnerMarkDebtorEvading?: () => void;
    /** غير تخلية: زر إعلان انتهاء المدة الرضائية بعد 7 أيام تقويمية */
    showNoticeVoluntaryPeriodEndButton?: boolean;
    onNoticeVoluntaryPeriodEnd?: () => void;
    tablighTask?: { noticeDateYmd: string; purpose: string } | null;
    onTerminateTablighTask?: () => void;
    guarantorNotificationFeature?: {
        enabled: boolean;
        /** فتح المركز من بطاقة الكفيل — يُعرض «تبليغ الكفيل» فقط دون «التبليغ» العام */
        contextOnly?: boolean;
        state:
            | { noticeDateYmd: string; reason: string; endedAt?: string | null; attendedAt?: string | null }
            | null
            | undefined;
        onRegister: (p: { noticeDateYmd: string; reason: string }) => void;
        onAttend: () => void;
        onTerminate: () => void;
    };
    /** تبويب «التكليف بالحضور» — مدين موظف (غير تخلية) بعد مذكرة الإخبار */
    employeeAssignmentFeature?: {
        enabled: boolean;
        state: EmployeeSummonsAssignmentState | null | undefined;
        onConfirm: (p: { purpose: string; notifyDate: string; durationDays: number }) => void;
        onAttend: () => void;
        onDeclareAbsent: () => void;
        onTerminate: () => void;
        onRequestInvestigation: () => void;
        onRegisterArrestOrder: () => void;
        onRequestForcedBring: () => void;
        /** قرارات المنفذ — طلب إحضار جبري ضمن مسار التكليف (مرحلة أمر القبض) */
        forcedBringPending?: boolean;
        forcedBringApprovedAwaitingOutcome?: boolean;
        forcedBringRejected?: boolean;
        onWarrantDebtorBrought: () => void;
        onWarrantTerminate: () => void;
    };
    /** تبويب «التبليغ بالنشر» — بعد أول إخبار مسجّل */
    publicationNoticeFeature?: {
        state: PublicationNoticeDebtorState | null;
        onRegister: (p: {
            publicationDateYmd: string;
            newspaper1: string;
            newspaper2: string;
        }) => void;
        /** إنهاء دورة التبليغ بالنشر يدوياً */
        onTerminate: () => void;
        /** إنهاء الدورة لأن المدين حضر */
        onDebtorAttended: () => void;
    };
    /** معرّف الإضبارة لاستخدامه في مفاتيح localStorage الخاصة بسير الإخبار */
    executionId?: string;

    /** تاريخ الإخبار/التبليغ الفعلي المحفوظ (للتمثيل داخل المودال) */
    /** إخفاء التبليغ بالنشر — مدين موظف */
    suppressPublicationNotice?: boolean;
    executionSummonsNoticeDateYmd?: string | null;

    /** هل انتهت دورة مذكرة الإخبار لهذه الإضبارة (حضور أو انتهاء مهلة) */
    executionSummonsArchived?: boolean;
    /** تبويب التكليف بالحضور — مدين موظف (غير تخلية) بعد أرشفة الإخبار */
    showEmployeeTaklifHubTab?: boolean;
}
