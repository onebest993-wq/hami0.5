import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import type {
    ExecutionFile,
    RealEstateSeizureAsset,
    SeizedAsset,
    ThirdPartySeizureAsset,
    StandaloneExecutionMark,
} from '@/app/types/execution';

export type PartyBadgeParty = 'creditor' | 'debtor';

export type MemoBadgeInfo = {
    anchor: string;
    remaining: number;
    graceExpired: boolean;
};

export type PublicationNoticeBadgeInfo = {
    publicationDateYmd: string;
    deadlineYmd: string;
    remaining: number;
    graceExpired: boolean;
    newspaper1: string;
    newspaper2: string;
    recordedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
};

export type RegularTablighBadgeInfo = {
    noticeDateYmd: string;
    purpose: string;
    recordedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
};

export type AbsenceBadgeInfo = { label: string; className: string };

/** شارة تكليف بالحضور — الغاية والمدة من البطاقة */
export type TaklifAssignmentBadgeInfo = {
    purpose: string;
    notifyDateYmd: string;
    deadlineYmd: string;
    phase: 'active' | 'absent_declared' | 'investigation_pending' | 'warrant_ui';
    /** null إن لا يُحسب أجل */
    remainingDays: number | null;
    cycleGeneration?: number;
    confirmedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
    durationDays?: number;
};

export type EvictionGraceBadgeInfo = {
    startYmd: string;
    endYmd: string;
    daysTotal: number;
    remainingDays: number;
};

export type PoliceAssistanceBadgeInfo = {
    agencyName: string;
    dueYmd?: string;
    remainingDays?: number;
};

export type TimelineLite = {
    title?: string;
    description?: string;
    date?: string;
    timestamp?: string;
};

export type PartyInteractiveBadge = {
    id: string;
    shortLabel: string;
    Icon: LucideIcon;
    tone: 'amber' | 'slate' | 'emerald' | 'sky' | 'rose' | 'orange' | 'indigo' | 'violet';
    /** أسطر التفاصيل داخل الـ popover */
    detailLines: { k: string; v: string }[];
    /** عند النقر يفتح واجهة أخرى (مذكرة / تكليف حضور) */
    onActivate?: () => void;
    onDismiss?: () => void;
    dismissLabel?: string;
    dismissVariant?: 'hide' | 'complete';
    /** إخفاء عبر التخزين المحلي فقط */
    dismissMode: 'local' | 'callback';
};

export type ExecutionPartyInteractiveBadgesProps = {
    executionId: string;
    party: PartyBadgeParty;
    isPrimaryDebtor: boolean;
    executionData: ExecutionFile | null | undefined;
    activeCoerciveActions: string[];
    seizedAssets: SeizedAsset[];
    realEstateSeizureAssets?: RealEstateSeizureAsset[];
    thirdPartySeizureAssets?: ThirdPartySeizureAsset[];
    standaloneExecutionMarks?: StandaloneExecutionMark[];
    timelineEvents: TimelineLite[];
    hasGuarantor: boolean;
    memoBadge: MemoBadgeInfo | null;
    publicationNoticeBadge?: PublicationNoticeBadgeInfo | null;
    onPublicationNoticeActivate?: () => void;
    onMemoActivate?: () => void;
    absenceBadge: AbsenceBadgeInfo | null;
    onDismissAbsence?: () => void;
    showSummonsBadge: boolean;
    onSummonsActivate?: () => void;
    regularTablighBadge?: RegularTablighBadgeInfo | null;
    onDismissRegularTablighBadge?: () => void;
    debtorArrested?: boolean;
    forcedAttendancePending?: boolean;
    /** افتراضياً true؛ عيّن false للمدين الموظف (لا شارات طلبات التنفيذ الجبري الشخصي من القرارات) */
    personalCoerciveDecisionBadges?: boolean;
    /** المدين موظف — شارة «حجز راتب» للمدين فقط (الكفيل له مسار منفصل) */
    debtorIsEmployee?: boolean;
    /** يزيد عند تحديث قرارات المنفذ المحلية لتمرير الشارات */
    decisionsReloadEpoch?: number;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    /** بعد موافقة المنفذ على طلب الكفيل — حفظ بيانات الكفيل في الملف */
    onPersistGuarantorFollowup?: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: { salaryIqd: number | null; deductionIqd: number | null }
    ) => void;
    taklifAssignmentBadge?: TaklifAssignmentBadgeInfo | null;
    onTaklifAssignmentActivate?: () => void;
    onDismissTaklifAssignmentBadge?: () => void;
    onDismissPublicationNoticeBadge?: () => void;
    evictionGracePinned?: boolean;
    onToggleEvictionGracePinned?: () => void;
    evictionGraceBadge?: EvictionGraceBadgeInfo | null;
    onEvictionGraceActivate?: () => void;
    onCompleteEvictionGrace?: () => void;
    policeAssistanceBadge?: PoliceAssistanceBadgeInfo | null;
    onPoliceAssistanceActivate?: () => void;
    onCompletePoliceAssistance?: () => void;
    /** تراجع عن منع السفر — إخفاء الشارة وإعادة دورة الطلب */
    onWithdrawTravelBan?: () => void;
    /** معاينة تاريخية — منع فتح الشارات والتعديل */
    isHistoricalMode?: boolean;
    /** داخل صف موحّد مع شارات المحجوزات — بدون غلاف flex منفصل */
    embeddedInRow?: boolean;
    /** حالة حضور محلية — تسبق executionData عند التسجيل الفوري */
    debtorAttendedVoluntarily?: boolean;
    voluntaryAttendanceCount?: number;
};
