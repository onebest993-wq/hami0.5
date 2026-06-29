// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    CreditCard,
    ChevronDown,
    ChevronUp,
    HeartHandshake,
    CheckCircle,
    History,
    Send,
    X,
    Handshake,
    BadgeCheck,
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    appendEvictionExecutorRequest,
    appendPendingExecutorSeizureDecision,
    appendSpecialFollowupRequest,
    DECISIONS_RELOAD_EVENT,
    getLatestUnifiedCollectionDecisionState,
    hasApprovedUnifiedCollection,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
    type SeizureRequestSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { unifiedFundsLedgerStorageKey } from '@/app/utils/unifiedFundsLedgerStorage';
import {
    executionGarnishmentDetailsStorageKey,
    executionGarnishmentFlagStorageKey,
} from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { AlimonyFinancialBlock } from './AlimonyFinancialBlock';
import { GuarantorRegistrationModal } from './Modal_Guarantor_Registration';
import {
    initializeAlimonyData,
    loadAlimonyDataFromExecution,
    registerGuarantor,
    saveAlimonyDataToExecution,
    type AlimonyData,
    type GuarantorInfo,
} from '@/app/utils/alimonyPaymentEngine';
import { splitAmountEqually } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { resolveAlimonyFinancialBreakdown, isPastAlimonyOnlyClaim } from '@/app/utils/alimonyFinancialBreakdown';
import {
    resolveOngoingAlimonyMonthlyDisplay,
    shouldSuppressOngoingAlimonyMonthlyUi,
    type AlimonyBeneficiaryDeathState,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';
import type { PastAlimonyClaimSnapshot } from '@/app/utils/alimonyFinancialBreakdown';
import type { ExecutionFile } from '@/app/types/execution';
import { isEvictionClaim, isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { publishFinancialCenterTimelineNote } from '@/app/utils/financialCenterTimeline';
import type { TimelineEventType } from '@/app/types/execution';
import LedgerExpenseEditCluster from './FinancialOperationsCenter/components/LedgerExpenseEditCluster';
import { FocModalPortal } from './FinancialOperationsCenter/components/FocModalPortal';
import { DebtTotalsEditModal } from './FinancialOperationsCenter/components/DebtTotalsEditModal';
import { StandardFinancialLedger } from './FinancialOperationsCenter/components/StandardFinancialLedger';
import { UnifiedLedgerSettlementPanel } from './FinancialOperationsCenter/components/UnifiedLedgerSettlementPanel';
import { ReactiveSettlementEntry } from './FinancialOperationsCenter/components/ReactiveSettlementEntry';
import { SettlementBuriedKebab } from './FinancialOperationsCenter/components/SettlementBuriedKebab';
import {
    DebtorAgentFinancialHubPanel,
} from './FinancialOperationsCenter/components/DebtorAgentFinancialHubPanel';
import { resolveSettlementUxTier } from './FinancialOperationsCenter/settlementUxMatrix';
import { isFinancialDebtCollectionClaim } from '@/app/utils/followupSpecializationVisibility';
import { resolveSettlementContext } from './FinancialOperationsCenter/settlementContext';
import { applySettlementBreachCancellation } from './FinancialOperationsCenter/settlementGuarantorGate';
import { applyOngoingAlimonyBreachAccrual } from './FinancialOperationsCenter/alimonyOngoingAccrual';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    SETTLEMENT_DEFAULT_DUE_DAYS,
    clearSettlementFromStore,
    hasActiveSalarySeizurePath,
    promptSettlementSalaryConflictChoice,
    resolveSettlementBlockedBySalarySeizure,
} from './FinancialOperationsCenter/settlementSalaryExclusion';
import {
    applyManualDebtTotalsEdit,
    computeTrustBalanceFromPayments,
    computeTotalOwedUnifiedFromStore,
    emptyStore,
    freezeLedgerForCollection,
    hasFrozenLedgerRows,
    isUnifiedLedgerLocked,
    parseUnifiedLedgerFromStorage,
    pickRicherLedgerStore,
    resolvePersistedLedgerStore,
    notifyUnifiedLedgerUpdated,
    storageKey,
    isEmployeeDebtor,
    parseAmount,
    parseStoredMoney,
    formatIqdDisplay,
    formatNumberInput,
    invalidPositiveAmountMessage,
    extractYmd,
    localYmdToDate,
    formatLocalYmd,
    addDaysToYmd,
    diffDaysYmd,
    addMonthsToYmd,
    resolveSettlementDuePhase,
    resolvePrincipalBasisFromStore,
    shouldShowSettlementDueActions,
    type UnifiedLedgerTotalParams,
} from './FinancialOperationsCenter/utils';
import {
    MANAGEMENT_CARD_OUTER,
    SECTION_GLASS,
    LINK_RETRACT_COLLECTION,
    BTN_FULL_PAY,
    BTN_GARNISH,
    BTN_SETTLEMENT_APPLY,
} from './FinancialOperationsCenter/constants';
import type {
    UnifiedLedgerStore,
    LawyerFeeRow,
    ExpenseRow,
    LocalPaymentRow,
    PendingSettlement,
} from './FinancialOperationsCenter/types';

// ═══════════════════════════════════════════════════════════════════════════
// إدارة الأموال — مسار التخلية معزول عن مسار التنفيذ المالي القياسي
// ═══════════════════════════════════════════════════════════════════════════

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
     * عند إضافة بند أتعاب من الوعاء الموحّد بينما كانت الإضبارة مُعلَّمة بعدم المطالبة بالأتعاب عند الفتح —
     * يُحدَّث الملف (إلغاء التنازل + مبلغ الأتعاب) ليتوافق مع «إدخال أتعاب لاحقاً».
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
    /** منقول مرتبط بصرف حصيلة البيع — يُمرَّر مع hami-trust-disbursed */
    proceedsDisburseSeizedMovableId?: string | null;
    onProceedsDisburseHandled?: () => void;
    /** عقار مرتبط بصرف حصيلة البيع — يُمرَّر مع hami-trust-disbursed */
    proceedsDisburseSeizedPropertyId?: string | null;
    onProceedsDisbursePropertyHandled?: () => void;

    /** سجل حجز الراتب — لاستبعاد التسوية */
    salarySeizureRegistryAssets?: unknown[];
    /** إلغاء مسار حجز الراتب عند اختيار الإبقاء على التسوية */
    onClearSalarySeizurePath?: () => void;

    /** وكيل المدين — واجهة مالية مبسّطة */
    isRepresentingDebtor?: boolean;
    debtorAgentSeizedItems?: import('./FinancialOperationsCenter/components/DebtorAgentFinancialHubPanel').DebtorAgentSeizedItem[];

    /** وفاة المدين — يُخفى عرض النفقة المستمرة الشهرية دون إغلاق الإضبارة */
    activeDebtorIsDeceased?: boolean;
}



