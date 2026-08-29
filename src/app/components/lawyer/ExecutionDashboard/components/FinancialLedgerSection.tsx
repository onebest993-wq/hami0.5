import React from 'react';
import { FileText } from '@/app/components/ui/icons/FileText';
import { X } from '@/app/components/ui/icons/X';
import type { ExecutionFile } from '@/app/types/execution';
import { buildExecutionClaimBreakdown } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_TOUCH_TARGET,
    execModalKeyboardPadStyle,
} from '../executionModalMobileShell';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import {
    FinancialLedgerClaimBreakdownBlock,
    FinancialLedgerMovementsBlock,
    FinancialLedgerUnifiedArchiveBlock,
} from './FinancialLedgerSectionBlocks';

type FinancialLedgerEntry = {
    id: string;
    amount: number;
    description: string;
};

type EvictionCaseExpenseRow = {
    id: string;
    note?: string;
    date?: string;
    amount: number;
};

type UnifiedLawyerFeeRow = {
    id: string;
    label: string;
    at: string;
    amount: number;
};

type UnifiedExpenseRow = {
    id: string;
    reason: string;
    at: string;
    amount: number;
};

type UnifiedPaymentRow = {
    id: string;
    kind: string;
    balanceAfter: number;
    at: string;
    amount: number;
};

type UnifiedFundsLedgerSnapshot = {
    lawyerFees: UnifiedLawyerFeeRow[];
    expenses: UnifiedExpenseRow[];
    payments: UnifiedPaymentRow[];
};

export interface FinancialLedgerSectionProps {
    executionData: ExecutionFile | null;
    executionId: string;
    parsedLawyerFees: number;
    totalExecutionExpenses: number;
    isEvictionExecutionModule: boolean;
    evictionCaseExpensesTotalForFinancial: number;
    principalDebtAmount: number;
    evictionCaseExpenses: EvictionCaseExpenseRow[];
    judicialCustodianSalariesExpenseIqd: number;
    shouldCalculateExecutionFee: boolean;
    calculatedExecutionFee: number;
    hasFinancialLedger: boolean;
    financialLedger: FinancialLedgerEntry[];
    onClose: () => void;
    readUnifiedFundsLedger: (executionId: string) => UnifiedFundsLedgerSnapshot | null;
    filterUnifiedLawyerFeesHideFileDuplicate: (
        rows: UnifiedLawyerFeeRow[],
        parsedLawyerFees: number
    ) => UnifiedLawyerFeeRow[];
    filterUnifiedExpensesHideFileDuplicate: (
        rows: UnifiedExpenseRow[],
        totalExecutionExpenses: number,
        evictionCaseExpensesTotalForFinancial: number
    ) => UnifiedExpenseRow[];
    formatUnifiedLedgerDate: (isoOrYmd: string) => string;
}

