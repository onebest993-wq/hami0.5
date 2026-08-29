import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { HeartHandshake } from '@/app/components/ui/icons/HeartHandshake';
import { History } from '@/app/components/ui/icons/History';
import { X } from '@/app/components/ui/icons/X';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { publishFinancialCenterTimelineNote } from '@/app/utils/financialCenterTimeline';
import type { TimelineEventType } from '@/app/types/execution';
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
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { FocModalPortal } from './FinancialOperationsCenter/components/FocModalPortal';
import { DebtTotalsEditModal } from './FinancialOperationsCenter/components/DebtTotalsEditModal';
import { DebtorAgentFinancialHubPanel } from './FinancialOperationsCenter/components/DebtorAgentFinancialHubPanel';
import { FocDisburseModal } from './FinancialOperationsCenter/components/FocDisburseModal';
import { FocGhuramaaModal } from './FinancialOperationsCenter/components/FocGhuramaaModal';
import { FocFeesSheet } from './FinancialOperationsCenter/components/FocFeesSheet';
import { FocExpenseSheet } from './FinancialOperationsCenter/components/FocExpenseSheet';
import { FocGarnishModal } from './FinancialOperationsCenter/components/FocGarnishModal';
import { FocFundsCardHeader } from './FinancialOperationsCenter/components/FocFundsCardHeader';
import { FocCreditorExpandedBody } from './FinancialOperationsCenter/components/FocCreditorExpandedBody';
import { parseStoredMoney, isEmployeeDebtor } from './FinancialOperationsCenter/utils';
import { MANAGEMENT_CARD_OUTER } from './FinancialOperationsCenter/constants';
import { useFocLedgerStore, useFocLedgerExternalCollectSync } from './FinancialOperationsCenter/useFocLedgerStore';
import { useFocLedgerDerived } from './FinancialOperationsCenter/useFocLedgerDerived';
import { useFocSettlementActions } from './FinancialOperationsCenter/useFocSettlementActions';
import { useFocPaymentDisburseActions } from './FinancialOperationsCenter/useFocPaymentDisburseActions';
import { useFocCollectionActions } from './FinancialOperationsCenter/useFocCollectionActions';
import type { FinancialOperationsCenterProps } from './FinancialOperationsCenter/focProps';

export type { FinancialOperationsCenterProps } from './FinancialOperationsCenter/focProps';

// ═══════════════════════════════════════════════════════════════════════════
// إدارة الأموال — مسار التخلية معزول عن مسار التنفيذ المالي القياسي
// ═══════════════════════════════════════════════════════════════════════════

