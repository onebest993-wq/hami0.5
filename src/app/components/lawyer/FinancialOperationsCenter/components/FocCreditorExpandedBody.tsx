import React from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import type { SettlementDuePhase } from '../utils';
import type { UnifiedLedgerStore, FinancialLedgerEntry } from '../types';
import type { SettlementUxTier } from '../settlementUxMatrix';
import { StandardFinancialLedger } from './StandardFinancialLedger';
import { UnifiedLedgerSettlementPanel } from './UnifiedLedgerSettlementPanel';
import { FocEvictionLedgerBody } from './FocEvictionLedgerBody';

export interface FocCreditorExpandedBodyProps {
    embeddedInFinancialHub?: boolean;
    isAlimonyClaim: boolean;
    isEvictionFundsModule: boolean;
    shouldCalculateExecutionFee: boolean;
    executionFee: number;
    executionId: string | undefined;
    totalOwedUnified: number;
    remainingUnified: number;
    baseDossierAmount: number;
    store: UnifiedLedgerStore;
    setExpenseSheetOpen: (v: boolean) => void;
    setFeesSheetOpen: (v: boolean) => void;
    canShowDisburse: boolean;
    onOpenDisburse: () => void;
    retractCollectionRequest: () => void;
    unifiedCollectionExecutorApproved: boolean;
    showEmployeeCollection: boolean;
    showNonEmployeePhase2: boolean;
    applyFullPayment: () => void;
    setShowGarnishModal: (v: boolean) => void;
    undoLastPayment: () => void;
    financialLedger: FinancialLedgerEntry[];
    onPayment: () => void;
    canEditDebtTotals: boolean;
    onOpenDebtEdit: () => void;
    settlementUxTier: SettlementUxTier;
    settlementPanelOpen: boolean;
    onActivateSettlement: () => void;
    onDeactivateSettlement: () => void;
    repaymentInput: string;
    setRepaymentInput: (v: string) => void;
    canApplyRepayment: boolean;
    applyDebtRepayment: () => boolean;
    repaymentExceedsRemaining: boolean;
    ongoingMonthlyAlimony: number;
    ongoingAlimonyDetailLines: string[];
    showOngoingAlimonyMonthly: boolean;
    showSettlementEntry: boolean;
    showSettlementPanel: boolean;
    canShowGhuramaaDivision: boolean;
    trustBalanceUnified: number;
    onOpenGhuramaaModal: () => void;
    evictionReenableCourtOrderedFees?: { grossAmount: number; onEnable: () => void };
    settlementInProgress: boolean;
    onShowSeizureLog?: () => void;
    evictionLawyerFeeWaivedAtIntake?: boolean;
    sumLawyer: number;
    claimType?: string;
    claimTypes?: string[];
    hasPendingUnifiedCollection: boolean;
    hasApprovedUnifiedCollectionDecision: boolean;
    canSubmitEvictionPhase2: boolean;
    submitCollectionRequest: () => void;
    hasPaymentRows: boolean;
    settlementInput: string;
    setSettlementInput: (v: string) => void;
    settlementDueDateInput: string;
    setSettlementDueDateInput: (v: string) => void;
    showSettlementForm: boolean;
    setShowSettlementForm: (v: boolean) => void;
    registerSettlementPlan: () => boolean | Promise<boolean>;
    markPendingSettlementPaid: () => void;
    cancelPendingSettlement: () => void;
    canApplySettlementAny: boolean;
    showSettlementDueActions: boolean;
    pendingSettlementDuePhase: SettlementDuePhase | null;
    pendingSettlementDueYmd: string;
    onNotify: (message: string, type?: 'warning' | 'info' | 'success') => void;
    salarySeizureActive?: boolean;
}

/**
 * جسم البطاقة الموسّع لوكيل الدائن: نفقة / تخلية / دفتر قياسي + لوحة التسوية الموحّدة.
 * استخراج آمن بدون تغيير بصري من FinancialOperationsCenter.
 */
