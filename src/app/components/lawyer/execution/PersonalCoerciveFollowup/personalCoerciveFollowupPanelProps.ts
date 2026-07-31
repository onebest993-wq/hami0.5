import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { HiddenPersonalCoerciveRequestKey } from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';

export interface PersonalCoerciveFollowupPanelProps {
    executionId: string | undefined;
    decisionsReloadEpoch: number;
    coerciveUiLocked: boolean;
    /** مهلة الإخبار انتهت أو مسار جاهز للإجراءات الجبرية */
    gracePeriodEndedFlag: boolean;
    /** يُسمح بمسار الإحضار الجبري وفق محرك الحصانة */
    forcedSummonAllowed: boolean;
    forcedSummonLockReason?: string;
    executionData: ExecutionFile | null;
    debtorPresentEffective: boolean;
    debtRemainingIqd: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: {
            decisionsLink?: boolean;
            decisionsTab?: 'current' | 'previous' | 'appeals';
            decisionId?: string;
            action?: { label: string; onClick: () => void };
        }
    ) => void;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
    onOpenSummonsCenter: () => void;
    /** طلب كفيل ضامن — يُسجَّل لدى منفذ العدل للبتّ */
    onGuarantorRequest?: () => void;
    /** فتح واجهة إكمال بيانات الكفيل (شارة المدين) بعد موافقة المنفذ دون حفظ */
    onOpenGuarantorDetails?: () => void;
    /** بعد إنهاء وظيفة — إبراز إجراءات الإكراه المقترحة */
    kasabCoerciveEmphasis?: boolean;
    /**
     * للمدين الكاسب فقط: فتح مسارات الإحضار/المفاتحة/الحبس دون انتظار مهلة إخبار أو محرك الحصانة.
     * لا يؤثر على مسار الموظف.
     */
    kasabRelaxedGates?: boolean;
    /** مفتاح المدين النشط في الذمة المقسومة */
    activeDebtorKey?: string;
    /** مفتاح المدين الأساسي للتوافق مع الطلبات القديمة */
    primaryDebtorKey?: string;
    /** معاينة تاريخية — تعطيل أزرار الإكراه والطلبات */
    isHistoricalMode?: boolean;
    /** استحصال مالي + موظف: إخفاء عرض الإضبارة على قاضي البداءة وقرار الحبس */
    hideDossierJudgePresentation?: boolean;
    /** إخفاء بطاقة قرار القاضي بالحبس فقط (≥ 500,000 د.ع في مسار المركز المالي) */
    hideExecutiveDetentionJudgeCard?: boolean;
    /** مسار كاسب + مركز مالي > 250,000 — إجراءات متبقية اختيارية (منع سفر / عرض إضبارة) */
    earnerFinancialPersonalCoerciveActive?: boolean;
    /** استحصال مالي + موظف: إخفاء تفعيل الإحضار بقرار المنفذ */
    hideExecutorForcedBringActivation?: boolean;
    /** المدين موظف — لا مفاتحة تحقيق ولا عرض إضبارة ولا حبس */
    activeDebtorIsEmployee?: boolean;
    /** من الطلبات المخفية — إظهار مسار واحد فقط بنفس دورة الحياة الكاملة */
    embeddedHiddenPath?: HiddenPersonalCoerciveRequestKey;
}