export const FinancialOperationsCenter: React.FC<FinancialOperationsCenterProps> = React.memo(
    function FinancialOperationsCenter({
    isExpanded,
    onToggle,
    activeTab: _activeTab,
    onTabChange: _onTabChange,
    principal_amount,
    court_ordered_fees,
    execution_expenses_sum,
    remaining: _remainingFromDashboard,
        financialStatus: _financialStatus,
        isNonFinancialClaim: _isNonFinancialClaim,
    isAlimonyClaim,
    claimType,
    claimTypes,
        paidDebt: _paidDebt,
    executionFee,
    shouldCalculateExecutionFee,
    monthlyAlimony,
        accumulatedAlimony: _accumulatedAlimony,
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
        debtorKinship: _debtorKinship,
    onPayment,
        onSettlement: _onSettlement,
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
        onFinancialTimelineNote: _onFinancialTimelineNote,
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
                else if (variant === 'success') SmartToast.success(message);
                else if (variant === 'error') SmartToast.error(message);
                else if (variant === 'info') SmartToast.info(message);
                else SmartToast.warning(message);
        },
        [onToast]
    );

    const recordFinancialTimelineNote = useCallback(
        (title: string, description: string, type: TimelineEventType | string = 'other') => {
            publishFinancialCenterTimelineNote(executionId, title, description, type);
        },
        [executionId]
    );

    const canShowGhuramaaDivision = (creditorsCount ?? 0) > 1;
    const isEvictionFundsModule = isEvictionClaim(claimType);
    const courtOrderedFeesSafe = Math.max(0, parseStoredMoney(court_ordered_fees) || 0);
    const executionExpensesSumSafe = Math.max(0, parseStoredMoney(execution_expenses_sum) || 0);
    const evictionCaseExpensesSumSafe = Math.max(0, parseStoredMoney(eviction_case_expenses_sum) || 0);
        const employeeDebtor = isEmployeeDebtor(debtorJob, debtorEmploymentType);

        const [disburseModalOpen, setDisburseModalOpen] = useState(false);
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
    const [disburseAmountInput, setDisburseAmountInput] = useState('');
    const [ghuramaaModalOpen, setGhuramaaModalOpen] = useState(false);
    const [settlementPanelOpen, setSettlementPanelOpen] = useState(false);
    const [alimonyDetailOpen, setAlimonyDetailOpen] = useState(false);
    const [alimonyData, setAlimonyData] = useState<AlimonyData | null>(null);

        const {
            store,
            setStore,
            storeRef,
            persist,
            getLatestLedgerStore,
            ledgerTotalParams,
            isEvictionCollectionRequested,
            setIsEvictionCollectionRequested,
            unifiedCollectionExecutorApproved,
            unifiedCollectionDecisionState,
        } = useFocLedgerStore({
            executionId,
            principal_amount,
            courtOrderedFeesSafe,
            executionExpensesSumSafe,
            evictionCaseExpensesSumSafe,
            evictionLawyerFeeWaivedAtIntake,
            isEvictionFundsModule,
            notify,
            setDisburseModalOpen,
            autoOpenLedgerMode,
            onAutoOpenHandled,
        });

        const {
            sumLawyer,
            alimonyBreakdown,
            ongoingAlimonyDisplay,
            ongoingMonthlyAlimonyTotal,
            showOngoingAlimonyMonthlySection,
            ongoingMonthlyAlimonyEffective,
            principalBasisAmount,
            baseDossierAmount,
            totalOwedUnified,
            hasPaymentRows,
            remainingUnified,
            debtEditLockReason,
            settlementUxTier,
            trustBalanceUnified,
            hasApprovedUnifiedCollectionDecision,
            hasPendingUnifiedCollection,
            canApplySettlementAny,
            pendingSettlementDueYmd,
            pendingSettlementDuePhase,
            showSettlementDueActions,
            settlementInProgress,
            salarySeizureActive,
            settlementContext,
            showEmployeeCollectionStandard,
            showNonEmployeePhase2Standard,
            canShowDisburse,
            canSubmitEvictionPhase2,
            hideEvictionTotalsInChrome,
        } = useFocLedgerDerived({
            store,
            ledgerTotalParams,
            executionId,
            claimType,
            claimTypes,
            isAlimonyClaim,
            alimonyCalculated,
            past_wife_alimony,
            past_children_alimony,
            pastAlimonyClaim,
            monthly_wife_alimony,
            monthly_children_alimony,
            monthlyAlimony,
            children_count,
            alimony_beneficiary_death,
            alimony_blob,
            activeDebtorIsDeceased,
            evictionLawyerFeeWaivedAtIntake,
            courtOrderedFeesSafe,
            isEvictionFundsModule,
            employeeDebtor,
            unifiedCollectionExecutorApproved,
            unifiedCollectionDecisionState,
            isEvictionCollectionRequested,
            salarySeizureRegistryAssets,
            settlementPanelOpen,
            showSettlementEviction,
            settlementInput,
        });

        useFocLedgerExternalCollectSync({
            executionId,
            totalOwedUnified,
            setStore,
            storeRef,
        });

        const { openDebtEditModal, applyDebtTotalsEdit, submitCollectionRequest } = useFocCollectionActions({
            persist,
            getLatestLedgerStore,
            ledgerTotalParams,
            notify,
            recordFinancialTimelineNote,
                    executionId,
            isEvictionFundsModule,
            unifiedCollectionExecutorApproved,
            setIsEvictionCollectionRequested,
            totalOwedUnified,
            remainingUnified,
            debtEditLockReason,
            debtEditTotalInput,
            setDebtEditTotalInput,
            debtEditRemainingInput,
            setDebtEditRemainingInput,
            setDebtEditOpen,
            onManualDebtTotalsUpdated,
            onAfterCollectionRequestSubmitted,
            onEvictionLedgerActivated,
            evictionLedgerActivatedPersisted,
        });

        const {
            canAddLawyerFee,
            addLawyerFee,
            canAddExpense,
            addExpense,
            canApplyDisburseAmount,
            applyDisbursementAmount,
            canConfirmGarnishment,
            confirmGarnishment,
            closeGarnishModal,
            canApplyRepayment,
            repaymentExceedsRemaining,
            applyDebtRepayment,
            undoLastPayment,
            applyFullPayment,
            retractCollectionRequest,
            ghuramaaContext,
            ghuramaaManual,
            ghuramaaShareInputs,
            setGhuramaaShareInput,
            applyGhuramaaEqualSplit,
            openGhuramaaModal,
            applyGhuramaaDistribution,
        } = useFocPaymentDisburseActions({
            store,
            persist,
            getLatestLedgerStore,
            notify,
            recordFinancialTimelineNote,
        executionId,
            ledgerTotalParams,
            totalOwedUnified,
            remainingUnified,
            trustBalanceUnified,
            isEvictionFundsModule,
        evictionLawyerFeeWaivedAtIntake,
            setIsEvictionCollectionRequested,
            unifiedCollectionExecutorApproved,
            onEvictionCourtOrderedFeesActivatedFromLedger,
            onFundsLedgerPayment,
            onCoerciveAction,
            proceedsDisburseSeizedMovableId,
            onProceedsDisburseHandled,
            proceedsDisburseSeizedPropertyId,
            onProceedsDisbursePropertyHandled,
            onApplyGhuramaaDistribution,
            canShowGhuramaaDivision,
            ghuramaaCreditors,
            ghuramaaModalOpen,
            setGhuramaaModalOpen,
            setDisburseModalOpen,
            lawyerAmountInput,
            setLawyerAmountInput,
            lawyerLabelInput,
            setLawyerLabelInput,
            expenseAmountInput,
            setExpenseAmountInput,
            expenseReasonInput,
            setExpenseReasonInput,
            disburseAmountInput,
            setDisburseAmountInput,
            garnishMonthlyInput,
            setGarnishMonthlyInput,
            garnishMemoInput,
            setGarnishMemoInput,
            setShowGarnishModal,
            repaymentInput,
            setRepaymentInput,
            setShowRepaymentEviction,
        });

        const {
            registerSettlementPlan,
            markPendingSettlementPaid,
            cancelPendingSettlement,
            endSettlementSimple,
            activateSettlementPanel,
            deactivateSettlementPanel,
        } = useFocSettlementActions({
            store,
            persist,
            getLatestLedgerStore,
            notify,
            recordFinancialTimelineNote,
            settlementInput,
            setSettlementInput,
            settlementDueDateInput,
            setSettlementDueDateInput,
            setShowSettlementEviction,
            setSettlementPanelOpen,
            remainingUnified,
            trustBalance: trustBalanceUnified,
            principalBasisAmount,
            isAlimonyClaim,
            ongoingMonthlyAlimonyEffective,
            isEvictionFundsModule,
            setIsEvictionCollectionRequested,
            salarySeizureRegistryAssets,
            salarySeizureActive,
            onFundsLedgerPayment,
            onClearSalarySeizurePath,
            onMonthlySettlementPaid,
            onMonthlySettlementDefault,
            onAlimonyOngoingAccrued,
        });

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

    useEffect(() => {
            if (settlementUxTier === 'hidden') deactivateSettlementPanel();
        }, [settlementUxTier, deactivateSettlementPanel]);

    useEffect(() => {
            if (salarySeizureActive) deactivateSettlementPanel();
        }, [salarySeizureActive, deactivateSettlementPanel]);

    useEffect(() => {
            if (activeDebtorIsDeceased) deactivateSettlementPanel();
        }, [activeDebtorIsDeceased, deactivateSettlementPanel]);

    const handleSaveGuarantor = (guarantorInfo: GuarantorInfo) => {
        if (alimonyData && executionId) {
            const updated = registerGuarantor(alimonyData, guarantorInfo);
            setAlimonyData(updated);
            saveAlimonyDataToExecution(executionId, updated);
        }
        setShowGuarantorModal(false);
    };

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

    return (
        <div
            className={
                embeddedInFinancialHub
                    ? 'relative z-10 mx-0 mt-0 rounded-none border-0 bg-transparent p-0 shadow-none'
                    : `relative z-10 mx-3 mt-3 ${MANAGEMENT_CARD_OUTER}`
            }
            dir="rtl"
        >
                <FocFundsCardHeader
                    embeddedInFinancialHub={embeddedInFinancialHub}
                    isExpanded={isExpanded}
                    isRepresentingDebtor={isRepresentingDebtor}
                    onToggle={onToggle}
                    onKeyToggle={fundsHeaderKeyToggle}
                    collapsedHeaderClassName={fundsHeaderCollapsed}
                    expandedHeaderClassName={fundsHeaderExpanded}
                    hideEvictionTotalsInChrome={hideEvictionTotalsInChrome}
                    totalOwedUnified={totalOwedUnified}
                    remainingUnified={remainingUnified}
                    trustBalanceUnified={trustBalanceUnified}
                    onShowSeizureLog={onShowSeizureLog}
                    onShowLedger={onShowLedger}
                    openDebtEditModal={openDebtEditModal}
                    debtEditLockReason={debtEditLockReason}
                    showOngoingAlimonyMonthlySection={showOngoingAlimonyMonthlySection}
                    onOpenAlimonyDetail={() => setAlimonyDetailOpen(true)}
                />

            {embeddedInFinancialHub && !isRepresentingDebtor && (
                <div className="space-y-2 pb-2">
                    {!hideEvictionTotalsInChrome ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                                <div className="flex flex-row-reverse items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="mb-0.5 text-[10px] font-medium text-slate-400">إجمالي الدين</p>
                                        <p className="text-base font-black leading-tight text-white tabular-nums">
                                                {totalOwedUnified.toLocaleString('ar-IQ')}{' '}
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
                                        {trustBalanceUnified.toLocaleString('ar-IQ')}{' '}
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
                    {showExpandedBody && !(isRepresentingDebtor && embeddedInFinancialHub) ? (
                        <FocCreditorExpandedBody
                            embeddedInFinancialHub={embeddedInFinancialHub}
                            isAlimonyClaim={isAlimonyClaim}
                            isEvictionFundsModule={isEvictionFundsModule}
                            shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                            executionFee={executionFee}
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
                            showSettlementPanel={settlementContext.showSettlementPanel}
                            canShowGhuramaaDivision={canShowGhuramaaDivision}
                            trustBalanceUnified={trustBalanceUnified}
                            onOpenGhuramaaModal={openGhuramaaModal}
                            evictionReenableCourtOrderedFees={evictionReenableCourtOrderedFees}
                            settlementInProgress={settlementInProgress}
                            onShowSeizureLog={onShowSeizureLog}
                            evictionLawyerFeeWaivedAtIntake={evictionLawyerFeeWaivedAtIntake}
                            sumLawyer={sumLawyer}
                            claimType={claimType}
                            claimTypes={claimTypes}
                            hasPendingUnifiedCollection={hasPendingUnifiedCollection}
                            hasApprovedUnifiedCollectionDecision={hasApprovedUnifiedCollectionDecision}
                            canSubmitEvictionPhase2={canSubmitEvictionPhase2}
                            submitCollectionRequest={submitCollectionRequest}
                            hasPaymentRows={hasPaymentRows}
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
                            showAmountGuarantorRequest={settlementContext.showAmountGuarantorRequest}
                            onGuarantorRequest={onGuarantorRequest}
                        />
                                                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                    {disburseModalOpen ? (
                        <FocDisburseModal
                            open={disburseModalOpen}
                            onClose={() => setDisburseModalOpen(false)}
                            canShowGhuramaaDivision={canShowGhuramaaDivision}
                            trustBalanceUnified={trustBalanceUnified}
                            creditorsCount={creditorsCount}
                            disburseAmountInput={disburseAmountInput}
                            setDisburseAmountInput={setDisburseAmountInput}
                            canApplyDisburseAmount={canApplyDisburseAmount}
                            onApplyDisbursement={applyDisbursementAmount}
                            onOpenGhuramaaModal={() => {
                                                    setDisburseModalOpen(false);
                                                    openGhuramaaModal();
                                                }}
                        />
                    ) : null}
            </AnimatePresence>

            <AnimatePresence>
                    {ghuramaaModalOpen ? (
                        <FocGhuramaaModal
                            open={ghuramaaModalOpen}
                            onClose={() => setGhuramaaModalOpen(false)}
                            available={ghuramaaContext.available}
                            eligible={ghuramaaContext.eligible}
                            note={ghuramaaContext.note}
                            shareInputs={ghuramaaShareInputs}
                            onShareInputChange={setGhuramaaShareInput}
                            onEqualSplit={applyGhuramaaEqualSplit}
                            manualSum={ghuramaaManual.sum}
                            validationNote={ghuramaaManual.validationNote}
                            partialWarning={ghuramaaManual.partialWarning}
                            remainingAfter={ghuramaaManual.remainingAfter}
                            isEqualMode={ghuramaaManual.isEqualMode}
                            canConfirm={ghuramaaManual.ok}
                            onConfirm={applyGhuramaaDistribution}
                        />
                            ) : null}
            </AnimatePresence>

            <AnimatePresence>
                    {debtEditOpen ? (
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
                    ) : null}
            </AnimatePresence>

            <AnimatePresence>
                    {feesSheetOpen ? (
                        <FocFeesSheet
                            open={feesSheetOpen}
                            onClose={() => setFeesSheetOpen(false)}
                            sheetClass={sheetClass}
                            lawyerAmountInput={lawyerAmountInput}
                            setLawyerAmountInput={setLawyerAmountInput}
                            lawyerLabelInput={lawyerLabelInput}
                            setLawyerLabelInput={setLawyerLabelInput}
                            canAddLawyerFee={canAddLawyerFee}
                            onAddLawyerFee={addLawyerFee}
                            evictionFinanceStrip={
                                evictionFinanceStrip
                                    ? {
                                          lawyerFeeRequestTitle: evictionFinanceStrip.lawyerFeeRequestTitle,
                                          lawyerFeeRequestDisabled: evictionFinanceStrip.lawyerFeeRequestDisabled,
                                          onRequestLawyerFees: evictionFinanceStrip.onRequestLawyerFees,
                                      }
                                    : undefined
                            }
                            isEvictionFundsModule={isEvictionFundsModule}
                            lawyerFees={store.lawyerFees}
                        />
                    ) : null}
            </AnimatePresence>

            <AnimatePresence>
                    {expenseSheetOpen ? (
                        <FocExpenseSheet
                            open={expenseSheetOpen}
                            onClose={() => setExpenseSheetOpen(false)}
                            sheetClass={sheetClass}
                            expenseAmountInput={expenseAmountInput}
                            setExpenseAmountInput={setExpenseAmountInput}
                            expenseReasonInput={expenseReasonInput}
                            setExpenseReasonInput={setExpenseReasonInput}
                            canAddExpense={canAddExpense}
                            onAddExpense={addExpense}
                            expenses={store.expenses}
                        />
                    ) : null}
            </AnimatePresence>

            <AnimatePresence>
                    {showGarnishModal ? (
                        <FocGarnishModal
                            open={showGarnishModal}
                            onClose={closeGarnishModal}
                            garnishMonthlyInput={garnishMonthlyInput}
                            setGarnishMonthlyInput={setGarnishMonthlyInput}
                            garnishMemoInput={garnishMemoInput}
                            setGarnishMemoInput={setGarnishMemoInput}
                            remainingUnified={remainingUnified}
                            canConfirmGarnishment={canConfirmGarnishment}
                            onConfirm={confirmGarnishment}
                        />
                    ) : null}
            </AnimatePresence>

                {showGuarantorModal ? (
                    <GuarantorRegistrationModal
                        isOpen={showGuarantorModal}
                        onClose={() => setShowGuarantorModal(false)}
                        onSave={handleSaveGuarantor}
                    />
                ) : null}

            <AnimatePresence>
                    {showOngoingAlimonyMonthlySection && alimonyDetailOpen ? (
                    <FocModalPortal
                        open
                            onBackdropClick={() => setAlimonyDetailOpen(false)}
                            backdropClassName="bg-black/60"
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 8 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                    ) : null}
            </AnimatePresence>
        </div>
    );
    }
);