export const FinancialLedgerSection: React.FC<FinancialLedgerSectionProps> = ({
    executionData,
    executionId,
    parsedLawyerFees,
    totalExecutionExpenses,
    isEvictionExecutionModule,
    evictionCaseExpensesTotalForFinancial,
    principalDebtAmount,
    evictionCaseExpenses,
    judicialCustodianSalariesExpenseIqd,
    shouldCalculateExecutionFee,
    calculatedExecutionFee,
    hasFinancialLedger,
    financialLedger,
    onClose,
    readUnifiedFundsLedger,
    filterUnifiedLawyerFeesHideFileDuplicate,
    filterUnifiedExpensesHideFileDuplicate,
    formatUnifiedLedgerDate,
}) => {
    const ledgerExecutionId = executionData?.id || executionId;
    const unifiedSnap = readUnifiedFundsLedger(ledgerExecutionId);
    const archiveLawyerFees = unifiedSnap
        ? filterUnifiedLawyerFeesHideFileDuplicate(unifiedSnap.lawyerFees, parsedLawyerFees)
        : [];
    const archiveExpenses = unifiedSnap
        ? filterUnifiedExpensesHideFileDuplicate(
              unifiedSnap.expenses,
              totalExecutionExpenses,
              isEvictionExecutionModule ? evictionCaseExpensesTotalForFinancial : 0
          )
        : [];
    const hasUnifiedArchive =
        unifiedSnap &&
        (archiveLawyerFees.length > 0 || archiveExpenses.length > 0 || unifiedSnap.payments.length > 0);

    const claimBreakdown = buildExecutionClaimBreakdown(
        executionData as Record<string, unknown> | null | undefined
    );
    const claimBreakdownTotal = claimBreakdown.reduce((s, r) => s + r.amount, 0);
    const useScopedClaimBreakdown =
        principalDebtAmount > 0 &&
        claimBreakdownTotal > 0 &&
        Math.abs(claimBreakdownTotal - principalDebtAmount) > 0.01;
    const displayedClaimBreakdown = useScopedClaimBreakdown
        ? [
              {
                  claimType: 'liability_scope',
                  label: 'حصة الذمة النشطة',
                  amount: principalDebtAmount,
              },
          ]
        : claimBreakdown;
    const displayedClaimTotal = displayedClaimBreakdown.reduce((s, r) => s + r.amount, 0);
    const keyboardInset = useMobileKeyboardInset(true, true);

    return (
        <div
            className={`fixed inset-0 z-[260] flex items-center justify-center bg-black/70 p-3 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={execModalKeyboardPadStyle(keyboardInset)}
            onClick={onClose}
            role="presentation"
        >
            <div
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E6C673]/25 bg-[#0A0F1C] shadow-md"
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white ${EXEC_MODAL_TOUCH_TARGET}`}
                        aria-label="إغلاق"
                    >
                        <X size={20} />
                    </button>
                    <h3 className="flex items-center gap-2 text-right text-lg font-bold text-[#E6C673]">
                        <FileText size={20} className="shrink-0 text-[#E6C673]/90" />
                        السجل المالي العام
                    </h3>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
                    <FinancialLedgerClaimBreakdownBlock
                        displayedClaimBreakdown={displayedClaimBreakdown}
                        displayedClaimTotal={displayedClaimTotal}
                        principalDebtAmount={principalDebtAmount}
                        parsedLawyerFees={parsedLawyerFees}
                        totalExecutionExpenses={totalExecutionExpenses}
                        isEvictionExecutionModule={isEvictionExecutionModule}
                        evictionCaseExpenses={evictionCaseExpenses}
                        judicialCustodianSalariesExpenseIqd={judicialCustodianSalariesExpenseIqd}
                        shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                        calculatedExecutionFee={calculatedExecutionFee}
                        evictionLawyerFeeRequested={executionData?.eviction_lawyer_fee_requested}
                    />

                    {hasUnifiedArchive && unifiedSnap ? (
                        <FinancialLedgerUnifiedArchiveBlock
                            unifiedSnap={unifiedSnap}
                            archiveLawyerFees={archiveLawyerFees}
                            archiveExpenses={archiveExpenses}
                            formatUnifiedLedgerDate={formatUnifiedLedgerDate}
                        />
                    ) : null}

                    {hasFinancialLedger ? (
                        <FinancialLedgerMovementsBlock financialLedger={financialLedger} />
                    ) : null}

                    {!claimBreakdown.length &&
                        !principalDebtAmount &&
                        !parsedLawyerFees &&
                        !totalExecutionExpenses &&
                        !(isEvictionExecutionModule && evictionCaseExpenses.length) &&
                        !hasUnifiedArchive &&
                        !hasFinancialLedger && (
                            <p className="py-6 text-center text-sm text-slate-500">
                                لا توجد مبالغ مسجّلة لعرضها في السجل.
                            </p>
                        )}
                </div>
            </div>
        </div>
    );
};