export const FinancialOperationsCenter: React.FC<FinancialOperationsCenterProps> = React.memo(function FinancialOperationsCenter({
    isExpanded,
    onToggle,
    activeTab: _activeTab,
    onTabChange: _onTabChange,
    principal_amount,
    court_ordered_fees,
    execution_expenses_sum,
    remaining: _remainingFromDashboard,
    financialStatus,
    isNonFinancialClaim,
    isAlimonyClaim,
    claimType,
    claimTypes,
    paidDebt,
    executionFee,
    shouldCalculateExecutionFee,
    monthlyAlimony,
    accumulatedAlimony,
    past_wife_alimony,
    past_children_alimony,
    monthly_wife_alimony,
    monthly_children_alimony,
    children_count,
    alimonyCalculated,
    pastAlimonyClaim,
    alimony_blob = null,
    alimony_beneficiary_death = null,
    daysSinceNotice: _daysSinceNotice,
    gracePeriodEnded: _gracePeriodEnded,
    debtorJob,
    debtorEmploymentType,
    debtorKinship,
    onPayment,
    onSettlement,
    onCoerciveAction,
    onShowLedger,
    onShowSeizureLog,
    financialLedger = [],
    executionId,
    creditorsCount,
    ghuramaaCreditors,
    onApplyGhuramaaDistribution,
    evictionFinanceStrip,
    eviction_case_expenses_sum = 0,
    onFundsLedgerPayment,
    onFinancialTimelineNote,
    onGuarantorRequest,
    onMonthlySettlementDefault,
    autoOpenLedgerMode,
    onAutoOpenHandled,
    proceedsDisburseSeizedMovableId,
    onProceedsDisburseHandled,
    proceedsDisburseSeizedPropertyId,
    onProceedsDisbursePropertyHandled,
    onMonthlySettlementPaid,
    onAlimonyOngoingAccrued,
    onAfterCollectionRequestSubmitted,
    evictionLawyerFeeWaivedAtIntake = false,
    evictionReenableCourtOrderedFees,
    onEvictionCourtOrderedFeesActivatedFromLedger,
    onEvictionLedgerActivated,
    evictionLedgerActivatedPersisted = false,
    embeddedInFinancialHub = false,
    onManualDebtTotalsUpdated,
    onToast,
    salarySeizureRegistryAssets = [],
    onClearSalarySeizurePath,
    isRepresentingDebtor = false,
    debtorAgentSeizedItems = [],
    activeDebtorIsDeceased = false,
}) {
    const notify = useCallback(
        (
            message: string,
            variant: 'success' | 'error' | 'warning' | 'info' = 'warning',
            options?: { decisionsLink?: boolean }
        ) => {
            if (onToast) onToast(message, variant, options);
            else {
                if (variant === 'success') SmartToast.success(message);
                else if (variant === 'error') SmartToast.error(message);
                else if (variant === 'info') SmartToast.info(message);
                else SmartToast.warning(message);
            }
        },
        [onToast]
    );

    const proceedsDisburseMovableIdRef = React.useRef<string | null>(null);
    React.useEffect(() => {
        const id = String(proceedsDisburseSeizedMovableId || '').trim();
        if (id) proceedsDisburseMovableIdRef.current = id;
    }, [proceedsDisburseSeizedMovableId]);

    const proceedsDisbursePropertyIdRef = React.useRef<string | null>(null);
    React.useEffect(() => {
        const id = String(proceedsDisburseSeizedPropertyId || '').trim();
        if (id) proceedsDisbursePropertyIdRef.current = id;
    }, [proceedsDisburseSeizedPropertyId]);

    const openDecisionsCenter = useCallback(() => {
        if (!executionId) return;
        try {
            window.dispatchEvent(
                new CustomEvent('hami-open-decisions-modal', {
                    detail: { executionId },
                })
            );
        } catch {
            /* ignore */
        }
    }, [executionId]);

    const recordFinancialTimelineNote = useCallback(
        (title: string, description: string, type: TimelineEventType | string = 'other') => {
            publishFinancialCenterTimelineNote(executionId, title, description, type);
        },
        [executionId]
    );

    const submitDecisionRequest = useCallback(
        (
            title: string,
            body: string,
            kind: 'seizure' | 'special' = 'special',
            seizureSubtype?: SeizureRequestSubtype
        ) => {
            if (!executionId) {
                notify('تعذر إنشاء الطلب: رقم الإضبارة غير متوفر.', 'error');
                return null;
            }

            let decisionId: string | null = null;
            if (kind === 'seizure') {
                decisionId = appendPendingExecutorSeizureDecision({
                    executionId,
                    requestTitle: title,
                    requestBody: body,
                    seizureSubtype,
                });
                if (!decisionId) {
                    notify('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                    return null;
                }
                if (decisionId && seizureSubtype) {
                    try {
                        window.dispatchEvent(
                            new CustomEvent('hami-seizure-request-created', {
                                detail: { executionId, decisionId, subtype: seizureSubtype },
                            })
                        );
                    } catch {
                        /* ignore */
                    }
                }
            } else {
                decisionId = appendSpecialFollowupRequest({
                    executionId,
                    requestDate: getLocalTodayYmd(),
                    content: body,
                    decisionTitle: title,
                });
                if (!decisionId) {
                    notify('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                    return null;
                }
            }

            notify(`تم إرسال ${title} بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ`, 'success', {
                decisionsLink: true,
            });

            if (kind !== 'seizure') {
                recordFinancialTimelineNote(title, body, 'decision');
            }

            return decisionId;
        },
        [executionId, notify, recordFinancialTimelineNote]
    );

    const canShowGhuramaaDivision = (creditorsCount ?? 0) > 1;
    /**
     * عزل مسار التخلية: أي مطالبة تخلية (eviction / تخلية مأجور / تسليم عقار) تستخدم واجهة المراحل.
     * المطالبات الأخرى = StandardFinancialLedger دون تغيير المنطق القياسي.
     */
    const isEvictionFundsModule = isEvictionClaim(claimType);
    const courtOrderedFeesSafe = Math.max(0, parseStoredMoney(court_ordered_fees) || 0);
    const executionExpensesSumSafe = Math.max(0, parseStoredMoney(execution_expenses_sum) || 0);
    const evictionCaseExpensesSumSafe = Math.max(0, parseStoredMoney(eviction_case_expenses_sum) || 0);

    const [store, setStore] = useState<UnifiedLedgerStore>(() => emptyStore());
    const storeRef = useRef(store);
    useEffect(() => {
        storeRef.current = store;
    }, [store]);
    const [lawyerAmountInput, setLawyerAmountInput] = useState('');
    const [lawyerLabelInput, setLawyerLabelInput] = useState('');
    const [expenseAmountInput, setExpenseAmountInput] = useState('');
    const [expenseReasonInput, setExpenseReasonInput] = useState('');
    const [settlementInput, setSettlementInput] = useState('');
    const [showGarnishModal, setShowGarnishModal] = useState(false);
    const [showGuarantorModal, setShowGuarantorModal] = useState(false);
    const [feesSheetOpen, setFeesSheetOpen] = useState(false);
    const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
    const [debtEditOpen, setDebtEditOpen] = useState(false);
    const [debtEditTotalInput, setDebtEditTotalInput] = useState('');
    const [debtEditRemainingInput, setDebtEditRemainingInput] = useState('');

    const [garnishMonthlyInput, setGarnishMonthlyInput] = useState('');
    const [garnishMemoInput, setGarnishMemoInput] = useState('');
    const [showSettlementEviction, setShowSettlementEviction] = useState(false);
    const [showRepaymentEviction, setShowRepaymentEviction] = useState(false);
    const [repaymentInput, setRepaymentInput] = useState('');
    const [settlementDueDateInput, setSettlementDueDateInput] = useState('');
    const [disburseModalOpen, setDisburseModalOpen] = useState(false);
    const [disburseAmountInput, setDisburseAmountInput] = useState('');
    const [ghuramaaModalOpen, setGhuramaaModalOpen] = useState(false);
    const [ghuramaaShareInputs, setGhuramaaShareInputs] = useState<Record<string, string>>({});
    const [ghuramaaSplitMode, setGhuramaaSplitMode] = useState<'manual' | 'equal' | null>(null);
    const [showEvictionLedgerUi, setShowEvictionLedgerUi] = useState(false);
    const [settlementPanelOpen, setSettlementPanelOpen] = useState(false);
    const [alimonyDetailOpen, setAlimonyDetailOpen] = useState(false);

    const [isEvictionCollectionRequested, setIsEvictionCollectionRequested] = useState(false);

    const [alimonyData, setAlimonyData] = useState<AlimonyData | null>(null);
    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; mode?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionId ?? '')) return;
            const mode = String(ce.detail?.mode ?? '').trim();
            if (mode === 'disburse') {
                const trustNow = computeTrustBalanceFromPayments(store.payments);
                if (trustNow <= 0) {
                    notify('لا يمكن الصرف: رصيد الأمانات = 0.', 'warning');
                    return;
                }
                setDisburseModalOpen(true);
            }
        };
        window.addEventListener('hami-open-financial-ledger-modal', handler as EventListener);
        return () => window.removeEventListener('hami-open-financial-ledger-modal', handler as EventListener);
    }, [executionId, notify, store.payments]);

    useEffect(() => {
        if (autoOpenLedgerMode !== 'disburse') return;
        if (!executionId) {
            if (onAutoOpenHandled) onAutoOpenHandled();
            return;
        }
        const trustNow = computeTrustBalanceFromPayments(store.payments);
        if (trustNow <= 0) {
            notify('لا يمكن الصرف: رصيد الأمانات = 0.', 'warning');
            if (onAutoOpenHandled) onAutoOpenHandled();
            return;
        }
        setDisburseModalOpen(true);
        if (onAutoOpenHandled) onAutoOpenHandled();
    }, [autoOpenLedgerMode, executionId, notify, onAutoOpenHandled, store.payments]);

    const employeeDebtor = isEmployeeDebtor(debtorJob, debtorEmploymentType);

    const [unifiedCollectionExecutorApproved, setUnifiedCollectionExecutorApproved] = useState(() =>
        hasApprovedUnifiedCollection(executionId)
    );
    const [unifiedCollectionDecisionState, setUnifiedCollectionDecisionState] = useState(() =>
        getLatestUnifiedCollectionDecisionState(executionId)
    );
    const [ledgerExternalRevision, setLedgerExternalRevision] = useState(0);

    useEffect(() => {
        const bump = () => {
            setUnifiedCollectionExecutorApproved(hasApprovedUnifiedCollection(executionId));
            setUnifiedCollectionDecisionState(getLatestUnifiedCollectionDecisionState(executionId));
        };
        bump();
        window.addEventListener(DECISIONS_RELOAD_EVENT, bump);
        window.addEventListener('hami-execution-decision-outcome', bump);
        window.addEventListener('storage', bump);
        window.addEventListener('focus', bump);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, bump);
            window.removeEventListener('hami-execution-decision-outcome', bump);
            window.removeEventListener('storage', bump);
            window.removeEventListener('focus', bump);
        };
    }, [executionId]);

    useEffect(() => {
        const bumpLedger = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string }>;
            const target = String(ce.detail?.executionId ?? '').trim();
            if (target && target !== String(executionId ?? '').trim()) return;
            setLedgerExternalRevision((n) => n + 1);
        };
        window.addEventListener('hami-unified-ledger-updated', bumpLedger);
        window.addEventListener('hami-unified-ledger-payment-undo', bumpLedger);
        return () => {
            window.removeEventListener('hami-unified-ledger-updated', bumpLedger);
            window.removeEventListener('hami-unified-ledger-payment-undo', bumpLedger);
        };
    }, [executionId]);

    const clearCollectionRequestIfUnifiedRejected = useCallback(() => {
        if (!executionId) return;
        if (getLatestUnifiedCollectionDecisionState(executionId) !== 'rejected') return;
        setStore((prev) => {
            if (!prev.collectionRequestActive) return prev;
            const next = { ...prev, collectionRequestActive: false };
            storageCache.set(storageKey(executionId), next);
            return next;
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
    }, [executionId, isEvictionFundsModule]);

    useEffect(() => {
        clearCollectionRequestIfUnifiedRejected();
        window.addEventListener(DECISIONS_RELOAD_EVENT, clearCollectionRequestIfUnifiedRejected);
        window.addEventListener('hami-execution-decision-outcome', clearCollectionRequestIfUnifiedRejected);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, clearCollectionRequestIfUnifiedRejected);
            window.removeEventListener('hami-execution-decision-outcome', clearCollectionRequestIfUnifiedRejected);
        };
    }, [clearCollectionRequestIfUnifiedRejected]);

    const persist = useCallback(
        (next: UnifiedLedgerStore) => {
            const cached = executionId
                ? parseUnifiedLedgerFromStorage(storageCache.get(storageKey(executionId)))
                : null;
            const resolved = resolvePersistedLedgerStore(storeRef.current, next, cached);
            storeRef.current = resolved;
            setStore(resolved);
            if (executionId) {
                storageCache.set(storageKey(executionId), resolved);
            }
            notifyUnifiedLedgerUpdated(executionId);
        },
        [executionId]
    );

    const ledgerTotalParams = useMemo(
        (): UnifiedLedgerTotalParams => ({
            principal_amount,
            courtOrderedFeesSafe,
            evictionLawyerFeeWaivedAtIntake,
            executionExpensesSumSafe,
            evictionCaseExpensesSumSafe,
            seedLawyerId: executionId ? `seed-lawyer-${executionId}` : '',
            seedExpenseId: executionId ? `seed-exp-${executionId}` : '',
        }),
        [
            courtOrderedFeesSafe,
            evictionCaseExpensesSumSafe,
            evictionLawyerFeeWaivedAtIntake,
            executionExpensesSumSafe,
            executionId,
            principal_amount,
        ]
    );

    const getLatestLedgerStore = useCallback((): UnifiedLedgerStore => {
        const stateStore = storeRef.current;
        if (!executionId) return stateStore;
        const cached = parseUnifiedLedgerFromStorage(storageCache.get(storageKey(executionId)));
        if (!cached) return stateStore;
        return pickRicherLedgerStore(stateStore, cached);
    }, [executionId]);

    useEffect(() => {
        setIsEvictionCollectionRequested(false);
        setShowEvictionLedgerUi(false);
    }, [executionId]);

    useEffect(() => {
        if (!executionId) {
            setStore(emptyStore());
            return;
        }
        try {
            storageCache.invalidate(storageKey(executionId));
            const raw = storageCache.get(storageKey(executionId));
            if (raw) {
                const p =
                    typeof raw === 'string'
                        ? (JSON.parse(raw) as UnifiedLedgerStore)
                        : (raw as UnifiedLedgerStore);
                let collectionRequestActive = Boolean(p.collectionRequestActive);
                if (getLatestUnifiedCollectionDecisionState(executionId) === 'rejected') {
                    collectionRequestActive = false;
                }
                const normalizedLawyerFees = (Array.isArray(p.lawyerFees) ? p.lawyerFees : [])
                    .map((row) => ({
                        id: String((row as Partial<LawyerFeeRow>).id ?? `lf-${Date.now()}`),
                        amount: parseStoredMoney((row as Partial<LawyerFeeRow>).amount),
                        label: String((row as Partial<LawyerFeeRow>).label ?? 'أتعاب محاماة محكوم بها'),
                        at: String((row as Partial<LawyerFeeRow>).at ?? new Date().toISOString()),
                    }))
                    .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
                const normalizedExpenses = (Array.isArray(p.expenses) ? p.expenses : [])
                    .map((row) => ({
                        id: String((row as Partial<ExpenseRow>).id ?? `ex-${Date.now()}`),
                        amount: parseStoredMoney((row as Partial<ExpenseRow>).amount),
                        reason: String((row as Partial<ExpenseRow>).reason ?? 'مصاريف تنفيذية'),
                        at: String((row as Partial<ExpenseRow>).at ?? new Date().toISOString()),
                    }))
                    .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
                const normalizedPayments = (Array.isArray(p.payments) ? p.payments : [])
                    .map((row) => {
                        const amount = parseStoredMoney((row as Partial<LocalPaymentRow>).amount);
                        const balanceAfter = parseStoredMoney((row as Partial<LocalPaymentRow>).balanceAfter);
                        const etRaw = (row as Partial<LocalPaymentRow>).entryType;
                        const entryType =
                            etRaw === 'disburse' || etRaw === 'settlement' || etRaw === 'collect'
                                ? etRaw
                                : 'collect';
                        return {
                            id: String((row as Partial<LocalPaymentRow>).id ?? `pay-${Date.now()}`),
                            amount,
                            at: String((row as Partial<LocalPaymentRow>).at ?? new Date().toISOString()),
                            kind:
                                (row as Partial<LocalPaymentRow>).kind === 'full'
                                    ? ('full' as const)
                                    : ('partial' as const),
                            entryType,
                            balanceAfter: Number.isFinite(balanceAfter) ? Math.max(0, balanceAfter) : 0,
                        };
                    })
                    .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
                const merged: UnifiedLedgerStore = {
                    ...emptyStore(),
                    ...p,
                    lawyerFees: normalizedLawyerFees,
                    expenses: normalizedExpenses,
                    payments: normalizedPayments,
                    seeded: Boolean(p.seeded),
                    principalSnapshot:
                        typeof (p as Partial<UnifiedLedgerStore>).principalSnapshot === 'number' &&
                        Number.isFinite((p as Partial<UnifiedLedgerStore>).principalSnapshot)
                            ? Math.max(0, Number((p as Partial<UnifiedLedgerStore>).principalSnapshot))
                            : null,
                    collectionRequestActive,
                    collectionRequestedTotal:
                        typeof (p as Partial<UnifiedLedgerStore>).collectionRequestedTotal === 'number'
                            ? Number((p as Partial<UnifiedLedgerStore>).collectionRequestedTotal)
                            : null,
                    evictionLedgerActivated: Boolean(
                        (p as Partial<UnifiedLedgerStore>).evictionLedgerActivated
                    ),
                    pendingSettlement:
                        p &&
                        typeof p === 'object' &&
                        (p as Partial<UnifiedLedgerStore>).pendingSettlement &&
                        typeof (p as Partial<UnifiedLedgerStore>).pendingSettlement === 'object'
                            ? {
                                  id: String(
                                      ((p as Partial<UnifiedLedgerStore>).pendingSettlement as PendingSettlement).id ||
                                          `stl-${Date.now()}`
                                  ),
                                  amount: Math.max(
                                      0,
                                      parseStoredMoney(
                                          ((p as Partial<UnifiedLedgerStore>).pendingSettlement as PendingSettlement)
                                              .amount
                                      ) || 0
                                  ),
                                  dueDate: String(
                                      ((p as Partial<UnifiedLedgerStore>).pendingSettlement as PendingSettlement)
                                          .dueDate || ''
                                  ),
                                  createdAt: String(
                                      ((p as Partial<UnifiedLedgerStore>).pendingSettlement as PendingSettlement)
                                          .createdAt || new Date().toISOString()
                                  ),
                              }
                            : null,
                    settlementBreachTriggeredAt:
                        typeof (p as Partial<UnifiedLedgerStore>).settlementBreachTriggeredAt ===
                            'string' &&
                        String((p as Partial<UnifiedLedgerStore>).settlementBreachTriggeredAt).trim()
                            ? String(
                                  (p as Partial<UnifiedLedgerStore>).settlementBreachTriggeredAt
                              ).trim()
                            : null,
                };
                const ledgerLocked = isUnifiedLedgerLocked(
                    executionId,
                    merged,
                    getLatestUnifiedCollectionDecisionState(executionId)
                );
                if (!ledgerLocked) {
                    const seedLawyerId = `seed-lawyer-${executionId}`;
                    const seedExpenseId = `seed-exp-${executionId}`;
                    const baseExp = executionExpensesSumSafe + evictionCaseExpensesSumSafe;

                    const lawyerWithoutSeed = merged.lawyerFees.filter((r) => r.id !== seedLawyerId);
                    if (evictionLawyerFeeWaivedAtIntake) {
                        merged.lawyerFees = lawyerWithoutSeed;
                    } else if (courtOrderedFeesSafe > 0) {
                        merged.lawyerFees = [
                            {
                                id: seedLawyerId,
                                amount: courtOrderedFeesSafe,
                                label: 'أتعاب محكومة (من الإضبارة)',
                                at: new Date().toISOString(),
                            },
                            ...lawyerWithoutSeed,
                        ];
                    }

                    const expensesWithoutSeed = merged.expenses.filter((r) => r.id !== seedExpenseId);
                    if (baseExp > 0) {
                        merged.expenses = [
                            {
                                id: seedExpenseId,
                                amount: baseExp,
                                reason: 'مصاريف تنفيذية مسجّلة من الإضبارة',
                                at: new Date().toISOString(),
                            },
                            ...expensesWithoutSeed,
                        ];
                    } else {
                        merged.expenses = expensesWithoutSeed;
                    }
                }
                merged.seeded = merged.lawyerFees.length > 0 || merged.expenses.length > 0;
                setStore(merged);
                if (!collectionRequestActive && Boolean(p.collectionRequestActive)) {
                    storageCache.set(storageKey(executionId), merged);
                }
                return;
            }

            const baseExp = executionExpensesSumSafe + evictionCaseExpensesSumSafe;
            const next: UnifiedLedgerStore = {
                ...emptyStore(),
                seeded: true,
                principalSnapshot:
                    Number.isFinite(principal_amount) && principal_amount > 0 ? Math.max(0, principal_amount) : null,
            };
            if (courtOrderedFeesSafe > 0 && !evictionLawyerFeeWaivedAtIntake) {
                next.lawyerFees = [
                    {
                        id: `seed-lawyer-${executionId}`,
                        amount: courtOrderedFeesSafe,
                        label: 'أتعاب محكومة (من الإضبارة)',
                        at: new Date().toISOString(),
                    },
                ];
            }
            if (baseExp > 0) {
                next.expenses = [
                    {
                        id: `seed-exp-${executionId}`,
                        amount: baseExp,
                        reason: 'مصاريف تنفيذية مسجّلة من الإضبارة',
                        at: new Date().toISOString(),
                    },
                ];
            }
            setStore(next);
            storageCache.set(storageKey(executionId), next);
        } catch {
            setStore(emptyStore());
        }
    }, [
        evictionCaseExpensesSumSafe,
        executionExpensesSumSafe,
        executionId,
        courtOrderedFeesSafe,
        evictionLawyerFeeWaivedAtIntake,
        principal_amount,
        ledgerExternalRevision,
    ]);

    useEffect(() => {
        if (!executionId) return;
        const principal = Number.isFinite(principal_amount) ? Math.max(0, principal_amount) : 0;
        if (principal <= 0) return;
        setStore((prev) => {
            if (typeof prev.principalSnapshot === 'number' && Math.abs(prev.principalSnapshot - principal) <= 0.001) {
                return prev;
            }
            const next = { ...prev, principalSnapshot: principal };
            storageCache.set(storageKey(executionId), next);
            return next;
        });
    }, [executionId, principal_amount]);

    useEffect(() => {
        if (!executionId) return;
        setStore((prev) => {
            if (
                isUnifiedLedgerLocked(executionId, prev, getLatestUnifiedCollectionDecisionState(executionId))
            ) {
                return prev;
            }
            const seedLawyerId = `seed-lawyer-${executionId}`;
            const seedExpenseId = `seed-exp-${executionId}`;
            const baseExp = executionExpensesSumSafe + evictionCaseExpensesSumSafe;

            let nextLawyer = prev.lawyerFees;
            const lawyerWithoutSeed = prev.lawyerFees.filter((r) => r.id !== seedLawyerId);
            if (evictionLawyerFeeWaivedAtIntake) {
                nextLawyer = lawyerWithoutSeed;
            } else if (courtOrderedFeesSafe > 0) {
                nextLawyer = [
                    {
                        id: seedLawyerId,
                        amount: courtOrderedFeesSafe,
                        label: 'أتعاب محكومة (من الإضبارة)',
                        at: new Date().toISOString(),
                    },
                    ...lawyerWithoutSeed,
                ];
            }

            const expensesWithoutSeed = prev.expenses.filter((r) => r.id !== seedExpenseId);
            const nextExpenses =
                baseExp > 0
                    ? [
                          {
                              id: seedExpenseId,
                              amount: baseExp,
                              reason: 'مصاريف تنفيذية مسجّلة من الإضبارة',
                              at: new Date().toISOString(),
                          },
                          ...expensesWithoutSeed,
                      ]
                    : expensesWithoutSeed;

            const unchangedLawyer =
                nextLawyer.length === prev.lawyerFees.length &&
                nextLawyer.every((r, i) => r.id === prev.lawyerFees[i]?.id && r.amount === prev.lawyerFees[i]?.amount);
            const unchangedExpenses =
                nextExpenses.length === prev.expenses.length &&
                nextExpenses.every((r, i) => r.id === prev.expenses[i]?.id && r.amount === prev.expenses[i]?.amount);
            if (unchangedLawyer && unchangedExpenses) return prev;

            const next = {
                ...prev,
                lawyerFees: nextLawyer,
                expenses: nextExpenses,
                seeded: nextLawyer.length > 0 || nextExpenses.length > 0,
            };
            storageCache.set(storageKey(executionId), next);
            return next;
        });
    }, [
        executionId,
        evictionLawyerFeeWaivedAtIntake,
        courtOrderedFeesSafe,
        executionExpensesSumSafe,
        evictionCaseExpensesSumSafe,
    ]);

    useEffect(() => {
        if (!isEvictionFundsModule) return;
        if (store.collectionRequestActive) {
            setIsEvictionCollectionRequested(true);
        }
    }, [isEvictionFundsModule, store.collectionRequestActive]);

    useEffect(() => {
        if (!isAlimonyClaim || !executionId) return;
        const loaded = loadAlimonyDataFromExecution(executionId);
        if (loaded) {
            setAlimonyData(loaded);
            return;
        }
        const initialized = initializeAlimonyData(
            monthly_wife_alimony || monthlyAlimony,
            monthly_children_alimony || 0,
            children_count || 1,
            past_wife_alimony || 0,
            past_children_alimony || 0
        );
        setAlimonyData(initialized);
        saveAlimonyDataToExecution(executionId, initialized);
    }, [
        isAlimonyClaim,
        executionId,
        monthlyAlimony,
        monthly_wife_alimony,
        monthly_children_alimony,
        children_count,
        past_wife_alimony,
        past_children_alimony,
    ]);

    const sumLawyer = useMemo(
        () => store.lawyerFees.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0),
        [store.lawyerFees]
    );
    const sumExpenses = useMemo(
        () => store.expenses.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0),
        [store.expenses]
    );
    const alimonyBreakdown = useMemo(() => {
        if (!isAlimonyClaim) return null;
        return resolveAlimonyFinancialBreakdown({
            alimony: alimonyCalculated ? { calculated: alimonyCalculated } : undefined,
            pastWifeAlimony: past_wife_alimony,
            pastChildrenAlimony: past_children_alimony,
            pastAlimonyClaim: pastAlimonyClaim ?? undefined,
        } as ExecutionFile);
    }, [
        isAlimonyClaim,
        alimonyCalculated,
        past_wife_alimony,
        past_children_alimony,
        pastAlimonyClaim,
    ]);

    const isPastAlimonyOnly = useMemo(
        () => isPastAlimonyOnlyClaim(claimType, claimTypes),
        [claimType, claimTypes]
    );
    const alimonyExecutionSnapshot = useMemo(
        () => ({
            claimType,
            claimTypes,
            monthlyWifeAlimony: monthly_wife_alimony,
            monthly_wife_alimony: monthly_wife_alimony,
            monthlyChildrenAlimony: monthly_children_alimony,
            monthly_children_alimony: monthly_children_alimony,
            monthlyAlimony,
            childrenCount: children_count,
            children_count,
            alimony_beneficiary_death: alimony_beneficiary_death ?? undefined,
            alimony: alimony_blob
                ? { ...alimony_blob, calculated: alimonyCalculated ?? alimony_blob.calculated }
                : alimonyCalculated
                  ? { calculated: alimonyCalculated }
                  : undefined,
        }),
        [
            claimType,
            claimTypes,
            monthly_wife_alimony,
            monthly_children_alimony,
            monthlyAlimony,
            children_count,
            alimony_beneficiary_death,
            alimony_blob,
            alimonyCalculated,
        ]
    );
    const ongoingAlimonyDisplay = useMemo(() => {
        if (!isAlimonyClaim || isPastAlimonyOnly) {
            return { total: 0, beneficiaryKind: '' as const, detailLines: [] as string[] };
        }
        return resolveOngoingAlimonyMonthlyDisplay(alimonyExecutionSnapshot);
    }, [alimonyExecutionSnapshot, isAlimonyClaim, isPastAlimonyOnly]);
    const ongoingMonthlyAlimonyTotal = ongoingAlimonyDisplay.total;
    const suppressOngoingAlimonyMonthly = shouldSuppressOngoingAlimonyMonthlyUi(
        activeDebtorIsDeceased
    );
    const showOngoingAlimonyMonthlySection =
        isAlimonyClaim && !isPastAlimonyOnly && !suppressOngoingAlimonyMonthly && ongoingMonthlyAlimonyTotal > 0;
    const ongoingMonthlyAlimonyEffective = suppressOngoingAlimonyMonthly
        ? 0
        : ongoingMonthlyAlimonyTotal;
    const principalBasisAmount = resolvePrincipalBasisFromStore(store, ledgerTotalParams);
    const baseDossierFeesAmount = evictionLawyerFeeWaivedAtIntake ? 0 : courtOrderedFeesSafe;
    const baseDossierAmount = Math.max(0, principalBasisAmount + baseDossierFeesAmount);
    const totalOwedUnified = useMemo(
        () => computeTotalOwedUnifiedFromStore(store, ledgerTotalParams),
        [ledgerTotalParams, store]
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                payment?: { id?: string; amount?: unknown; at?: string };
            }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionId ?? '')) return;
            const p = ce.detail?.payment;
            const amt = typeof p?.amount === 'number' ? p.amount : parseStoredMoney(p?.amount);
            const safeAmt = Number.isFinite(amt) ? Math.max(0, Math.trunc(amt)) : 0;
            if (!safeAmt) return;
            const pid = String(p?.id || `pay-ext-${Date.now()}`);
            const at = String(p?.at || new Date().toISOString());
            setStore((prev) => {
                if (prev.payments.some((x) => String(x.id) === pid)) return prev;
                let debtPaid = 0;
                for (const r of prev.payments) {
                    const a = Number.isFinite(r.amount) ? r.amount : 0;
                    const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
                    if (et === 'disburse') continue;
                    debtPaid += a;
                }
                const nextDebtPaid = Math.min(Math.max(0, debtPaid + safeAmt), Math.max(0, totalOwedUnified));
                const debtAfter = Math.max(0, totalOwedUnified - nextDebtPaid);
                const trustNow = computeTrustBalanceFromPayments(prev.payments);
                const trustAfter = Math.max(0, trustNow + safeAmt);
                const row: LocalPaymentRow = {
                    id: pid,
                    amount: safeAmt,
                    at,
                    kind: 'partial',
                    entryType: 'collect',
                    balanceAfter: debtAfter,
                    debtBalanceAfter: debtAfter,
                    trustBalanceAfter: trustAfter,
                };
                const next = { ...prev, payments: [row, ...prev.payments] };
                if (executionId) {
                    storageCache.set(storageKey(executionId), next);
                    notifyUnifiedLedgerUpdated(executionId);
                }
                storeRef.current = next;
                return next;
            });
        };
        window.addEventListener('hami-unified-ledger-external-collect', handler as EventListener);
        return () =>
            window.removeEventListener('hami-unified-ledger-external-collect', handler as EventListener);
    }, [executionId, totalOwedUnified]);

    const { debtPaidLocal, trustBalanceLocal } = useMemo(() => {
        let debtPaid = 0;
        let trust = 0;
        for (const r of store.payments) {
            const amt = Number.isFinite(r.amount) ? r.amount : 0;
            const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement' | 'debt_adjustment';
            if (et === 'disburse') {
                trust -= amt;
            } else if (et === 'debt_adjustment') {
                debtPaid += amt;
            } else if (et === 'settlement') {
                debtPaid += amt;
                trust += amt;
            } else {
                debtPaid += amt;
                trust += amt;
            }
        }
        return { debtPaidLocal: debtPaid, trustBalanceLocal: trust };
    }, [store.payments]);
    const sumDebtPaidLocal = useMemo(
        () => Math.min(Math.max(0, debtPaidLocal), Math.max(0, totalOwedUnified)),
        [debtPaidLocal, totalOwedUnified]
    );
    const hasPaymentRows = store.payments.length > 0;
    const remainingUnified = Math.max(0, totalOwedUnified - sumDebtPaidLocal);
    const debtEditLockReason = useMemo(() => {
        if (!executionId) return 'لا يمكن التعديل بدون رقم إضبارة.';
        if (
            isUnifiedLedgerLocked(executionId, store, unifiedCollectionDecisionState)
        ) {
            if (store.collectionRequestActive || hasFrozenLedgerRows(store, executionId)) {
                return 'الوعاء مجمّد بعد طلب الاستحصال — لا يمكن تعديل الدين حالياً.';
            }
            return 'الوعاء مقفل — لا يمكن تعديل الدين حالياً.';
        }
        return null;
    }, [executionId, store, unifiedCollectionDecisionState]);

    const openDebtEditModal = useCallback(() => {
        setDebtEditTotalInput(formatNumberInput(String(Math.round(totalOwedUnified))));
        setDebtEditRemainingInput(formatNumberInput(String(Math.round(remainingUnified))));
        setDebtEditOpen(true);
    }, [remainingUnified, totalOwedUnified]);

    const applyDebtTotalsEdit = useCallback(() => {
        if (debtEditLockReason) {
            notify(debtEditLockReason, 'warning');
            return;
        }
        const total = parseAmount(debtEditTotalInput);
        const remaining = parseAmount(debtEditRemainingInput);
        const current = getLatestLedgerStore();
        const result = applyManualDebtTotalsEdit(current, ledgerTotalParams, total, remaining);
        if (!result.ok) {
            notify(result.reason, 'warning');
            return;
        }
        persist(result.store);
        const principalSnapshot = resolvePrincipalBasisFromStore(result.store, ledgerTotalParams);
        onManualDebtTotalsUpdated?.({
            principalSnapshot,
            totalOwed: Math.max(0, Math.round(total)),
            remaining: Math.max(0, Math.round(remaining)),
        });
        recordFinancialTimelineNote(
            '✏️ تعديل الدين',
            `إجمالي الدين: ${Math.round(total).toLocaleString('ar-IQ')} د.ع — المتبقي: ${Math.round(remaining).toLocaleString('ar-IQ')} د.ع`
        );
        setDebtEditOpen(false);
        notify('تم تحديث إجمالي الدين والمتبقي.', 'success');
    }, [
        debtEditLockReason,
        debtEditRemainingInput,
        debtEditTotalInput,
        getLatestLedgerStore,
        ledgerTotalParams,
        notify,
        onManualDebtTotalsUpdated,
        persist,
        recordFinancialTimelineNote,
    ]);

    const forceSettlementBuriedOnly = React.useMemo(
        () => employeeDebtor && isFinancialDebtCollectionClaim(claimType),
        [employeeDebtor, claimType]
    );
    const settlementUxTier = React.useMemo(
        () => resolveSettlementUxTier(remainingUnified, { forceBuriedOnly: forceSettlementBuriedOnly }),
        [remainingUnified, forceSettlementBuriedOnly]
    );
    const trustBalanceUnified = Math.max(0, trustBalanceLocal);
    const trustBalance = trustBalanceUnified;
    const ghuramaaContext = useMemo(() => {
        const creditors = Array.isArray(ghuramaaCreditors) ? ghuramaaCreditors : [];
        const available = Math.max(0, Math.trunc(trustBalanceUnified));
        const eligible = creditors
            .map((c) => ({
                creditorId: String(c.creditorId || '').trim(),
                creditorName: String(c.creditorName || '').trim() || 'دائن',
                debtBeforeDistribution: Math.max(0, Math.trunc(c.debtBeforeDistribution)),
                remainingDebt: Math.max(0, Math.trunc(c.remainingDebt)),
            }))
            .filter((c) => c.creditorId);
        const totalDebt = eligible.reduce((s, c) => s + c.remainingDebt, 0);
        const canOpen = available > 0 && eligible.length > 0;
        const note =
            available <= 0
                ? 'رصيد الأمانات = 0.'
                : eligible.length === 0
                  ? 'لا يوجد دائنون مؤهلون للتوزيع.'
                  : null;
        return { canOpen, available, totalDebt, eligible, note };
    }, [ghuramaaCreditors, trustBalanceUnified]);

    useEffect(() => {
        if (!ghuramaaModalOpen) return;
        const next: Record<string, string> = {};
        ghuramaaContext.eligible.forEach((c) => {
            next[c.creditorId] = '';
        });
        setGhuramaaShareInputs(next);
        setGhuramaaSplitMode(null);
    }, [ghuramaaModalOpen, ghuramaaContext.eligible]);

    const ghuramaaManual = useMemo(() => {
        const { available, eligible } = ghuramaaContext;
        const isEqualMode = ghuramaaSplitMode === 'equal';
        const rows: Array<{
            creditorId: string;
            creditorName: string;
            debtBeforeDistribution: number;
            amountDistributed: number;
        }> = [];
        let sum = 0;
        let hasInvalidField = false;
        let validationNote: string | null = null;
        let partialWarning: string | null = null;

        for (const c of eligible) {
            const raw = String(ghuramaaShareInputs[c.creditorId] ?? '').trim();
            const parsed = raw ? parseAmount(raw) : 0;
            if (raw && (!Number.isFinite(parsed) || parsed < 0)) {
                hasInvalidField = true;
                validationNote = 'أدخل مبالغاً صحيحة لحصص الدائنين.';
            }
            const amount = Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
            if (amount > available) {
                hasInvalidField = true;
                validationNote = 'حصة دائن تتجاوز رصيد الأمانات المتاح.';
            }
            if (!isEqualMode && amount > c.remainingDebt) {
                hasInvalidField = true;
                validationNote = 'حصة دائن تتجاوز دينه المتبقي.';
            }
            sum += amount;
            rows.push({
                creditorId: c.creditorId,
                creditorName: c.creditorName,
                debtBeforeDistribution: c.remainingDebt,
                amountDistributed: amount,
            });
        }

        if (sum > available) {
            hasInvalidField = true;
            validationNote = 'مجموع الحصص يتجاوز رصيد الأمانات المتاح.';
        }

        const remainingAfter = Math.max(0, available - sum);
        if (!isEqualMode && sum > 0 && remainingAfter > 0) {
            partialWarning = `يوجد متبقٍ في الأمانات (${remainingAfter.toLocaleString('ar-IQ')} د.ع) — يمكنك الاستمرار أو تعديل الحصص.`;
        }
        if (isEqualMode && sum > 0 && remainingAfter > 0) {
            hasInvalidField = true;
            validationNote = 'التقسيم بالتساوي يجب أن يوزّع رصيد الأمانات بالكامل دون متبقٍ.';
        }

        const ok =
            ghuramaaContext.canOpen &&
            !hasInvalidField &&
            sum > 0 &&
            (isEqualMode ? remainingAfter === 0 : true);
        return {
            ok,
            sum,
            remainingAfter,
            rows,
            validationNote,
            partialWarning,
            isEqualMode,
        };
    }, [ghuramaaContext, ghuramaaShareInputs, ghuramaaSplitMode]);

    const setGhuramaaShareInput = useCallback((creditorId: string, raw: string) => {
        setGhuramaaSplitMode('manual');
        setGhuramaaShareInputs((prev) => ({
            ...prev,
            [creditorId]: formatNumberInput(raw),
        }));
    }, []);

    const applyGhuramaaEqualSplit = useCallback(() => {
        const { available, eligible } = ghuramaaContext;
        if (available <= 0 || eligible.length === 0) return;
        const shares = splitAmountEqually(available, eligible.length);
        const next: Record<string, string> = {};
        eligible.forEach((c, i) => {
            const amt = shares[i] ?? 0;
            next[c.creditorId] = amt > 0 ? formatIqdDisplay(amt) : '';
        });
        setGhuramaaShareInputs(next);
        setGhuramaaSplitMode('equal');
    }, [ghuramaaContext]);

    const openGhuramaaModal = useCallback(() => {
        if (!canShowGhuramaaDivision) {
            notify('قسمة الغرماء متاحة فقط عند وجود أكثر من دائن واحد.', 'warning');
            return;
        }
        if (trustBalanceUnified <= 0) {
            notify('لا يوجد رصيد أمانات للتوزيع.', 'warning');
            return;
        }
        if (!ghuramaaContext.canOpen) {
            notify(
                ghuramaaContext.note ||
                    'لا توجد حصص دين مسجّلة للدائنين — تأكد من إجمالي المطالبة أو حصص الدائنين في الإضبارة.',
                'warning'
            );
            return;
        }
        setGhuramaaModalOpen(true);
    }, [canShowGhuramaaDivision, ghuramaaContext, notify, trustBalanceUnified]);
    const showEvictionLedger = isEvictionFundsModule;
    const hasApprovedUnifiedCollectionDecision =
        unifiedCollectionDecisionState === 'approved' || unifiedCollectionExecutorApproved;
    const hasPendingUnifiedCollection =
        unifiedCollectionDecisionState === 'pending' || store.collectionRequestActive || isEvictionCollectionRequested;

    useEffect(() => {
        if (!isEvictionFundsModule) return;
        if (
            showEvictionLedgerUi ||
            store.evictionLedgerActivated ||
            evictionLedgerActivatedPersisted ||
            store.collectionRequestActive ||
            isEvictionCollectionRequested
        ) {
            setShowEvictionLedgerUi(true);
        }
    }, [
        evictionLedgerActivatedPersisted,
        isEvictionCollectionRequested,
        isEvictionFundsModule,
        showEvictionLedgerUi,
        store.collectionRequestActive,
        store.evictionLedgerActivated,
    ]);

    useEffect(() => {
        if (!unifiedCollectionExecutorApproved || !executionId) return;
        const current = getLatestLedgerStore();
        const frozen = freezeLedgerForCollection(current, executionId, ledgerTotalParams);
        const withSnapshot =
            typeof frozen.collectionRequestedTotal === 'number' && frozen.collectionRequestedTotal > 0
                ? frozen
                : {
                      ...frozen,
                      collectionRequestedTotal: computeTotalOwedUnifiedFromStore(frozen, ledgerTotalParams),
                  };
        if (
            !hasFrozenLedgerRows(withSnapshot, executionId) &&
            typeof withSnapshot.collectionRequestedTotal !== 'number'
        ) {
            return;
        }
        const unchanged =
            hasFrozenLedgerRows(current, executionId) === hasFrozenLedgerRows(withSnapshot, executionId) &&
            Math.abs(
                (current.collectionRequestedTotal ?? 0) - (withSnapshot.collectionRequestedTotal ?? 0)
            ) <= 0.001;
        if (!unchanged) persist(withSnapshot);
    }, [executionId, ledgerTotalParams, persist, unifiedCollectionExecutorApproved, getLatestLedgerStore]);

    const vesselMismatchHandledRef = useRef<string | null>(null);

    useEffect(() => {
        if (!unifiedCollectionExecutorApproved || !executionId) return;
        const current = getLatestLedgerStore();
        if (!current.collectionRequestActive) return;
        if (current.collectionRequestedTotal === null) return;
        const currentTotal = computeTotalOwedUnifiedFromStore(current, ledgerTotalParams);
        if (Math.abs(currentTotal - current.collectionRequestedTotal) <= 0.001) return;

        const noticeKey = `${executionId}:${current.collectionRequestedTotal}:${currentTotal}`;
        if (vesselMismatchHandledRef.current === noticeKey) return;
        vesselMismatchHandledRef.current = noticeKey;

        persist({
            ...current,
            collectionRequestActive: false,
            collectionRequestedTotal: currentTotal,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
        notify('تم تعديل الوعاء بعد موافقة سابقة — يلزم إعادة تقديم طلب الاستحصال.', 'info');
    }, [
        executionId,
        getLatestLedgerStore,
        isEvictionFundsModule,
        ledgerTotalParams,
        notify,
        persist,
        totalOwedUnified,
        unifiedCollectionExecutorApproved,
    ]);

    const lawyerAmountParsed = parseAmount(lawyerAmountInput);
    const expenseAmountParsed = parseAmount(expenseAmountInput);
    const settlementAmountParsed = parseAmount(settlementInput);
    const garnishMonthlyParsed = parseAmount(garnishMonthlyInput);
    const canAddLawyerFee = Number.isFinite(lawyerAmountParsed) && lawyerAmountParsed > 0;
    const canAddExpense = Number.isFinite(expenseAmountParsed) && expenseAmountParsed > 0;
    const canApplySettlementAny =
        Number.isFinite(settlementAmountParsed) &&
        settlementAmountParsed > 0 &&
        (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0
            ? true
            : settlementAmountParsed <= remainingUnified);
    const repaymentAmountParsed = parseAmount(repaymentInput);
    const repaymentExceedsRemaining =
        Number.isFinite(repaymentAmountParsed) &&
        repaymentAmountParsed > 0 &&
        repaymentAmountParsed > remainingUnified;
    const canApplyRepayment =
        Number.isFinite(repaymentAmountParsed) &&
        repaymentAmountParsed > 0 &&
        !repaymentExceedsRemaining;
    const canConfirmGarnishment =
        Number.isFinite(garnishMonthlyParsed) && garnishMonthlyParsed > 0;
    const disburseAmountParsed = parseAmount(disburseAmountInput);
    const canApplyDisburseAmount =
        Number.isFinite(disburseAmountParsed) &&
        disburseAmountParsed > 0 &&
        disburseAmountParsed <= trustBalance;

    const addLawyerFee = () => {
        const amt = parseAmount(lawyerAmountInput);
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ الأتعاب'), 'warning');
            return;
        }
        const row: LawyerFeeRow = {
            id: `lf-${Date.now()}`,
            amount: amt,
            label: lawyerLabelInput.trim() || 'أتعاب محاماة محكوم بها',
            at: new Date().toISOString(),
        };
        const current = getLatestLedgerStore();
        const nextLawyerFees = [row, ...current.lawyerFees];
        const nextStore = { ...current, lawyerFees: nextLawyerFees };
        persist(nextStore);
        setLawyerAmountInput('');
        setLawyerLabelInput('');
        if (isEvictionFundsModule && evictionLawyerFeeWaivedAtIntake) {
            const total = nextLawyerFees.reduce((s, r) => s + r.amount, 0);
            onEvictionCourtOrderedFeesActivatedFromLedger?.(total);
        }
        recordFinancialTimelineNote(
            '➕ إضافة أتعاب للوعاء',
            `أُضيف بند أتعاب: ${row.label} — ${amt.toLocaleString('ar-IQ')} د.ع.`
        );
    };

    const addExpense = () => {
        const amt = parseAmount(expenseAmountInput);
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ المصروف'), 'warning');
            return;
        }
        const reason = expenseReasonInput.trim() || 'مصاريف تنفيذية';
        const row: ExpenseRow = {
            id: `ex-${Date.now()}`,
            amount: amt,
            reason,
            at: new Date().toISOString(),
        };
        const current = getLatestLedgerStore();
        persist({ ...current, expenses: [row, ...current.expenses] });
        setExpenseAmountInput('');
        setExpenseReasonInput('');
        recordFinancialTimelineNote(
            '➕ إضافة مصاريف للوعاء',
            `أُضيف مصروف: ${reason} — ${amt.toLocaleString('ar-IQ')} د.ع.`
        );
    };

    const submitCollectionRequest = () => {
        const current = getLatestLedgerStore();
        const submitTotal = computeTotalOwedUnifiedFromStore(current, ledgerTotalParams);
        const submitRemaining = Math.max(
            0,
            submitTotal -
                Math.min(
                    Math.max(0, current.payments.reduce((paid, row) => {
                        const amt = Number.isFinite(row.amount) ? row.amount : 0;
                        const et = (row.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
                        return et === 'disburse' ? paid : paid + amt;
                    }, 0)),
                    submitTotal
                )
        );
        if (submitTotal <= 0 || current.completed) return;
        const appended = appendEvictionExecutorRequest({
            executionId,
            title: 'طلب استحصال — الوعاء الموحّد (أتعاب + مصاريف)',
            body: `طلب استحصال الأتعاب والمصاريف في الوعاء الموحّد.\nإجمالي المطلوب: ${submitTotal.toLocaleString('ar-IQ')} د.ع.\nالمتبقي: ${submitRemaining.toLocaleString('ar-IQ')} د.ع.`,
            requestKind: 'unified_collection',
        });
        if (!appended) {
            notify('تعذر تسجيل الطلب أو يوجد طلب مماثل قيد المعالجة لدى المنفذ.', 'warning');
            return;
        }
        const frozen =
            executionId != null
                ? freezeLedgerForCollection(current, executionId, ledgerTotalParams)
                : current;
        const frozenTotal = computeTotalOwedUnifiedFromStore(frozen, ledgerTotalParams);
        persist({
            ...frozen,
            collectionRequestActive: true,
            collectionRequestedTotal: Math.max(submitTotal, frozenTotal),
            evictionLedgerActivated: isEvictionFundsModule ? true : frozen.evictionLedgerActivated,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(true);
        recordFinancialTimelineNote(
            '📨 طلب استحصال — الوعاء الموحّد',
            `تم تقديم طلب استحصال بإجمالي ${Math.max(submitTotal, frozenTotal).toLocaleString('ar-IQ')} د.ع — المتبقي ${submitRemaining.toLocaleString('ar-IQ')} د.ع.`,
            'decision'
        );
        onAfterCollectionRequestSubmitted?.();
    };

    const retractCollectionRequest = () => {
        const current = getLatestLedgerStore();
        persist({
            ...current,
            collectionRequestActive: false,
            collectionRequestedTotal: null,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
        recordFinancialTimelineNote(
            '↩️ إلغاء طلب الاستحصال',
            'تم إلغاء طلب استحصال الوعاء الموحّد والعودة لتعديل البنود.'
        );
        notify('تم إلغاء طلب الاستحصال — يمكنك تعديل البنود وإعادة التقديم.', 'success');
    };

    const activateEvictionLedger = () => {
        const alreadyActive =
            showEvictionLedgerUi ||
            store.evictionLedgerActivated ||
            evictionLedgerActivatedPersisted ||
            store.collectionRequestActive ||
            isEvictionCollectionRequested;
        setShowEvictionLedgerUi(true);
        if (!store.evictionLedgerActivated) {
            persist({ ...store, evictionLedgerActivated: true });
        }
        if (!alreadyActive) onEvictionLedgerActivated?.();
    };

    const applyDisbursementAmount = (): boolean => {
        const amt = Math.max(0, Math.trunc(parseAmount(disburseAmountInput)));
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ الصرف'), 'warning');
            return false;
        }
        const current = getLatestLedgerStore();
        const trustBefore = computeTrustBalanceFromPayments(current.payments);
        if (amt > trustBefore) {
            notify(
                `مبلغ الصرف يتجاوز رصيد الأمانات الحالي (${trustBefore.toLocaleString('ar-IQ')} د.ع).`,
                'warning'
            );
            return false;
        }
        const trustAfter = Math.max(0, trustBefore - amt);
        const row: LocalPaymentRow = {
            id: `pay-disburse-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: 'partial',
            entryType: 'disburse',
            balanceAfter: trustAfter,
            debtBalanceAfter: remainingUnified,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...current,
            payments: [row, ...current.payments],
            completed: current.completed,
            collectionRequestActive: current.collectionRequestActive,
        });
        recordFinancialTimelineNote(
            '📤 صرف من الأمانات',
            `تم صرف ${amt.toLocaleString('ar-IQ')} د.ع من رصيد الأمانات — المتبقي في الأمانات ${trustAfter.toLocaleString('ar-IQ')} د.ع.`
        );
        if (executionId) {
            const seizedMovableId = String(proceedsDisburseMovableIdRef.current || '').trim();
            const seizedPropertyId = String(proceedsDisbursePropertyIdRef.current || '').trim();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-trust-disbursed', {
                        detail: {
                            executionId: String(executionId),
                            ...(seizedMovableId ? { seizedMovableId } : {}),
                            ...(seizedPropertyId ? { seizedPropertyId } : {}),
                        },
                    })
                );
            } catch {
                /* ignore */
            }
            if (seizedMovableId) {
                proceedsDisburseMovableIdRef.current = null;
                onProceedsDisburseHandled?.();
            }
            if (seizedPropertyId) {
                proceedsDisbursePropertyIdRef.current = null;
                onProceedsDisbursePropertyHandled?.();
            }
        }
        setDisburseAmountInput('');
        setDisburseModalOpen(false);
        return true;
    };

    const applyGhuramaaDistribution = useCallback(() => {
        if (!canShowGhuramaaDivision) {
            notify('لا يمكن إجراء قسمة الغرماء: لا يوجد تعدد دائنين.', 'warning');
            return;
        }
        if (!ghuramaaManual.ok) {
            notify(
                ghuramaaManual.validationNote || 'أدخل حصص الدائنين يدوياً ضمن حدود الأمانات والديون.',
                'warning'
            );
            return;
        }
        const total = Math.max(0, Math.trunc(ghuramaaManual.sum));
        const distributionRows = ghuramaaManual.rows.filter((r) => r.amountDistributed > 0);
        if (!Number.isFinite(total) || total <= 0 || distributionRows.length === 0) {
            notify('لا يوجد مبلغ قابل للتوزيع.', 'warning');
            return;
        }
        const current = getLatestLedgerStore();
        const trustBefore = computeTrustBalanceFromPayments(current.payments);
        if (total > trustBefore) {
            notify(
                `مجموع الحصص يتجاوز رصيد الأمانات (${trustBefore.toLocaleString('ar-IQ')} د.ع).`,
                'warning'
            );
            return;
        }
        const ts = new Date().toISOString();
        const transactionId = `ghr-${Date.now()}`;
        try {
            onApplyGhuramaaDistribution?.({
                transactionId,
                dateIso: ts,
                totalAmountDistributed: total,
                distributionDetails: distributionRows,
            });
        } catch {
            notify('تعذر حفظ القسمة داخل الإضبارة.', 'error');
            return;
        }
        const trustAfter = Math.max(0, trustBefore - total);
        const row: LocalPaymentRow = {
            id: `pay-ghr-${Date.now()}`,
            amount: total,
            at: ts,
            kind: 'partial',
            entryType: 'disburse',
            balanceAfter: trustAfter,
            debtBalanceAfter: remainingUnified,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...current,
            payments: [row, ...current.payments],
            completed: current.completed,
            collectionRequestActive: current.collectionRequestActive,
        });
        recordFinancialTimelineNote(
            '⚖️ قسمة الغرماء — توزيع الأمانات',
            `تم توزيع ${total.toLocaleString('ar-IQ')} د.ع على ${distributionRows.length} دائن/دائنين — المتبقي في الأمانات ${trustAfter.toLocaleString('ar-IQ')} د.ع.`
        );
        setGhuramaaModalOpen(false);
        setGhuramaaShareInputs({});
        setGhuramaaSplitMode(null);
        setDisburseAmountInput('');
        notify(
            `تم اعتماد القسمة. المتبقي في الأمانات: ${trustAfter.toLocaleString('ar-IQ')} د.ع`,
            'success'
        );
    }, [
        canShowGhuramaaDivision,
        getLatestLedgerStore,
        ghuramaaManual,
        notify,
        onApplyGhuramaaDistribution,
        persist,
        recordFinancialTimelineNote,
        remainingUnified,
    ]);

    const undoLastPayment = () => {
        const current = getLatestLedgerStore();
        if (current.payments.length === 0) {
            notify('لا توجد دفعات للتراجع عنها.', 'warning');
            return;
        }
        const removed = current.payments[0];
        const [, ...restPayments] = current.payments;
        let debtPaid = 0;
        for (const r of restPayments) {
            const amt = Number.isFinite(r.amount) ? r.amount : 0;
            const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
            if (et === 'disburse') {
                continue;
            } else if (et === 'settlement') {
                debtPaid += amt;
            } else {
                debtPaid += amt;
            }
        }
        const debtPaidClamped = Math.min(Math.max(0, debtPaid), Math.max(0, totalOwedUnified));
        const remainingAfterUndo = Math.max(0, totalOwedUnified - debtPaidClamped);
        const next = {
            ...current,
            payments: restPayments,
            completed: remainingAfterUndo <= 0,
            collectionRequestActive:
                remainingAfterUndo > 0
                    ? current.collectionRequestActive || unifiedCollectionExecutorApproved
                    : false,
        };
        persist(next);
        if (isEvictionFundsModule && remainingAfterUndo > 0) setIsEvictionCollectionRequested(true);
        const removedAmt = Number.isFinite(removed.amount) ? removed.amount : 0;
        const removedEt = (removed.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
        if (removedAmt > 0 && removedEt !== 'disburse' && executionId) {
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-unified-ledger-payment-undo', {
                        detail: { executionId, amount: removedAmt },
                    })
                );
            } catch {
                /* ignore */
            }
        }
        recordFinancialTimelineNote(
            '↩️ تراجع عن آخر دفعة',
            `تم التراجع عن آخر حركة في سجل الدفعات — المتبقي ${remainingAfterUndo.toLocaleString('ar-IQ')} د.ع.`
        );
        notify('تم التراجع عن آخر دفعة بنجاح.', 'success');
    };

    const applyFullPayment = () => {
        if (remainingUnified <= 0) return;
        const amt = remainingUnified;
        const trustAfter = trustBalanceUnified + amt;
        const row: LocalPaymentRow = {
            id: `pay-full-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: 'full',
            entryType: 'collect',
            balanceAfter: 0,
            debtBalanceAfter: 0,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...store,
            payments: [row, ...store.payments],
            completed: true,
            collectionRequestActive: false,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
        onFundsLedgerPayment?.({
            amount: amt,
            kind: 'full',
            description: 'تم الدفع / تسديد كامل — الوعاء الموحّد (أتعاب + مصاريف)',
        });
        recordFinancialTimelineNote(
            '✅ تحصيل كامل للوعاء',
            `تم إغلاق الوعاء الموحّد بتحصيل ${amt.toLocaleString('ar-IQ')} د.ع.`
        );
        notify('تم تحصيل الوعاء بالكامل وإغلاقه بنجاح.', 'success');
    };

    const applyPartialSettlement = (): boolean => {
        const amt = parseAmount(settlementInput);
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ التسوية'), 'warning');
            return false;
        }
        if (amt > remainingUnified) {
            notify(
                `لا يمكن اعتماد تسوية تتجاوز المبلغ المتبقي. المتبقي الحالي: ${remainingUnified.toLocaleString('ar-IQ')} د.ع`,
                'warning'
            );
            return false;
        }
        const debtAfter = Math.max(0, remainingUnified - amt);
        const trustAfter = trustBalance + amt;
        const row: LocalPaymentRow = {
            id: `pay-part-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: 'partial',
            entryType: 'settlement',
            balanceAfter: debtAfter,
            debtBalanceAfter: debtAfter,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...store,
            payments: [row, ...store.payments],
            completed: debtAfter === 0,
            collectionRequestActive: debtAfter === 0 ? false : store.collectionRequestActive,
        });
        if (isEvictionFundsModule && debtAfter === 0) setIsEvictionCollectionRequested(false);
        onFundsLedgerPayment?.({
            amount: amt,
            kind: 'partial',
            description: 'تسوية / تسديد جزئي — الوعاء الموحّد',
        });
        setSettlementInput('');
        return true;
    };

    const applyDebtRepayment = (): boolean => {
        const current = getLatestLedgerStore();
        if (current.completed) return false;

        const totalNow = computeTotalOwedUnifiedFromStore(current, ledgerTotalParams);
        let debtPaidNow = 0;
        for (const r of current.payments) {
            const amt = Number.isFinite(r.amount) ? r.amount : 0;
            const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
            if (et === 'disburse') continue;
            if (et === 'settlement' || et === 'collect') debtPaidNow += amt;
        }
        const remainingNow = Math.max(
            0,
            totalNow - Math.min(Math.max(0, debtPaidNow), Math.max(0, totalNow))
        );
        if (remainingNow <= 0) return false;

        const amt = parseAmount(repaymentInput);
        if (!Number.isFinite(amt) || amt <= 0) {
            setShowRepaymentEviction(true);
            notify(invalidPositiveAmountMessage('مبلغ التسديد'), 'warning');
            return false;
        }
        if (amt > remainingNow) {
            notify(
                `لا يمكن تسديد مبلغ يتجاوز المتبقي. المتبقي الحالي: ${remainingNow.toLocaleString('ar-IQ')} د.ع`,
                'warning'
            );
            return false;
        }
        const debtAfter = Math.max(0, remainingNow - amt);
        const trustNow = Math.max(0, computeTrustBalanceFromPayments(current.payments) + amt);
        const row: LocalPaymentRow = {
            id: `pay-repay-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: debtAfter === 0 ? 'full' : 'partial',
            entryType: 'collect',
            balanceAfter: debtAfter,
            debtBalanceAfter: debtAfter,
            trustBalanceAfter: trustNow,
        };
        persist({
            ...current,
            payments: [row, ...current.payments],
            completed: debtAfter === 0,
            collectionRequestActive: debtAfter === 0 ? false : current.collectionRequestActive,
        });
        if (isEvictionFundsModule && debtAfter === 0) setIsEvictionCollectionRequested(false);
        onFundsLedgerPayment?.({
            amount: amt,
            kind: debtAfter === 0 ? 'full' : 'partial',
            description: 'تسديد — الوعاء الموحّد',
        });
        setRepaymentInput('');
        setShowRepaymentEviction(false);
        notify('تم تسجيل التسديد في سجل الدفعات.', 'success');
        return true;
    };

    const ensureDefaultSettlementDueDate = React.useCallback(() => {
        if (!settlementDueDateInput.trim()) {
            const dueIn30Days = addDaysToYmd(getLocalTodayYmd(), SETTLEMENT_DEFAULT_DUE_DAYS);
            if (dueIn30Days) setSettlementDueDateInput(dueIn30Days);
        }
    }, [settlementDueDateInput]);

    const registerSettlementPlan = async (): Promise<boolean> => {
        const amt = parseAmount(settlementInput);
        const dueDate = settlementDueDateInput.trim();
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ التسوية'), 'warning');
            return false;
        }
        if (
            resolveSettlementBlockedBySalarySeizure({
                garnishment: store.garnishment,
                seizedAssets: salarySeizureRegistryAssets,
            })
        ) {
            const choice = await promptSettlementSalaryConflictChoice(SmartDialog.confirm);
            if (choice === 'keep_salary') {
                notify('تم الإبقاء على حجز الراتب — أُلغي تسجيل التسوية.', 'info');
                return false;
            }
            onClearSalarySeizurePath?.();
        }
        if (amt > remainingUnified && !(isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0)) {
            notify(
                `لا يمكن اعتماد تسوية تتجاوز المبلغ المتبقي. المتبقي الحالي: ${remainingUnified.toLocaleString('ar-IQ')} د.ع`,
                'warning'
            );
            return false;
        }
        if (!dueDate) {
            notify('يرجى تحديد تاريخ دفع التسوية.', 'warning');
            return false;
        }
        const periodStartYmd = addMonthsToYmd(dueDate, -1) || extractYmd(new Date().toISOString());
        const tracksOngoingAlimony = isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0;
        const pending: PendingSettlement = {
            id: `stl-${Date.now()}`,
            amount: amt,
            dueDate,
            createdAt: new Date().toISOString(),
            periodStartYmd,
            tracksOngoingAlimony,
        };
        const hadPending = Boolean(store.pendingSettlement);
        persist({
            ...getLatestLedgerStore(),
            pendingSettlement: pending,
            settlementBreachTriggeredAt: null,
        });
        recordFinancialTimelineNote(
            hadPending ? '🗓️ تحديث التسوية' : '🗓️ تم تسجيل تسوية',
            `${hadPending ? 'تم تحديث' : 'تم تسجيل'} تسوية بمبلغ ${amt.toLocaleString('ar-IQ')} د.ع بتاريخ استحقاق ${dueDate}.`,
            'settlement'
        );
        setSettlementInput('');
        setSettlementDueDateInput('');
        setShowSettlementEviction(false);
        setSettlementPanelOpen(true);
        return true;
    };

    const markPendingSettlementPaid = () => {
        const pending = store.pendingSettlement;
        if (!pending) {
            notify('لا توجد تسوية مسجلة للدفع.', 'warning');
            return;
        }
        const dueYmd = extractYmd(pending.dueDate);
        const todayYmd = getLocalTodayYmd();
        if (!shouldShowSettlementDueActions(dueYmd || pending.dueDate, todayYmd)) {
            notify('أزرار التسديد تظهر عند حلول موعد السداد أو بعده.', 'warning');
            return;
        }
        const amt = Math.min(Math.max(0, pending.amount), remainingUnified);
        const tracksOngoing =
            Boolean(pending.tracksOngoingAlimony) ||
            (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0);
        const settlementPayAmount = tracksOngoing
            ? Math.max(0, pending.amount)
            : amt;
        if (settlementPayAmount <= 0) {
            notify('مبلغ التسوية غير صالح أو تم استيفاؤه مسبقاً.', 'warning');
            return;
        }
        const nextDueYmd = addMonthsToYmd(dueYmd || pending.dueDate, 1) || pending.dueDate;

        if (tracksOngoing) {
            persist({
                ...store,
                pendingSettlement: {
                    ...pending,
                    id: `stl-${Date.now()}`,
                    dueDate: nextDueYmd,
                    periodStartYmd: dueYmd || pending.dueDate,
                    createdAt: new Date().toISOString(),
                },
            });
            recordFinancialTimelineNote(
                '✅ تم دفع النفقة الشهرية',
                `تم تسديد النفقة المستمرة بمبلغ ${settlementPayAmount.toLocaleString('ar-IQ')} د.ع (استحقاق ${pending.dueDate}).`,
                'settlement'
            );
            onMonthlySettlementPaid?.({
                dueDate: dueYmd || pending.dueDate,
                nextDueDate: nextDueYmd,
                amount: settlementPayAmount,
            });
            notify('تم تسجيل تسديد النفقة الشهرية — انتقل موعد السداد للشهر التالي.', 'success');
            return;
        }

        if (amt <= 0) {
            notify('مبلغ التسوية غير صالح أو تم استيفاؤه مسبقاً.', 'warning');
            return;
        }
        const debtAfter = Math.max(0, remainingUnified - amt);
        const trustAfter = trustBalance + amt;
        const row: LocalPaymentRow = {
            id: `pay-settlement-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: debtAfter === 0 ? 'full' : 'partial',
            entryType: 'settlement',
            balanceAfter: debtAfter,
            debtBalanceAfter: debtAfter,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...store,
            payments: [row, ...store.payments],
            pendingSettlement: {
                ...pending,
                id: `stl-${Date.now()}`,
                dueDate: nextDueYmd,
                periodStartYmd: dueYmd || pending.dueDate,
                createdAt: new Date().toISOString(),
            },
            completed: debtAfter === 0,
            collectionRequestActive: debtAfter === 0 ? false : store.collectionRequestActive,
        });
        if (isEvictionFundsModule && debtAfter === 0) setIsEvictionCollectionRequested(false);
        onFundsLedgerPayment?.({
            amount: amt,
            kind: debtAfter === 0 ? 'full' : 'partial',
            description: 'دفع تسوية مسجلة — الوعاء الموحّد',
        });
        recordFinancialTimelineNote(
            '✅ تم دفع التسوية',
            `تم دفع التسوية المسجلة بمبلغ ${amt.toLocaleString('ar-IQ')} د.ع (استحقاق ${pending.dueDate}).`,
            'settlement'
        );
        onMonthlySettlementPaid?.({
            dueDate: dueYmd || pending.dueDate,
            nextDueDate: nextDueYmd,
            amount: amt,
        });
    };

    const cancelPendingSettlement = () => {
        const pending = store.pendingSettlement;
        if (!pending) {
            notify('لا توجد تسوية لإلغائها.', 'warning');
            return;
        }
        const todayYmd = getLocalTodayYmd();
        const dueYmd = extractYmd(pending.dueDate);
        const tracksOngoing =
            Boolean(pending.tracksOngoingAlimony) ||
            (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0);
        const canAccrueOngoing =
            tracksOngoing &&
            ongoingMonthlyAlimonyEffective > 0 &&
            Boolean(dueYmd) &&
            shouldShowSettlementDueActions(dueYmd || pending.dueDate, todayYmd);

        let nextStore: UnifiedLedgerStore;
        let accruedAmount = 0;
        let billableDays = 0;
        let newPrincipalTotal = principalBasisAmount;

        if (canAccrueOngoing) {
            const accrual = applyOngoingAlimonyBreachAccrual({
                store: getLatestLedgerStore(),
                pending,
                monthlyAmount: ongoingMonthlyAlimonyEffective || pending.amount,
                currentYmd: todayYmd,
                basePrincipal: principalBasisAmount,
            });
            nextStore = accrual.store;
            accruedAmount = accrual.accruedAmount;
            billableDays = accrual.billableDays;
            newPrincipalTotal = accrual.newPrincipalTotal;
        } else {
            nextStore = applySettlementBreachCancellation(
                getLatestLedgerStore(),
                new Date().toISOString()
            );
        }

        persist(nextStore);
        setSettlementPanelOpen(false);
        setShowSettlementEviction(false);

        if (canAccrueOngoing && accruedAmount > 0) {
            onAlimonyOngoingAccrued?.({
                dueDate: pending.dueDate,
                accruedAmount,
                billableDays,
                newPrincipalTotal,
                monthlyRate: ongoingMonthlyAlimonyEffective || pending.amount,
            });
            recordFinancialTimelineNote(
                '📈 ترحيل نفقة مستمرة للمتبقي',
                `أُضيف ${accruedAmount.toLocaleString('ar-IQ')} د.ع إلى المتبقي — ${billableDays} يوماً من النفقة الشهرية (${(ongoingMonthlyAlimonyEffective || pending.amount).toLocaleString('ar-IQ')} د.ع/شهر) بعد إخلال التسوية.`,
                'settlement'
            );
            notify(
                `تم ترحيل ${accruedAmount.toLocaleString('ar-IQ')} د.ع من النفقة المستمرة غير المسددة إلى المتبقي (${billableDays} يوماً).`,
                'warning'
            );
        }

        if (isAlimonyClaim) {
            onMonthlySettlementDefault?.({ dueDate: pending.dueDate, amount: pending.amount });
        }

        recordFinancialTimelineNote(
            '❌ إخلال التسوية',
            accruedAmount > 0
                ? `أُلغيت التسوية بعد عدم السداد — رُحِّل ${accruedAmount.toLocaleString('ar-IQ')} د.ع إلى المتبقي.`
                : `أُلغيت التسوية بمبلغ ${pending.amount.toLocaleString('ar-IQ')} د.ع بعد عدم السداد — عاد زر حجز الراتب للظهور.`,
            'settlement'
        );
        if (!canAccrueOngoing || accruedAmount <= 0) {
            notify('تم إلغاء التسوية — عاد زر حجز الراتب للظهور في تبويب الحجوزات.', 'info');
        }
    };

    const currentYmd = getLocalTodayYmd();
    const pendingSettlementDueYmd = store.pendingSettlement ? extractYmd(store.pendingSettlement.dueDate) : '';
    const pendingSettlementDuePhase =
        store.pendingSettlement && pendingSettlementDueYmd
            ? resolveSettlementDuePhase(pendingSettlementDueYmd, currentYmd)
            : null;
    const showSettlementDueActions =
        Boolean(store.pendingSettlement) &&
        Boolean(pendingSettlementDueYmd) &&
        shouldShowSettlementDueActions(pendingSettlementDueYmd, currentYmd);

    const settlementInProgress =
        settlementPanelOpen || Boolean(store.pendingSettlement);

    const salarySeizureActive = React.useMemo(
        () =>
            hasActiveSalarySeizurePath({
                garnishment: store.garnishment,
                seizedAssets: salarySeizureRegistryAssets,
            }),
        [salarySeizureRegistryAssets, store.garnishment]
    );

    const settlementContext = React.useMemo(
        () =>
            resolveSettlementContext({
                settlementUxTier,
                remainingUnified,
                completed: store.completed,
                panelOpen: settlementPanelOpen,
                showSettlementForm: showSettlementEviction,
                pendingSettlement: store.pendingSettlement,
                pendingSettlementDueYmd,
                currentYmd,
                isFinancialDebtCollectionClaim: false,
                financialCenterTotalIqd: remainingUnified,
                settlementBreachTriggeredAt: store.settlementBreachTriggeredAt,
                salarySeizureActive,
                activeDebtorIsDeceased,
            }),
        [
            settlementUxTier,
            remainingUnified,
            store.completed,
            store.pendingSettlement,
            store.settlementBreachTriggeredAt,
            settlementPanelOpen,
            showSettlementEviction,
            pendingSettlementDueYmd,
            currentYmd,
            salarySeizureActive,
            activeDebtorIsDeceased,
        ]
    );

    const confirmGarnishment = async () => {
        const monthlyDeduction = garnishMonthlyParsed;
        if (!Number.isFinite(monthlyDeduction) || monthlyDeduction <= 0) {
            notify(invalidPositiveAmountMessage('مقدار الاستقطاع الشهري'), 'warning');
            return;
        }
        if (store.pendingSettlement) {
            const choice = await promptSettlementSalaryConflictChoice(SmartDialog.confirm);
            if (choice === 'keep_settlement') {
                notify('تم الإبقاء على التسوية — أُلغي مسار حجز الراتب.', 'info');
                return;
            }
            persist(clearSettlementFromStore(getLatestLedgerStore()));
        }
        persist({ ...getLatestLedgerStore(), garnishment: true });
        if (executionId) {
            try {
                storageCache.set(executionGarnishmentFlagStorageKey(executionId), 'true');
                storageCache.set(executionGarnishmentDetailsStorageKey(executionId), {
                    monthlyDeduction,
                    memoNumber: garnishMemoInput.trim(),
                    savedAt: new Date().toISOString(),
                });
            } catch {
                /* ignore */
            }
        }
        setGarnishMonthlyInput('');
        setGarnishMemoInput('');
        setShowGarnishModal(false);
        onCoerciveAction('salary');
    };

    const closeGarnishModal = () => {
        setGarnishMonthlyInput('');
        setGarnishMemoInput('');
        setShowGarnishModal(false);
    };

    const handleSaveGuarantor = (guarantorInfo: GuarantorInfo) => {
        if (alimonyData && executionId) {
            const updated = registerGuarantor(alimonyData, guarantorInfo);
            setAlimonyData(updated);
            saveAlimonyDataToExecution(executionId, updated);
        }
        setShowGuarantorModal(false);
    };

    const showEmployeeCollectionStandard =
        !isEvictionFundsModule &&
        employeeDebtor &&
        totalOwedUnified > 0 &&
        !store.completed &&
        store.collectionRequestActive &&
        unifiedCollectionExecutorApproved;

    const showNonEmployeePhase2Standard =
        !isEvictionFundsModule &&
        !employeeDebtor &&
        totalOwedUnified > 0 &&
        !store.completed &&
        store.collectionRequestActive &&
        unifiedCollectionExecutorApproved;

    const approvedRequestNeedsResubmit =
        hasApprovedUnifiedCollectionDecision &&
        store.collectionRequestedTotal !== null &&
        Math.abs(totalOwedUnified - store.collectionRequestedTotal) > 0.001;

    const canShowDisburse =
        trustBalanceUnified > 0 &&
        !store.completed &&
        !(store.collectionRequestActive && !unifiedCollectionExecutorApproved);

    const canSubmitEvictionPhase2 =
        isEvictionFundsModule &&
        showEvictionLedger &&
        totalOwedUnified > 0 &&
        !store.completed &&
        !store.garnishment &&
        !hasPendingUnifiedCollection &&
        (unifiedCollectionDecisionState !== 'approved' || approvedRequestNeedsResubmit);

    const hideEvictionTotalsInChrome = isEvictionFundsModule && !showEvictionLedger;

    const fundsHeaderCollapsed =
        'w-full rounded-xl bg-transparent text-right transition hover:bg-white/[0.05] active:scale-[0.995]';
    const fundsHeaderExpanded =
        'w-full rounded-xl bg-transparent text-right transition hover:bg-white/[0.04]';

    const sheetClass =
        'w-full max-w-md rounded-2xl bg-[#0A1122]/70 backdrop-blur-xl border border-white/10 p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl';

    const fundsHeaderKeyToggle = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
        }
    };

    const showExpandedBody = embeddedInFinancialHub || isExpanded;

    const endSettlementSimple = React.useCallback(() => {
        if (!store.pendingSettlement) {
            notify('لا توجد تسوية لإنهائها.', 'warning');
            return;
        }
        persist(clearSettlementFromStore(getLatestLedgerStore()));
        setSettlementPanelOpen(false);
        setShowSettlementEviction(false);
        recordFinancialTimelineNote('إلغاء التسوية', 'أُلغيت التسوية وعادت دورة التسوية.', 'settlement');
        notify('تم إلغاء التسوية.', 'success');
    }, [getLatestLedgerStore, notify, persist, recordFinancialTimelineNote, store.pendingSettlement]);

    const activateSettlementPanel = React.useCallback(() => {
        if (salarySeizureActive) return;
        setSettlementPanelOpen(true);
        if (!store.pendingSettlement) {
            setShowSettlementEviction(true);
            ensureDefaultSettlementDueDate();
            if (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0 && !settlementInput.trim()) {
                setSettlementInput(formatNumberInput(String(ongoingMonthlyAlimonyEffective)));
            }
        }
    }, [
        store.pendingSettlement,
        ensureDefaultSettlementDueDate,
        isAlimonyClaim,
        ongoingMonthlyAlimonyEffective,
        settlementInput,
        salarySeizureActive,
    ]);

    const deactivateSettlementPanel = React.useCallback(() => {
        setSettlementPanelOpen(false);
        setShowSettlementEviction(false);
    }, []);

    React.useEffect(() => {
        if (settlementUxTier === 'hidden') {
            deactivateSettlementPanel();
        }
    }, [settlementUxTier, deactivateSettlementPanel]);

    React.useEffect(() => {
        if (salarySeizureActive) {
            deactivateSettlementPanel();
        }
    }, [salarySeizureActive, deactivateSettlementPanel]);

    React.useEffect(() => {
        if (activeDebtorIsDeceased) {
            deactivateSettlementPanel();
        }
    }, [activeDebtorIsDeceased, deactivateSettlementPanel]);

    const renderLedgerToolbar = (className = 'mt-2 flex flex-row-reverse items-center justify-end gap-2') =>
        onShowLedger || showOngoingAlimonyMonthlySection ? (
            <div className={className}>
                {onShowLedger ? (
                    <button
                        type="button"
                        onClick={onShowLedger}
                        className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#E6C673] transition hover:bg-[#E6C673]/20"
                        title="السجل المالي العام — أرشيف البنود والمبالغ"
                        aria-label="فتح السجل المالي العام"
                    >
                        <History size={14} strokeWidth={1.75} />
                        السجل المالي العام
                    </button>
                ) : null}
                {showOngoingAlimonyMonthlySection ? (
                    <button
                        type="button"
                        onClick={() => setAlimonyDetailOpen(true)}
                        className="inline-flex items-center justify-center rounded-lg border border-[#E6C673]/30 bg-[#E6C673]/8 p-1.5 text-[#E6C673] transition hover:bg-[#E6C673]/15 hover:border-[#E6C673]/45"
                        title="استحقاق النفقة الشهري"
                        aria-label="عرض استحقاق النفقة"
                    >
                        <HeartHandshake size={14} strokeWidth={2} />
                    </button>
                ) : null}
            </div>
        ) : null;

    const renderAlimonyDetailModal = () =>
        showOngoingAlimonyMonthlySection && alimonyDetailOpen ? (
            <FocModalPortal open onBackdropClick={() => setAlimonyDetailOpen(false)} backdropClassName="bg-black/60">
                <motion.div
                    initial={{ scale: 0.98, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.98, opacity: 0, y: 8 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A1122]/80 backdrop-blur-xl p-4 shadow-2xl"
                    dir="rtl"
                >
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                        <button
                            type="button"
                            onClick={() => setAlimonyDetailOpen(false)}
                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10"
                            aria-label="إغلاق"
                        >
                            <X size={16} />
                        </button>
                        <h4 className="text-xs font-bold text-[#E6C673]/90 tracking-wide">استحقاق النفقة</h4>
                    </div>
                    <AlimonyFinancialBlock
                        breakdown={alimonyBreakdown ?? undefined}
                        wifeMonthlyAlimony={monthly_wife_alimony || monthlyAlimony}
                        childrenMonthlyAlimony={monthly_children_alimony || 0}
                        childrenCount={children_count || 1}
                        entitlementsOnly
                    />
                </motion.div>
            </FocModalPortal>
        ) : null;

    const renderUnifiedSettlementPanel = () => (
        <UnifiedLedgerSettlementPanel
            settlementUxTier={settlementUxTier}
            panelOpen={settlementPanelOpen}
            onClosePanel={deactivateSettlementPanel}
            store={store}
            remainingUnified={remainingUnified}
            settlementInput={settlementInput}
            setSettlementInput={setSettlementInput}
            settlementDueDateInput={settlementDueDateInput}
            setSettlementDueDateInput={setSettlementDueDateInput}
            showSettlementForm={showSettlementEviction}
            setShowSettlementForm={setShowSettlementEviction}
            registerSettlementPlan={registerSettlementPlan}
            markPendingSettlementPaid={markPendingSettlementPaid}
            cancelPendingSettlement={cancelPendingSettlement}
            canApplySettlementAny={canApplySettlementAny}
            showSettlementDueActions={showSettlementDueActions}
            pendingSettlementDuePhase={pendingSettlementDuePhase}
            pendingSettlementDueYmd={pendingSettlementDueYmd}
            onNotify={(message, type) => notify(message, type ?? 'warning')}
            salarySeizureActive={salarySeizureActive}
        />
    );

    return (
        <div
            className={
                embeddedInFinancialHub
                    ? 'relative z-10 mx-0 mt-0 rounded-none border-0 bg-transparent p-0 shadow-none'
                    : `relative z-10 mx-3 mt-3 ${MANAGEMENT_CARD_OUTER}`
            }
            dir="rtl"
        >
            {!embeddedInFinancialHub && !isExpanded && (
                <div className="flex w-full items-stretch gap-0">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={onToggle}
                        onKeyDown={fundsHeaderKeyToggle}
                        className={`${fundsHeaderCollapsed} flex min-w-0 flex-1 cursor-pointer items-stretch outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40`}
                    >
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
                            <div className="flex min-w-0 items-center gap-1.5 text-right">
                                <CreditCard size={16} className="shrink-0 text-[#E6C673]/90" />
                                <h3 className="truncate text-sm font-bold leading-tight text-[#E6C673] sm:text-[15px]">
                                    إدارة الأموال والمصاريف
                                </h3>
                            </div>
                            {hideEvictionTotalsInChrome ? (
                                <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-medium text-slate-400">
                                    تخلية
                                </span>
                            ) : (
                                <div className="shrink-0 grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-[#E6C673]/20 bg-gradient-to-br from-white/[0.08] to-transparent px-2.5 py-1.5 text-right shadow-inner shadow-black/20 sm:px-3 sm:py-2">
                                        <p className="text-[8px] font-medium uppercase tracking-wider text-[#E6C673]/85">إجمالي الدين</p>
                                        <p className="text-[12px] font-black tabular-nums text-white sm:text-[13px]">
                                            {formatIqdDisplay(totalOwedUnified)}
                                        </p>
                                        <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                                            متبقي {formatIqdDisplay(remainingUnified)}
                                        </p>
                                        {onShowSeizureLog ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onShowSeizureLog();
                                                }}
                                                className="mt-1 inline-flex items-center justify-center rounded-full border border-[#E6C673]/35 bg-[#E6C673]/10 p-1 text-[#E6C673] transition hover:bg-[#E6C673]/20"
                                                title="سجل الحجوزات"
                                                aria-label="سجل الحجوزات"
                                            >
                                                <History size={14} />
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-transparent px-2.5 py-1.5 text-right shadow-inner shadow-black/20 sm:px-3 sm:py-2">
                                        <p className="text-[8px] font-medium uppercase tracking-wider text-emerald-200/90">الأمانات</p>
                                        <p className="text-[12px] font-black tabular-nums text-white sm:text-[13px]">
                                            {formatIqdDisplay(trustBalanceUnified)}
                                        </p>
                                        <p className="mt-0.5 text-[9px] font-semibold text-slate-400">رصيد الصرف</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {onShowLedger && (
                        <button
                            type="button"
                            onClick={onShowLedger}
                            className="flex shrink-0 items-center border-s border-white/10 px-2 text-[#E6C673] transition hover:bg-[#E6C673]/15 sm:px-2.5"
                            title="السجل المالي العام — أرشيف البنود والمبالغ"
                            aria-label="فتح السجل المالي العام"
                        >
                            <History size={18} strokeWidth={1.75} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggle}
                        onKeyDown={fundsHeaderKeyToggle}
                        aria-expanded={false}
                        aria-label="توسيع إدارة الأموال والمصاريف"
                        className="flex h-full min-h-[3.25rem] shrink-0 items-center border-s border-white/10 px-2 sm:px-2.5 text-[#E6C673]/85 transition hover:bg-white/[0.06]"
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>
            )}

            {!embeddedInFinancialHub && isExpanded && (
                <div className="flex w-full items-stretch gap-0">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={onToggle}
                        onKeyDown={fundsHeaderKeyToggle}
                        className={`${fundsHeaderExpanded} min-w-0 flex-1 cursor-pointer text-right outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40`}
                    >
                        <div className="space-y-2.5 px-2.5 py-2.5 sm:px-3 sm:py-3">
                            <div className="flex items-center justify-end gap-2">
                                <CreditCard size={16} className="shrink-0 text-[#E6C673]/90" />
                                <h3 className="truncate text-sm font-bold text-[#E6C673] sm:text-base">
                                    إدارة الأموال والمصاريف
                                </h3>
                            </div>
                            {hideEvictionTotalsInChrome ? (
                                <span className="inline-flex rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500">
                                    مسار التخلية — التفاصيل أدناه
                                </span>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-white/10 bg-gradient-to-l from-white/[0.07] to-transparent px-3 py-2.5 text-right">
                                        <p className="mb-1 text-[10px] font-medium text-slate-400">إجمالي الدين</p>
                                        <p className="text-lg font-black leading-tight text-white tabular-nums sm:text-xl">
                                            {formatIqdDisplay(totalOwedUnified)}{' '}
                                            <span className="text-xs font-semibold text-slate-400">د.ع</span>
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-l from-emerald-500/10 to-transparent px-3 py-2.5 text-right">
                                        <p className="mb-1 text-[10px] font-medium text-slate-400">الأمانات</p>
                                        <p className="text-lg font-black leading-tight text-white tabular-nums sm:text-xl">
                                            {formatIqdDisplay(trustBalanceUnified)}{' '}
                                            <span className="text-xs font-semibold text-slate-400">د.ع</span>
                                        </p>
                                        <p className="mt-1 text-[10px] font-semibold text-slate-400">رصيد الصرف</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {onShowLedger && (
                        <button
                            type="button"
                            onClick={onShowLedger}
                            className="flex shrink-0 items-center self-stretch border-s border-white/10 px-2.5 text-[#E6C673] transition hover:bg-[#E6C673]/15 sm:px-3"
                            title="السجل المالي العام"
                            aria-label="فتح السجل المالي العام"
                        >
                            <History size={18} strokeWidth={1.75} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggle}
                        onKeyDown={fundsHeaderKeyToggle}
                        aria-expanded
                        aria-label="طي إدارة الأموال والمصاريف"
                        className="flex shrink-0 items-center self-stretch border-s border-white/10 px-2.5 sm:px-3 text-[#E6C673]/85 transition hover:bg-white/[0.06]"
                    >
                        <ChevronUp size={18} />
                    </button>
                </div>
            )}

            {embeddedInFinancialHub && !isRepresentingDebtor && (
                <div className="space-y-2 pb-2">
                    {!hideEvictionTotalsInChrome ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                                <div className="flex flex-row-reverse items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="mb-0.5 text-[10px] font-medium text-slate-400">إجمالي الدين</p>
                                        <p className="text-base font-black leading-tight text-white tabular-nums">
                                            {formatIqdDisplay(totalOwedUnified)}{' '}
                                            <span className="text-[10px] font-semibold text-slate-400">د.ع</span>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openDebtEditModal}
                                        disabled={Boolean(debtEditLockReason)}
                                        className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[#E6C673]/30 bg-[#E6C673]/10 px-2 py-1 text-[9px] font-bold text-[#F5E6A8] transition hover:bg-[#E6C673]/15 disabled:opacity-35"
                                    >
                                        تعديل
                                    </button>
                                </div>
                            </div>
                            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-right">
                                <p className="mb-0.5 text-[10px] font-medium text-slate-400">الأمانات</p>
                                <p className="text-base font-black leading-tight text-white tabular-nums">
                                    {formatIqdDisplay(trustBalanceUnified)}{' '}
                                    <span className="text-[10px] font-semibold text-slate-400">د.ع</span>
                                </p>
                                <p className="mt-0.5 text-[9px] font-semibold text-slate-500">رصيد الصرف</p>
                            </div>
                        </div>
                    ) : null}

                    {renderLedgerToolbar('flex flex-row-reverse items-center justify-end gap-2')}
                </div>
            )}

            <AnimatePresence>
                {showExpandedBody && isRepresentingDebtor && embeddedInFinancialHub ? (
                    <DebtorAgentFinancialHubPanel
                        remainingUnified={remainingUnified}
                        totalOwedUnified={totalOwedUnified}
                        repaymentInput={repaymentInput}
                        setRepaymentInput={setRepaymentInput}
                        applyDebtRepayment={applyDebtRepayment}
                        canApplyRepayment={canApplyRepayment}
                        store={store}
                        settlementInput={settlementInput}
                        setSettlementInput={setSettlementInput}
                        settlementDueDateInput={settlementDueDateInput}
                        setSettlementDueDateInput={setSettlementDueDateInput}
                        registerSettlementPlan={registerSettlementPlan}
                        revertSettlementPlan={endSettlementSimple}
                        markPendingSettlementPaid={markPendingSettlementPaid}
                        showSettlementDueActions={showSettlementDueActions}
                        pendingSettlementDuePhase={pendingSettlementDuePhase}
                        seizedItems={debtorAgentSeizedItems}
                        completed={store.completed}
                    />
                ) : null}
                {showExpandedBody && !(isRepresentingDebtor && embeddedInFinancialHub) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`overflow-hidden ${
                            embeddedInFinancialHub ? 'mt-0 pt-0' : 'mt-1 border-t border-white/10 pt-2'
                        }`}
                    >
                        {isAlimonyClaim ? (
                            <div className="space-y-3">
                                {shouldCalculateExecutionFee && executionFee > 0 ? (
                                    <div className="flex flex-row-reverse items-center justify-between gap-2 rounded-xl border border-orange-500/30 bg-orange-950/25 px-3 py-2.5">
                                        <span className="text-[11px] leading-relaxed text-orange-200/95 text-right">
                                            رسم التحصيل (٣٪) — انتهاء مدة الإخبار بالتنفيذ دون سداد أو حضور
                                        </span>
                                        <span className="shrink-0 text-sm font-black tabular-nums text-orange-300">
                                            +{executionFee.toLocaleString('ar-IQ')}
                                        </span>
                                    </div>
                                ) : null}
                                <StandardFinancialLedger
                                    executionId={executionId}
                                    totalOwedUnified={totalOwedUnified}
                                    remainingUnified={remainingUnified}
                                    baseDossierAmount={baseDossierAmount}
                                    store={store}
                                    setExpenseSheetOpen={setExpenseSheetOpen}
                                    setFeesSheetOpen={setFeesSheetOpen}
                                    canShowDisburse={canShowDisburse}
                                    onOpenDisburse={() => setDisburseModalOpen(true)}
                                    retractCollectionRequest={retractCollectionRequest}
                                    unifiedCollectionExecutorApproved={unifiedCollectionExecutorApproved}
                                    showEmployeeCollection={showEmployeeCollectionStandard}
                                    showNonEmployeePhase2={showNonEmployeePhase2Standard}
                                    applyFullPayment={applyFullPayment}
                                    setShowGarnishModal={setShowGarnishModal}
                                    undoLastPayment={undoLastPayment}
                                    financialLedger={financialLedger}
                                    onPayment={onPayment}
                                    canEditDebtTotals={!debtEditLockReason}
                                    onOpenDebtEdit={openDebtEditModal}
                                    flatChrome={embeddedInFinancialHub}
                                    settlementUxTier={settlementUxTier}
                                    settlementPanelOpen={settlementPanelOpen}
                                    onActivateSettlement={activateSettlementPanel}
                                    onDeactivateSettlement={deactivateSettlementPanel}
                                    repaymentInput={repaymentInput}
                                    setRepaymentInput={setRepaymentInput}
                                    canApplyRepayment={canApplyRepayment}
                                    applyDebtRepayment={applyDebtRepayment}
                                    repaymentExceedsRemaining={repaymentExceedsRemaining}
                                    ongoingMonthlyAlimony={ongoingMonthlyAlimonyTotal}
                                    ongoingAlimonyDetailLines={ongoingAlimonyDisplay.detailLines}
                                    showOngoingAlimonyMonthly={showOngoingAlimonyMonthlySection}
                                    showSettlementEntry={settlementContext.showSettlementEntry}
                                />
                                {settlementContext.showSettlementPanel ? renderUnifiedSettlementPanel() : null}
                            </div>
                        ) : isEvictionFundsModule ? (
                            <div className="space-y-3">
                                    <div className={embeddedInFinancialHub ? 'flex flex-col gap-y-1' : `${SECTION_GLASS} flex flex-col gap-y-1`}>
										{evictionReenableCourtOrderedFees && (
											<button
												type="button"
												onClick={() => evictionReenableCourtOrderedFees.onEnable()}
												className="mb-2 w-full rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 py-3 px-4 text-[#F5E6A8] font-bold text-xs shadow-sm"
											>
												تفعيل مطالبة الأتعاب المحكوم بها (
												{evictionReenableCourtOrderedFees.grossAmount.toLocaleString('ar-IQ')}{' '}
												د.ع)
											</button>
										)}
                                        <div className="flex flex-col items-center text-center pb-0 mb-0 gap-y-1">
                                            <p className="text-[10px] text-slate-500">متبقي الوعاء</p>
                                            <div className="flex items-center justify-center gap-2">
                                                <p
                                                    className="text-2xl sm:text-3xl font-black tabular-nums leading-none bg-gradient-to-b from-[#FFF8DC] via-[#E6C673] to-amber-700 bg-clip-text text-transparent"
                                                    style={{ filter: 'drop-shadow(0 0 14px rgba(230, 198, 115, 0.32))' }}
                                                >
                                                    {formatIqdDisplay(remainingUnified)}
                                                </p>
                                                {settlementContext.showSettlementEntry &&
                                                settlementUxTier === 'buried' &&
                                                !settlementInProgress ? (
                                                    <SettlementBuriedKebab onActivate={activateSettlementPanel} />
                                                ) : null}
                                                {onShowSeizureLog ? (
                                                    <button
                                                        type="button"
                                                        onClick={onShowSeizureLog}
                                                        className="inline-flex items-center justify-center rounded-full border border-[#E6C673]/35 bg-[#E6C673]/10 p-1 text-[#E6C673] transition hover:bg-[#E6C673]/20"
                                                        title="سجل الحجوزات"
                                                        aria-label="سجل الحجوزات"
                                                    >
                                                        <History size={14} strokeWidth={1.75} />
                                                    </button>
                                                ) : null}
                                                <LedgerExpenseEditCluster
                                                    onExpenses={() => setExpenseSheetOpen(true)}
                                                    onEditFees={() => setFeesSheetOpen(true)}
                                                    hideFees
                                                />
                                            </div>
                                            {settlementContext.showSettlementEntry && settlementUxTier === 'primary' ? (
                                                <div className="w-full pt-2">
                                                    <ReactiveSettlementEntry
                                                        tier="primary"
                                                        isActive={settlementInProgress}
                                                        onActivate={activateSettlementPanel}
                                                        onDeactivate={deactivateSettlementPanel}
                                                    />
                                                </div>
                                            ) : null}
                                            {evictionLawyerFeeWaivedAtIntake &&
                                                sumLawyer <= 0 &&
                                                !isSpecificDeliveryClaim(claimType) &&
                                                !(Array.isArray(claimTypes) &&
                                                    claimTypes.some((ct) => isSpecificDeliveryClaim(ct))) && (
                                                <p className="text-[10px] text-slate-500 text-center leading-relaxed px-1">
                                                    لم تُسجَّل أتعاب محكومة عند فتح الإضبارة — استخدم «تعديل» ثم «إضافة
                                                    بند أتعاب» لإدراجها في الوعاء وتحديث بيانات الإضبارة.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            {(store.completed || remainingUnified <= 0) && totalOwedUnified > 0 && (
                                                <div className="flex items-center justify-center gap-2 text-emerald-300 text-[11px] font-bold">
                                                    <CheckCircle size={15} />
                                                    منجز — الوعاء مغلق
                                                </div>
                                            )}
                                            {store.garnishment && !store.completed && (
                                                <p className="text-center text-[10px] text-indigo-200/90 leading-snug">
                                                    حجز الراتب (١/٥) مفعّل — تابع من التنفيذ والمحجوزات.
                                                </p>
                                            )}
                                            {hasPendingUnifiedCollection &&
                                            !store.completed &&
                                            !hasApprovedUnifiedCollectionDecision ? (
                                                <div className="w-full rounded-lg py-3 px-3 flex items-center justify-center gap-2 text-[11px] font-bold border border-slate-500/30 bg-slate-800/40 text-slate-300">
                                                    <CheckCircle size={16} />
                                                    طلب الاستحصال قيد البت — بانتظار موافقة المنفذ
                                                </div>
                                            ) : canSubmitEvictionPhase2 ? (
                                                <button
                                                    type="button"
                                                    onClick={submitCollectionRequest}
                                                    className="w-full rounded-lg bg-gradient-to-l from-[#E6C673] to-amber-600 py-3.5 px-4 text-[#0A0F1C] font-black text-xs shadow-md shadow-amber-900/20 disabled:opacity-35 flex items-center justify-center gap-2"
                                                >
                                                    <Send size={16} />
                                                    تقديم طلب الاستحصال
                                                </button>
                                            ) : null}
                                            {hasPendingUnifiedCollection &&
                                                !store.completed &&
                                                !hasApprovedUnifiedCollectionDecision && (
                                                <button
                                                    type="button"
                                                    onClick={retractCollectionRequest}
                                                    className={LINK_RETRACT_COLLECTION}
                                                >
                                                    إلغاء طلب الاستحصال والعودة لتعديل الوعاء
                                                </button>
                                            )}
                                        </div>

                                        {settlementContext.showSettlementEntry &&
                                        settlementUxTier === 'secondary' &&
                                        !store.completed &&
                                        remainingUnified > 0 ? (
                                            <ReactiveSettlementEntry
                                                tier="secondary"
                                                isActive={settlementInProgress}
                                                onActivate={activateSettlementPanel}
                                                onDeactivate={deactivateSettlementPanel}
                                            />
                                        ) : null}

                                        {settlementContext.showSettlementPanel
                                            ? renderUnifiedSettlementPanel()
                                            : null}

                                        {null}

                                        {showEvictionLedger && totalOwedUnified > 0 && (
                                            <div className="pt-2 mt-0">
                                                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] mb-2 font-medium">
                                                    <History size={13} />
                                                    سجل الدفعات
                                                </div>
                                                {!hasPaymentRows ? (
                                                    <>
                                                        <p className="text-center text-slate-500 text-[10px] py-2">
                                                            لا دفعات بعد
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={undoLastPayment}
                                                            className="mb-2 w-full rounded-lg border border-rose-500/20 bg-rose-950/30 px-3 py-2 text-[11px] font-bold text-rose-200"
                                                        >
                                                            تراجع عن آخر دفعة
                                                        </button>
                                                        <ul className="space-y-2 max-h-36 overflow-y-auto text-[11px] text-slate-300">
                                                            {store.payments.map((p) => (
                                                            <li
                                                                key={p.id}
                                                                className="flex items-start justify-between gap-3 border-b border-white/5 pb-2"
                                                            >
                                                                <div className="min-w-0 flex-1 text-right">
                                                                    <p className="text-[10px] text-slate-500 tabular-nums">
                                                                        {new Date(p.at).toLocaleDateString('ar-IQ')}
                                                                    </p>
                                                                    <p className="text-slate-400">
                                                                        {(p.entryType === 'disburse'
                                                                            ? 'صرف'
                                                                            : p.entryType === 'settlement'
                                                                              ? 'تسوية'
                                                                              : String(p.id).startsWith('pay-repay-')
                                                                                ? 'تسديد'
                                                                                : p.kind === 'full'
                                                                                  ? 'تحصيل كامل'
                                                                                  : 'تحصيل')}{' '}
                                                                        — {p.entryType === 'disburse' ? 'رصيد الأمانات' : 'متبقي الدين'}{' '}
                                                                        {(p.entryType === 'disburse'
                                                                            ? (p.trustBalanceAfter ?? p.balanceAfter)
                                                                            : (p.debtBalanceAfter ?? p.balanceAfter)
                                                                        ).toLocaleString('ar-IQ')}
                                                                    </p>
                                                                </div>
                                                                <span
                                                                    className={`${p.entryType === 'disburse' ? 'text-rose-300' : 'text-emerald-300'} text-sm font-black tabular-nums`}
                                                                >
                                                                    {p.entryType === 'disburse' ? '-' : '+'}
                                                                    {p.amount.toLocaleString('ar-IQ')}
                                                                </span>
                                                            </li>
                                                            ))}
                                                        </ul>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                            <StandardFinancialLedger
                                executionId={executionId}
                                totalOwedUnified={totalOwedUnified}
                                remainingUnified={remainingUnified}
                                baseDossierAmount={baseDossierAmount}
                                store={store}
                                setExpenseSheetOpen={setExpenseSheetOpen}
                                setFeesSheetOpen={setFeesSheetOpen}
                                canShowDisburse={canShowDisburse}
                                onOpenDisburse={() => setDisburseModalOpen(true)}
                                retractCollectionRequest={retractCollectionRequest}
                                unifiedCollectionExecutorApproved={unifiedCollectionExecutorApproved}
                                showEmployeeCollection={showEmployeeCollectionStandard}
                                showNonEmployeePhase2={showNonEmployeePhase2Standard}
                                applyFullPayment={applyFullPayment}
                                setShowGarnishModal={setShowGarnishModal}
                                undoLastPayment={undoLastPayment}
                                financialLedger={financialLedger}
                                onPayment={onPayment}
                                canEditDebtTotals={!debtEditLockReason}
                                onOpenDebtEdit={openDebtEditModal}
                                flatChrome={embeddedInFinancialHub}
                                settlementUxTier={settlementUxTier}
                                settlementPanelOpen={settlementPanelOpen}
                                onActivateSettlement={activateSettlementPanel}
                                onDeactivateSettlement={deactivateSettlementPanel}
                                repaymentInput={repaymentInput}
                                setRepaymentInput={setRepaymentInput}
                                canApplyRepayment={canApplyRepayment}
                                applyDebtRepayment={applyDebtRepayment}
                                repaymentExceedsRemaining={repaymentExceedsRemaining}
                                showSettlementEntry={settlementContext.showSettlementEntry}
                            />
                            {settlementContext.showSettlementPanel ? renderUnifiedSettlementPanel() : null}
                            {canShowGhuramaaDivision && trustBalanceUnified > 0 ? (
                                <div className="px-2 pb-2" dir="rtl">
                                    <button
                                        type="button"
                                        onClick={openGhuramaaModal}
                                        className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-amber-700 py-3.5 px-4 text-[#0A0F1C] font-black text-xs shadow-md shadow-amber-900/25 flex items-center justify-center gap-2"
                                    >
                                        <Send size={16} className="shrink-0" />
                                        إجراء قسمة الغرماء وتوزيع الأمانات
                                    </button>
                                </div>
                            ) : null}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {disburseModalOpen && (
                    <FocModalPortal
                        open
                        onBackdropClick={() => setDisburseModalOpen(false)}
                        backdropClassName="bg-black/55"
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 8 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl"
                            dir="rtl"
                        >
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setDisburseModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                                >
                                    <X size={18} />
                                </button>
                                <h4 className="text-sm font-black text-emerald-200">طلب صرف الأمانات التنفيذية</h4>
                            </div>
                            <div className="mt-3 space-y-3">
                                {canShowGhuramaaDivision && trustBalanceUnified > 0 ? (
                                    <>
                                        <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-right">
                                            <p className="text-[11px] font-black text-amber-200">قسمة الغرماء (توزيع الأمانات)</p>
                                            <p className="mt-1 text-[10px] text-slate-300 leading-relaxed">
                                                يوجد أكثر من دائن واحد؛ أدخل حصة كل دائن يدوياً ضمن رصيد الأمانات وديونه المتبقية.
                                            </p>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                                                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                                    <p className="text-slate-500">رصيد الأمانات</p>
                                                    <p className="mt-0.5 font-black tabular-nums text-slate-200">
                                                        {trustBalanceUnified.toLocaleString('ar-IQ')} د.ع
                                                    </p>
                                                </div>
                                                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                                    <p className="text-slate-500">عدد الدائنين</p>
                                                    <p className="mt-0.5 font-black tabular-nums text-slate-200">
                                                        {creditorsCount ?? 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDisburseModalOpen(false)}
                                                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-bold text-slate-200"
                                            >
                                                إلغاء
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDisburseModalOpen(false);
                                                    openGhuramaaModal();
                                                }}
                                                className="flex-1 rounded-xl bg-amber-600/80 py-2.5 text-xs font-black text-white"
                                            >
                                                إجراء القسمة
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="المبلغ المراد صرفه (د.ع)"
                                            value={disburseAmountInput}
                                            onChange={(e) => setDisburseAmountInput(formatNumberInput(e.target.value))}
                                            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500"
                                        />
                                        <p className="text-[10px] text-slate-400 text-right">
                                            رصيد الأمانات الحالي: {trustBalanceUnified.toLocaleString('ar-IQ')} د.ع
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDisburseModalOpen(false)}
                                                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-bold text-slate-200"
                                            >
                                                إلغاء
                                            </button>
                                            <button
                                                type="button"
                                                onClick={applyDisbursementAmount}
                                                disabled={!canApplyDisburseAmount}
                                                className="flex-1 rounded-xl bg-emerald-600/75 py-2.5 text-xs font-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                توثيق الصرف
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </FocModalPortal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ghuramaaModalOpen && (
                    <FocModalPortal
                        open
                        onBackdropClick={() => setGhuramaaModalOpen(false)}
                        backdropClassName="bg-black/55"
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 8 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl"
                            dir="rtl"
                        >
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setGhuramaaModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                                >
                                    <X size={18} />
                                </button>
                                <h4 className="text-sm font-black text-amber-200">قسمة الغرماء — توزيع الأمانات</h4>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right">
                                    <p className="text-[10px] text-slate-500">رصيد الأمانات المتاح</p>
                                    <p className="mt-0.5 text-[13px] font-black tabular-nums text-slate-100">
                                        {ghuramaaContext.available.toLocaleString('ar-IQ')} د.ع
                                    </p>
                                </div>
                                <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-right">
                                    <p className="text-[10px] text-amber-200/80">المبلغ الذي سيتم توزيعه</p>
                                    <p className="mt-0.5 text-[13px] font-black tabular-nums text-amber-100">
                                        {ghuramaaManual.sum.toLocaleString('ar-IQ')} د.ع
                                    </p>
                                </div>
                            </div>

                            {ghuramaaManual.validationNote ? (
                                <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-right text-[11px] text-rose-200">
                                    {ghuramaaManual.validationNote}
                                </div>
                            ) : null}

                            {ghuramaaManual.partialWarning ? (
                                <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-right text-[11px] text-amber-100">
                                    {ghuramaaManual.partialWarning}
                                </div>
                            ) : null}

                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={applyGhuramaaEqualSplit}
                                    disabled={ghuramaaContext.eligible.length === 0 || ghuramaaContext.available <= 0}
                                    className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[10px] font-black text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    تقسيم بالتساوي
                                </button>
                            </div>

                            <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                                <div className="grid grid-cols-2 gap-0 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold text-slate-400">
                                    <div className="text-right">الدائن</div>
                                    <div className="text-right">حصة الدائن</div>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {ghuramaaContext.eligible.length > 0 ? (
                                        ghuramaaContext.eligible.map((c) => (
                                            <div
                                                key={c.creditorId}
                                                className="grid grid-cols-2 gap-2 border-b border-white/5 px-3 py-2 text-[11px] text-slate-200 items-center"
                                            >
                                                <div className="truncate text-right font-bold">{c.creditorName}</div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        placeholder="أدخل المبلغ"
                                                        value={ghuramaaShareInputs[c.creditorId] ?? ''}
                                                        onChange={(e) =>
                                                            setGhuramaaShareInput(c.creditorId, e.target.value)
                                                        }
                                                        className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-white text-right text-[11px] tabular-nums placeholder:text-slate-500"
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-3 text-[11px] text-slate-400 text-right">
                                            {ghuramaaContext.note || 'لا توجد بيانات قابلة للعرض.'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!ghuramaaManual.isEqualMode && ghuramaaManual.sum > 0 ? (
                                <p className="mt-2 text-[10px] text-slate-400 text-right">
                                    المتبقي من الأمانات بعد التوزيع:{' '}
                                    <span
                                        className={`font-black tabular-nums ${
                                            ghuramaaManual.remainingAfter > 0 ? 'text-amber-200' : 'text-slate-200'
                                        }`}
                                    >
                                        {ghuramaaManual.remainingAfter.toLocaleString('ar-IQ')} د.ع
                                    </span>
                                </p>
                            ) : null}

                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setGhuramaaModalOpen(false)}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-bold text-slate-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={applyGhuramaaDistribution}
                                    disabled={!ghuramaaManual.ok}
                                    className="flex-1 rounded-xl bg-amber-600/80 py-2.5 text-xs font-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    اعتماد وتوزيع القسمة
                                </button>
                            </div>
                        </motion.div>
                    </FocModalPortal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {debtEditOpen && (
                    <DebtTotalsEditModal
                        open={debtEditOpen}
                        onClose={() => setDebtEditOpen(false)}
                        totalInput={debtEditTotalInput}
                        setTotalInput={setDebtEditTotalInput}
                        remainingInput={debtEditRemainingInput}
                        setRemainingInput={setDebtEditRemainingInput}
                        onSave={applyDebtTotalsEdit}
                        lockReason={debtEditLockReason}
                        showAlimonyAccrualNote={Boolean(isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {feesSheetOpen && (
                    <FocModalPortal
                        open
                        onBackdropClick={() => setFeesSheetOpen(false)}
                        backdropClassName="bg-black/50"
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={sheetClass}
                        >
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setFeesSheetOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                                >
                                    <X size={18} />
                                </button>
                                <h4 className="text-sm font-bold text-emerald-200/95">تعديل الأتعاب</h4>
                            </div>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="المبلغ (د.ع)"
                                    value={lawyerAmountInput}
                                    onChange={(e) => setLawyerAmountInput(formatNumberInput(e.target.value))}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="وصف (اختياري)"
                                    value={lawyerLabelInput}
                                    onChange={(e) => setLawyerLabelInput(e.target.value)}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={addLawyerFee}
                                    disabled={!canAddLawyerFee}
                                    className="w-full rounded-xl bg-emerald-600/75 py-2.5 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    إضافة بند أتعاب
                                </button>
                            </div>
                            {evictionFinanceStrip && isEvictionFundsModule && (
                                <button
                                    type="button"
                                    title={evictionFinanceStrip.lawyerFeeRequestTitle}
                                    disabled={evictionFinanceStrip.lawyerFeeRequestDisabled}
                                    onClick={() => {
                                        if (!evictionFinanceStrip.lawyerFeeRequestDisabled) {
                                            evictionFinanceStrip.onRequestLawyerFees();
                                            setFeesSheetOpen(false);
                                        }
                                    }}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 text-[11px] text-slate-300 disabled:opacity-40"
                                >
                                    طلب صرف أتعاب (تخلية)
                                </button>
                            )}
                            <ul className="space-y-2 max-h-40 overflow-y-auto text-right text-[11px] text-slate-400">
                                {store.lawyerFees.map((r) => (
                                    <li key={r.id} className="border-b border-white/5 pb-1">
                                        <span className="text-emerald-400 font-bold tabular-nums">
                                            {r.amount.toLocaleString('ar-IQ')}
                                        </span>{' '}
                                        — {r.label}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </FocModalPortal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {expenseSheetOpen && (
                    <FocModalPortal
                        open
                        onBackdropClick={() => setExpenseSheetOpen(false)}
                        backdropClassName="bg-black/50"
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={sheetClass}
                        >
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setExpenseSheetOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                                >
                                    <X size={18} />
                                </button>
                                <h4 className="text-sm font-bold text-sky-200/95">إضافة مصاريف</h4>
                            </div>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="المبلغ (د.ع)"
                                    value={expenseAmountInput}
                                    onChange={(e) => setExpenseAmountInput(formatNumberInput(e.target.value))}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm"
                                />
                                <textarea
                                    placeholder="السبب — أجور خبير، رسوم، ..."
                                    value={expenseReasonInput}
                                    onChange={(e) => setExpenseReasonInput(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm resize-none"
                                />
                                <button
                                    type="button"
                                    onClick={addExpense}
                                    disabled={!canAddExpense}
                                    className="w-full rounded-xl bg-sky-600/75 py-2.5 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    تسجيل مصروف
                                </button>
                            </div>
                            <ul className="space-y-2 max-h-40 overflow-y-auto text-right text-[11px] text-slate-400">
                                {store.expenses.map((r) => (
                                    <li key={r.id} className="border-b border-white/5 pb-1">
                                        <span className="text-sky-400 font-bold tabular-nums">
                                            {r.amount.toLocaleString('ar-IQ')}
                                        </span>{' '}
                                        — {r.reason}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </FocModalPortal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showGarnishModal && (
                    <FocModalPortal
                        open
                        onBackdropClick={closeGarnishModal}
                        backdropClassName="bg-black/55"
                    >
                        <motion.div
                            layout
                            initial={{ scale: 0.94, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 8 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl bg-[#0A1122]/80 backdrop-blur-xl p-6 border border-white/10 shadow-2xl space-y-5"
                        >
                            <div className="text-center border-b border-white/5 pb-4">
                                <h3 className="text-base font-black text-white">حجز الراتب</h3>
                                <p className="text-[11px] text-slate-500 mt-1">قاعدة الخُمس (١/٥) — مدين موظف</p>
                            </div>

                            <div className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-indigo-950/50 via-violet-950/30 to-transparent px-4 py-3.5 text-right">
                                <p className="text-violet-100 text-sm font-bold">بيانات الاستقطاع والكتاب</p>
                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                    خصم شهري لا يتجاوز الخُمس؛ يُتابع لدى المنفذ وجهة العمل. أكمل الحقول ثم أكّد.
                                </p>
                            </div>

                            <motion.div
                                layout
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                                className="space-y-4 overflow-hidden"
                            >
                                <label className="block text-right">
                                    <span className="text-[11px] text-slate-400 mb-1.5 block">
                                        مقدار الاستقطاع الشهري (قاعدة الخُمس)
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        autoFocus
                                        placeholder="المبلغ الشهري (د.ع)"
                                        value={garnishMonthlyInput}
                                        onChange={(e) =>
                                            setGarnishMonthlyInput(formatNumberInput(e.target.value))
                                        }
                                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/35"
                                    />
                                </label>
                                <label className="block text-right">
                                    <span className="text-[11px] text-slate-400 mb-1.5 block">رقم الكتاب</span>
                                    <input
                                        type="text"
                                        placeholder="رقم الكتاب / المرجع"
                                        value={garnishMemoInput}
                                        onChange={(e) => setGarnishMemoInput(e.target.value)}
                                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/35"
                                    />
                                </label>
                            </motion.div>

                            <p className="text-slate-400 text-xs text-right border-t border-white/5 pt-3">
                                المتبقي على الوعاء:{' '}
                                <span className="text-[#E6C673] font-black tabular-nums">
                                    {remainingUnified.toLocaleString('ar-IQ')} د.ع
                                </span>
                            </p>

                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={closeGarnishModal}
                                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/10 transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmGarnishment}
                                    disabled={!canConfirmGarnishment}
                                    className="px-4 py-2.5 rounded-xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-800 text-white text-sm font-bold shadow-lg shadow-violet-950/40 hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    تأكيد حجز الراتب
                                </button>
                            </div>
                        </motion.div>
                    </FocModalPortal>
                )}
            </AnimatePresence>

            {showGuarantorModal && (
                <GuarantorRegistrationModal
                    isOpen={showGuarantorModal}
                    onClose={() => setShowGuarantorModal(false)}
                    onSave={handleSaveGuarantor}
                />
            )}

            <AnimatePresence>{renderAlimonyDetailModal()}</AnimatePresence>
        </div>
    );
});