export const FocCreditorExpandedBody: React.FC<FocCreditorExpandedBodyProps> = ({
    embeddedInFinancialHub,
    isAlimonyClaim,
    isEvictionFundsModule,
    shouldCalculateExecutionFee,
    executionFee,
    executionId,
    totalOwedUnified,
    remainingUnified,
    baseDossierAmount,
    store,
    setExpenseSheetOpen,
    setFeesSheetOpen,
    canShowDisburse,
    onOpenDisburse,
    retractCollectionRequest,
    unifiedCollectionExecutorApproved,
    showEmployeeCollection,
    showNonEmployeePhase2,
    applyFullPayment,
    setShowGarnishModal,
    undoLastPayment,
    financialLedger,
    onPayment,
    canEditDebtTotals,
    onOpenDebtEdit,
    settlementUxTier,
    settlementPanelOpen,
    onActivateSettlement,
    onDeactivateSettlement,
    repaymentInput,
    setRepaymentInput,
    canApplyRepayment,
    applyDebtRepayment,
    repaymentExceedsRemaining,
    ongoingMonthlyAlimony,
    ongoingAlimonyDetailLines,
    showOngoingAlimonyMonthly,
    showSettlementEntry,
    showSettlementPanel,
    canShowGhuramaaDivision,
    trustBalanceUnified,
    onOpenGhuramaaModal,
    evictionReenableCourtOrderedFees,
    settlementInProgress,
    onShowSeizureLog,
    evictionLawyerFeeWaivedAtIntake,
    sumLawyer,
    claimType,
    claimTypes,
    hasPendingUnifiedCollection,
    hasApprovedUnifiedCollectionDecision,
    canSubmitEvictionPhase2,
    submitCollectionRequest,
    hasPaymentRows,
    settlementInput,
    setSettlementInput,
    settlementDueDateInput,
    setSettlementDueDateInput,
    showSettlementForm,
    setShowSettlementForm,
    registerSettlementPlan,
    markPendingSettlementPaid,
    cancelPendingSettlement,
    canApplySettlementAny,
    showSettlementDueActions,
    pendingSettlementDuePhase,
    pendingSettlementDueYmd,
    onNotify,
    salarySeizureActive,
}) => {
    const renderUnifiedSettlementPanel = () => (
        <UnifiedLedgerSettlementPanel
            settlementUxTier={settlementUxTier}
            panelOpen={settlementPanelOpen}
            onClosePanel={onDeactivateSettlement}
            store={store}
            remainingUnified={remainingUnified}
            settlementInput={settlementInput}
            setSettlementInput={setSettlementInput}
            settlementDueDateInput={settlementDueDateInput}
            setSettlementDueDateInput={setSettlementDueDateInput}
            showSettlementForm={showSettlementForm}
            setShowSettlementForm={setShowSettlementForm}
            registerSettlementPlan={registerSettlementPlan}
            markPendingSettlementPaid={markPendingSettlementPaid}
            cancelPendingSettlement={cancelPendingSettlement}
            canApplySettlementAny={canApplySettlementAny}
            showSettlementDueActions={showSettlementDueActions}
            pendingSettlementDuePhase={pendingSettlementDuePhase}
            pendingSettlementDueYmd={pendingSettlementDueYmd}
            onNotify={onNotify}
            salarySeizureActive={salarySeizureActive}
        />
    );

    return (
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
                        onOpenDisburse={onOpenDisburse}
                        retractCollectionRequest={retractCollectionRequest}
                        unifiedCollectionExecutorApproved={unifiedCollectionExecutorApproved}
                        showEmployeeCollection={showEmployeeCollection}
                        showNonEmployeePhase2={showNonEmployeePhase2}
                        applyFullPayment={applyFullPayment}
                        setShowGarnishModal={setShowGarnishModal}
                        undoLastPayment={undoLastPayment}
                        financialLedger={financialLedger}
                        onPayment={onPayment}
                        canEditDebtTotals={canEditDebtTotals}
                        onOpenDebtEdit={onOpenDebtEdit}
                        flatChrome={embeddedInFinancialHub}
                        settlementUxTier={settlementUxTier}
                        settlementPanelOpen={settlementPanelOpen}
                        onActivateSettlement={onActivateSettlement}
                        onDeactivateSettlement={onDeactivateSettlement}
                        repaymentInput={repaymentInput}
                        setRepaymentInput={setRepaymentInput}
                        canApplyRepayment={canApplyRepayment}
                        applyDebtRepayment={applyDebtRepayment}
                        repaymentExceedsRemaining={repaymentExceedsRemaining}
                        ongoingMonthlyAlimony={ongoingMonthlyAlimony}
                        ongoingAlimonyDetailLines={ongoingAlimonyDetailLines}
                        showOngoingAlimonyMonthly={showOngoingAlimonyMonthly}
                        showSettlementEntry={showSettlementEntry}
                    />
                    {showSettlementPanel ? renderUnifiedSettlementPanel() : null}
                </div>
            ) : isEvictionFundsModule ? (
                <FocEvictionLedgerBody
                    embeddedInFinancialHub={embeddedInFinancialHub}
                    evictionReenableCourtOrderedFees={evictionReenableCourtOrderedFees}
                    remainingUnified={remainingUnified}
                    totalOwedUnified={totalOwedUnified}
                    store={store}
                    showSettlementEntry={showSettlementEntry}
                    settlementUxTier={settlementUxTier}
                    settlementInProgress={settlementInProgress}
                    onActivateSettlement={onActivateSettlement}
                    onDeactivateSettlement={onDeactivateSettlement}
                    onShowSeizureLog={onShowSeizureLog}
                    setExpenseSheetOpen={setExpenseSheetOpen}
                    setFeesSheetOpen={setFeesSheetOpen}
                    evictionLawyerFeeWaivedAtIntake={evictionLawyerFeeWaivedAtIntake}
                    sumLawyer={sumLawyer}
                    claimType={claimType}
                    claimTypes={claimTypes}
                    hasPendingUnifiedCollection={hasPendingUnifiedCollection}
                    hasApprovedUnifiedCollectionDecision={hasApprovedUnifiedCollectionDecision}
                    canSubmitEvictionPhase2={canSubmitEvictionPhase2}
                    submitCollectionRequest={submitCollectionRequest}
                    retractCollectionRequest={retractCollectionRequest}
                    showSettlementPanel={showSettlementPanel}
                    renderSettlementPanel={renderUnifiedSettlementPanel}
                    hasPaymentRows={hasPaymentRows}
                    undoLastPayment={undoLastPayment}
                />
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
                        onOpenDisburse={onOpenDisburse}
                        retractCollectionRequest={retractCollectionRequest}
                        unifiedCollectionExecutorApproved={unifiedCollectionExecutorApproved}
                        showEmployeeCollection={showEmployeeCollection}
                        showNonEmployeePhase2={showNonEmployeePhase2}
                        applyFullPayment={applyFullPayment}
                        setShowGarnishModal={setShowGarnishModal}
                        undoLastPayment={undoLastPayment}
                        financialLedger={financialLedger}
                        onPayment={onPayment}
                        canEditDebtTotals={canEditDebtTotals}
                        onOpenDebtEdit={onOpenDebtEdit}
                        flatChrome={embeddedInFinancialHub}
                        settlementUxTier={settlementUxTier}
                        settlementPanelOpen={settlementPanelOpen}
                        onActivateSettlement={onActivateSettlement}
                        onDeactivateSettlement={onDeactivateSettlement}
                        repaymentInput={repaymentInput}
                        setRepaymentInput={setRepaymentInput}
                        canApplyRepayment={canApplyRepayment}
                        applyDebtRepayment={applyDebtRepayment}
                        repaymentExceedsRemaining={repaymentExceedsRemaining}
                        showSettlementEntry={showSettlementEntry}
                    />
                    {showSettlementPanel ? renderUnifiedSettlementPanel() : null}
                    {canShowGhuramaaDivision && trustBalanceUnified > 0 ? (
                        <div className="px-2 pb-2" dir="rtl">
                            <button
                                type="button"
                                onClick={onOpenGhuramaaModal}
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
    );
};
