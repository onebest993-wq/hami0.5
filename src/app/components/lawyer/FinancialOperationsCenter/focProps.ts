import type { PastAlimonyClaimSnapshot } from '@/app/utils/alimonyFinancialBreakdown';
import type { AlimonyBeneficiaryDeathState } from '@/app/utils/alimonyBeneficiaryDeathUtils';
import type { DebtorAgentSeizedItem } from './components/DebtorAgentFinancialHubPanel';

export interface FinancialOperationsCenterProps {
    isExpanded: boolean;
    onToggle: () => void;
    activeTab: number;
    onTabChange: (tab: number) => void;

    principal_amount: number;
    court_ordered_fees: number;
    execution_expenses_sum: number;
    totalOwed: number;
    remaining: number;
    feesTotal: number;
    financialStatus: { label: string; color: string; pulse: boolean };

    isNonFinancialClaim: boolean;
    isAlimonyClaim: boolean;
    claimType: string;
    claimTypes?: string[];

    paidDebt: number;
    totalWithExecutionFee: number;
    executionFee: number;
    shouldCalculateExecutionFee: boolean;

    monthlyAlimony: number;
    accumulatedAlimony: number;
    past_wife_alimony?: number;
    past_children_alimony?: number;
    monthly_wife_alimony?: number;
    monthly_children_alimony?: number;
    children_count?: number;
    alimonyCalculated?: {
        baseAccumulation?: number;
        wifeBaseAccumulation?: number;
        childrenBaseAccumulation?: number;
        baseDurationDays?: number;
        baseDurationMonths?: number;
        pastAccumulation?: number;
        pastDurationDays?: number;
        pastDurationMonths?: number;
        totalAccumulated?: number;
    } | null;
    pastAlimonyClaim?: PastAlimonyClaimSnapshot | null;
    alimony_blob?: Record<string, unknown> | null;
    alimony_beneficiary_death?: AlimonyBeneficiaryDeathState | null;

    courtFees: number;
    directorateFees: number;
    clientFees: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;

    daysSinceNotice: number;
    gracePeriodEnded: boolean;
    debtorJob: string;
    debtorEmploymentType?: string;
    debtorKinship: string;
    initiator: string;

    onPayment: () => void;
    onSettlement: () => void;
    onCoerciveAction: (action: string) => void;

    executionStatus?: string;
    statusMetadata?: unknown;
    isPaused?: boolean;

    onShowLedger?: () => void;
    onShowSeizureLog?: () => void;
    financialLedger?: Array<{
        id: string;
        date: string;
        type: 'payment' | 'fee' | 'settlement';
        amount: number;
        description: string;
        balance: number;
    }>;

    executionId?: string;
    creditorsCount?: number;
    ghuramaaCreditors?: Array<{
        creditorId: string;
        creditorName: string;
        debtBeforeDistribution: number;
        remainingDebt: number;
    }>;
    onApplyGhuramaaDistribution?: (args: {
        transactionId: string;
        dateIso: string;
        totalAmountDistributed: number;
        distributionDetails: Array<{
            creditorId: string;
            creditorName: string;
            debtBeforeDistribution: number;
            amountDistributed: number;
        }>;
    }) => void;

    evictionFinanceStrip?: {
        expensesSum: number;
        expenseRows: number;
        onRecordExpense: () => void;
        onRequestLawyerFees: () => void;
        lawyerFeeRequestDisabled?: boolean;
        lawyerFeeRequestTitle?: string;
    };
    eviction_case_expenses_sum?: number;

    onFundsLedgerPayment?: (args: {
        amount: number;
        kind: 'full' | 'partial';
        description: string;
    }) => void;
    onFinancialTimelineNote?: (title: string, description: string) => void;
    onGuarantorRequest?: () => void;

    onMonthlySettlementDefault?: (args: { dueDate: string; amount: number }) => void;
    onMonthlySettlementPaid?: (args: { dueDate: string; nextDueDate: string; amount: number }) => void;
    /** ترحيل النفقة المستمرة غير المسددة إلى أصل الوعاء (المتبقي) */
    onAlimonyOngoingAccrued?: (args: {
        dueDate: string;
        accruedAmount: number;
        billableDays: number;
        newPrincipalTotal: number;
        monthlyRate: number;
    }) => void;

    /** بعد تسجيل طلب الاستحصال — مثلاً فتح «القرارات والطعون» */
    onAfterCollectionRequestSubmitted?: () => void;

    /** تخلية: عدم المطالبة بالأتعاب المحكومة عند فتح الإضبارة — إخفاء الأتعاب من الوعاء الموحّد */
    evictionLawyerFeeWaivedAtIntake?: boolean;

    /** تخلية: أتعاب محكومة في الإضبارة لكن وُقِف طلبها عند الفتح — زر لإعادة تفعيل المطالبة */
    evictionReenableCourtOrderedFees?: { grossAmount: number; onEnable: () => void };

    /**
     * عند إضافة بند أتعاب من الوعاء الموحّد بينما كانت الإضبارة مُعلَّمة بعدم المطالبة بالأتعاب عند الفتح —
     * يُحدَّث الملف (إلغاء التنازل + مبلغ الأتعاب) ليتوافق مع «إدخال أتعاب لاحقاً».
     */
    onEvictionCourtOrderedFeesActivatedFromLedger?: (totalLawyerFeesInLedger: number) => void;
    onEvictionLedgerActivated?: () => void;
    evictionLedgerActivatedPersisted?: boolean;

    /** داخل نافذة «المركز المالي»: بدون إطار البطاقة المزدوج ورأس الطي/التوسيع */
    embeddedInFinancialHub?: boolean;
    onManualDebtTotalsUpdated?: (payload: {
        principalSnapshot: number;
        totalOwed: number;
        remaining: number;
    }) => void;
    onToast?: (
        message: string,
        variant?: 'success' | 'error' | 'warning' | 'info',
        options?: { decisionsLink?: boolean }
    ) => void;
    autoOpenLedgerMode?: 'disburse' | null;
    onAutoOpenHandled?: () => void;
    /** منقول مرتبط بصرف حصيلة البيع — يُمرَّر مع hami-trust-disbursed */
    proceedsDisburseSeizedMovableId?: string | null;
    onProceedsDisburseHandled?: () => void;
    /** عقار مرتبط بصرف حصيلة البيع — يُمرَّر مع hami-trust-disbursed */
    proceedsDisburseSeizedPropertyId?: string | null;
    onProceedsDisbursePropertyHandled?: () => void;

    /** سجل حجز الراتب — لاستبعاد التسوية */
    salarySeizureRegistryAssets?: unknown[];
    /** إلغاء مسار حجز الراتب عند اختيار الإبقاء على التسوية */
    onClearSalarySeizurePath?: () => void;

    /** وكيل المدين — واجهة مالية مبسّطة */
    isRepresentingDebtor?: boolean;
    debtorAgentSeizedItems?: DebtorAgentSeizedItem[];

    /** وفاة المدين — يُخفى عرض النفقة المستمرة الشهرية دون إغلاق الإضبارة */
    activeDebtorIsDeceased?: boolean;
}
