import React, { useCallback, useEffect, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { publishFinancialCenterTimelineNote } from '@/app/utils/financialCenterTimeline';
import type { TimelineEventType } from '@/app/types/execution';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { FocLazyDebtorAgentFinancialHubPanel } from './FinancialOperationsCenter/focLazySettlementChrome';
import { FocFundsCardHeader } from './FinancialOperationsCenter/components/FocFundsCardHeader';
import { FocCreditorExpandedBody } from './FinancialOperationsCenter/components/FocCreditorExpandedBody';
import {
    FocLazyOverlay,
    LazyDebtTotalsEditModal,
    LazyFocAlimonyDetailOverlay,
    LazyFocDisburseModal,
    LazyFocExpenseSheet,
    LazyFocFeesSheet,
    LazyFocGarnishModal,
    LazyFocGhuramaaModal,
    prefetchFocAlimonyDetailOverlay,
    prefetchFocDebtTotalsEditModal,
    prefetchFocDisburseModal,
    prefetchFocExpenseSheet,
    prefetchFocFeesSheet,
    prefetchFocGarnishModal,
    prefetchFocGhuramaaModal,
} from './FinancialOperationsCenter/focOverlaySurfacesLazy';
import { parseStoredMoney, isEmployeeDebtor } from './FinancialOperationsCenter/utils';
import { MANAGEMENT_CARD_OUTER } from './FinancialOperationsCenter/constants';
import { useFocLedgerStore, useFocLedgerExternalCollectSync } from './FinancialOperationsCenter/useFocLedgerStore';
import { useFocLedgerDerived } from './FinancialOperationsCenter/useFocLedgerDerived';
import { useFocSettlementActions } from './FinancialOperationsCenter/useFocSettlementActions';
import { useFocPaymentDisburseActions } from './FinancialOperationsCenter/useFocPaymentDisburseActions';
import { useFocGhuramaaActions } from './FinancialOperationsCenter/useFocGhuramaaActions';
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
    financialLedger = [],
    executionId,
    creditorsCount,
    ghuramaaCreditors,
    onApplyGhuramaaDistribution,
    evictionFinanceStrip,
    eviction_case_expenses_sum = 0,
        onFundsLedgerPayment,
        onFinancialTimelineNote: _onFinancialTimelineNote,
        onPersistSettlementGuarantor,
        settlementGuarantorName,
        settlementGuarantorDeductionIqd,
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
            ghuramaaContext,
            ghuramaaManual,
            ghuramaaShareInputs,
            setGhuramaaShareInput,
            applyGhuramaaEqualSplit,
            openGhuramaaModal,
            applyGhuramaaDistribution,
        } = useFocGhuramaaActions({
            persist,
            getLatestLedgerStore,
            notify,
            recordFinancialTimelineNote,
            remainingUnified,
            trustBalanceUnified,
            onApplyGhuramaaDistribution,
            canShowGhuramaaDivision,
            ghuramaaCreditors,
            ghuramaaModalOpen,
            setGhuramaaModalOpen,
            setDisburseAmountInput,
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
            if (settlementUxTier === 'hidden') deactivateSettlementPanel();
        }, [settlementUxTier, deactivateSettlementPanel]);

    useEffect(() => {
            if (salarySeizureActive) deactivateSettlementPanel();
        }, [salarySeizureActive, deactivateSettlementPanel]);

    useEffect(() => {
            if (activeDebtorIsDeceased) deactivateSettlementPanel();
        }, [activeDebtorIsDeceased, deactivateSettlementPanel]);

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
                    onShowLedger={onShowLedger}
                    openDebtEditModal={() => {
                        prefetchFocDebtTotalsEditModal();
                        openDebtEditModal();
                    }}
                    debtEditLockReason={debtEditLockReason}
                    showOngoingAlimonyMonthlySection={showOngoingAlimonyMonthlySection}
                    onOpenAlimonyDetail={() => {
                        prefetchFocAlimonyDetailOverlay();
                        setAlimonyDetailOpen(true);
                    }}
                />

            {showExpandedBody && isRepresentingDebtor && embeddedInFinancialHub ? (
                    <FocLazyDebtorAgentFinancialHubPanel
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
                                    setExpenseSheetOpen={(open) => {
                                        if (open) prefetchFocExpenseSheet();
                                        setExpenseSheetOpen(open);
                                    }}
                                    setFeesSheetOpen={(open) => {
                                        if (open) prefetchFocFeesSheet();
                                        setFeesSheetOpen(open);
                                    }}
                                    canShowDisburse={canShowDisburse}
                                    onOpenDisburse={() => {
                                        prefetchFocDisburseModal();
                                        setDisburseModalOpen(true);
                                    }}
                                    retractCollectionRequest={retractCollectionRequest}
                                    unifiedCollectionExecutorApproved={unifiedCollectionExecutorApproved}
                                    showEmployeeCollection={showEmployeeCollectionStandard}
                                    showNonEmployeePhase2={showNonEmployeePhase2Standard}
                                    applyFullPayment={applyFullPayment}
                                    setShowGarnishModal={(open) => {
                                        if (open) prefetchFocGarnishModal();
                                        setShowGarnishModal(open);
                                    }}
                                    undoLastPayment={undoLastPayment}
                                    financialLedger={financialLedger}
                                    onPayment={onPayment}
                                    canEditDebtTotals={!debtEditLockReason}
                                    onOpenDebtEdit={() => {
                                        prefetchFocDebtTotalsEditModal();
                                        openDebtEditModal();
                                    }}
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
                            onOpenGhuramaaModal={() => {
                                prefetchFocGhuramaaModal();
                                openGhuramaaModal();
                            }}
                            evictionReenableCourtOrderedFees={evictionReenableCourtOrderedFees}
                            settlementInProgress={settlementInProgress}
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
                            onPersistSettlementGuarantor={onPersistSettlementGuarantor}
                            settlementGuarantorName={settlementGuarantorName}
                            settlementGuarantorDeductionIqd={settlementGuarantorDeductionIqd}
                        />
                                                ) : null}

                    {disburseModalOpen ? (
                        <FocLazyOverlay
                            lazy={LazyFocDisburseModal}
                            lazyProps={{
                                open: disburseModalOpen,
                                onClose: () => setDisburseModalOpen(false),
                                canShowGhuramaaDivision,
                                trustBalanceUnified,
                                creditorsCount,
                                disburseAmountInput,
                                setDisburseAmountInput,
                                canApplyDisburseAmount,
                                onApplyDisbursement: applyDisbursementAmount,
                                onOpenGhuramaaModal: () => {
                                    setDisburseModalOpen(false);
                                    prefetchFocGhuramaaModal();
                                    openGhuramaaModal();
                                },
                            }}
                        />
                    ) : null}

                    {ghuramaaModalOpen ? (
                        <FocLazyOverlay
                            lazy={LazyFocGhuramaaModal}
                            lazyProps={{
                                open: ghuramaaModalOpen,
                                onClose: () => setGhuramaaModalOpen(false),
                                available: ghuramaaContext.available,
                                eligible: ghuramaaContext.eligible,
                                note: ghuramaaContext.note,
                                shareInputs: ghuramaaShareInputs,
                                onShareInputChange: setGhuramaaShareInput,
                                onEqualSplit: applyGhuramaaEqualSplit,
                                manualSum: ghuramaaManual.sum,
                                validationNote: ghuramaaManual.validationNote,
                                partialWarning: ghuramaaManual.partialWarning,
                                remainingAfter: ghuramaaManual.remainingAfter,
                                isEqualMode: ghuramaaManual.isEqualMode,
                                canConfirm: ghuramaaManual.ok,
                                onConfirm: applyGhuramaaDistribution,
                            }}
                        />
                            ) : null}

                    {debtEditOpen ? (
                    <FocLazyOverlay
                        lazy={LazyDebtTotalsEditModal}
                        lazyProps={{
                            open: debtEditOpen,
                            onClose: () => setDebtEditOpen(false),
                            totalInput: debtEditTotalInput,
                            setTotalInput: setDebtEditTotalInput,
                            remainingInput: debtEditRemainingInput,
                            setRemainingInput: setDebtEditRemainingInput,
                            onSave: applyDebtTotalsEdit,
                            lockReason: debtEditLockReason,
                            showAlimonyAccrualNote: Boolean(isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0),
                        }}
                    />
                    ) : null}

                    {feesSheetOpen ? (
                        <FocLazyOverlay
                            lazy={LazyFocFeesSheet}
                            lazyProps={{
                                open: feesSheetOpen,
                                onClose: () => setFeesSheetOpen(false),
                                sheetClass,
                                lawyerAmountInput,
                                setLawyerAmountInput,
                                lawyerLabelInput,
                                setLawyerLabelInput,
                                canAddLawyerFee,
                                onAddLawyerFee: addLawyerFee,
                                evictionFinanceStrip: evictionFinanceStrip
                                    ? {
                                          lawyerFeeRequestTitle: evictionFinanceStrip.lawyerFeeRequestTitle,
                                          lawyerFeeRequestDisabled: evictionFinanceStrip.lawyerFeeRequestDisabled,
                                          onRequestLawyerFees: evictionFinanceStrip.onRequestLawyerFees,
                                      }
                                    : undefined,
                                isEvictionFundsModule,
                                lawyerFees: store.lawyerFees,
                            }}
                        />
                    ) : null}

                    {expenseSheetOpen ? (
                        <FocLazyOverlay
                            lazy={LazyFocExpenseSheet}
                            lazyProps={{
                                open: expenseSheetOpen,
                                onClose: () => setExpenseSheetOpen(false),
                                sheetClass,
                                expenseAmountInput,
                                setExpenseAmountInput,
                                expenseReasonInput,
                                setExpenseReasonInput,
                                canAddExpense,
                                onAddExpense: addExpense,
                                expenses: store.expenses,
                            }}
                        />
                    ) : null}

                    {showGarnishModal ? (
                        <FocLazyOverlay
                            lazy={LazyFocGarnishModal}
                            lazyProps={{
                                open: showGarnishModal,
                                onClose: closeGarnishModal,
                                garnishMonthlyInput,
                                setGarnishMonthlyInput,
                                garnishMemoInput,
                                setGarnishMemoInput,
                                remainingUnified,
                                canConfirmGarnishment,
                                onConfirm: confirmGarnishment,
                            }}
                        />
                    ) : null}

                    {showOngoingAlimonyMonthlySection && alimonyDetailOpen ? (
                        <FocLazyOverlay
                            lazy={LazyFocAlimonyDetailOverlay}
                            lazyProps={{
                                open: alimonyDetailOpen,
                                onClose: () => setAlimonyDetailOpen(false),
                                breakdown: alimonyBreakdown ?? undefined,
                                wifeMonthlyAlimony: monthly_wife_alimony || monthlyAlimony,
                                childrenMonthlyAlimony: monthly_children_alimony || 0,
                                childrenCount: children_count || 1,
                            }}
                        />
                    ) : null}
        </div>
    );
    }
);
