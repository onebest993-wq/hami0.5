// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, FileText, History, Wallet, X } from 'lucide-react';
import type { ExecutionFile } from '@/app/types/execution';
import { buildExecutionClaimBreakdown } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';

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

    return (
        <div
            className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
            onClick={onClose}
            role="presentation"
        >
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E6C673]/25 bg-[#0A1122]/88 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
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
                    <div className="space-y-2">
                        <h4 className="mb-2 flex items-center justify-end gap-2 text-xs font-semibold text-slate-200">
                            <DollarSign size={14} className="text-[#E6C673]/90" />
                            مكوّنات الدين (بيانات الإضبارة)
                        </h4>

                        {displayedClaimBreakdown.length > 0 ? (
                            <div className="space-y-2 rounded-lg border border-amber-500/25 bg-amber-950/15 p-3">
                                <p className="text-[10px] font-semibold text-amber-200/90 text-right">
                                    تفصيل المطالبات (مصدر المبالغ)
                                </p>
                                {displayedClaimBreakdown.map((row) => (
                                    <div
                                        key={row.claimType}
                                        className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/25 px-2.5 py-2"
                                    >
                                        <span className="text-right text-sm text-slate-300">{row.label}</span>
                                        <span className="shrink-0 text-sm font-bold tabular-nums text-amber-200/95">
                                            {row.amount.toLocaleString('ar-IQ')}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex flex-row-reverse items-center justify-between gap-2 border-t border-amber-500/20 pt-2">
                                    <span className="text-sm font-bold text-amber-200">مجموع المطالبات</span>
                                    <span className="shrink-0 text-base font-black tabular-nums text-amber-100">
                                        {displayedClaimTotal.toLocaleString('ar-IQ')}
                                    </span>
                                </div>
                            </div>
                        ) : principalDebtAmount > 0 ? (
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-slate-900/40 p-3 flex-row-reverse">
                                <span className="text-right text-sm text-slate-300">أصل الدين / المحكوم به</span>
                                <span className="shrink-0 text-base font-bold tabular-nums text-amber-200/95">
                                    {principalDebtAmount.toLocaleString('ar-IQ')}
                                </span>
                            </div>
                        ) : null}

                        {parsedLawyerFees > 0 && (
                            <div className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/30 p-3">
                                <div className="min-w-0 flex-1 text-right">
                                    <span className="block text-sm font-medium text-slate-200">
                                        أتعاب المحاماة المحكوم بها
                                    </span>
                                    <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                                        المصدر: بيانات الإضبارة / الحكم (يتحمّله المدين)
                                    </span>
                                </div>
                                <span className="shrink-0 text-base font-bold tabular-nums text-emerald-200/90">
                                    {parsedLawyerFees.toLocaleString('ar-IQ')}
                                </span>
                            </div>
                        )}

                        {totalExecutionExpenses > 0 && (
                            <div className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-violet-500/20 bg-violet-950/25 p-3">
                                <div className="min-w-0 flex-1 text-right">
                                    <span className="block text-sm font-medium text-slate-200">
                                        الرسوم والمصاريف التنفيذية
                                    </span>
                                    <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                                        المصدر: سجل التنفيذ والمديرية
                                    </span>
                                </div>
                                <span className="shrink-0 text-base font-bold tabular-nums text-violet-200/90">
                                    {totalExecutionExpenses.toLocaleString('ar-IQ')}
                                </span>
                            </div>
                        )}

                        {isEvictionExecutionModule &&
                            evictionCaseExpenses.map((ex) => (
                                <div
                                    key={ex.id}
                                    className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-3"
                                >
                                    <div className="min-w-0 flex-1 text-right">
                                        <span className="block text-sm font-medium text-slate-200">
                                            مصاريف إضبارة تخلية
                                        </span>
                                        <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                                            {ex.note || 'بدون بيان'}
                                            {ex.date ? ` · ${ex.date}` : ''}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-base font-bold tabular-nums text-cyan-200/90">
                                        {ex.amount.toLocaleString('ar-IQ')}
                                    </span>
                                </div>
                            ))}

                        {isEvictionExecutionModule && judicialCustodianSalariesExpenseIqd > 0 && (
                            <div className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-950/15 p-3">
                                <div className="min-w-0 flex-1 text-right">
                                    <span className="block text-sm font-medium text-slate-200">أجور الحارس القاضي</span>
                                    <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                                        مبلغ مُستخرج من حقل الراتب في بطاقة الحارس — يُدْرَج ضمن مصاريف الإضبارة
                                    </span>
                                </div>
                                <span className="shrink-0 text-base font-bold tabular-nums text-amber-200/90">
                                    {judicialCustodianSalariesExpenseIqd.toLocaleString('ar-IQ')}
                                </span>
                            </div>
                        )}

                        {shouldCalculateExecutionFee &&
                            calculatedExecutionFee > 0 &&
                            (!isEvictionExecutionModule || executionData?.eviction_lawyer_fee_requested) && (
                                <div className="space-y-2 rounded-lg border border-orange-500/30 bg-orange-950/25 p-3">
                                    <div className="flex flex-row-reverse items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1 text-right">
                                            <span className="block text-sm font-medium text-orange-200">
                                                رسم التحصيل (٣٪)
                                            </span>
                                            <span className="mt-0.5 block text-[10px] text-orange-200/70">
                                                وفق المدة الإخبارية
                                            </span>
                                        </div>
                                        <span className="shrink-0 text-base font-bold tabular-nums text-orange-300">
                                            +{calculatedExecutionFee.toLocaleString('ar-IQ')}
                                        </span>
                                    </div>
                                </div>
                            )}
                    </div>

                    {hasUnifiedArchive && unifiedSnap && (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                            <h4 className="mb-1 flex items-center justify-end gap-2 text-xs font-semibold text-slate-200">
                                <Wallet size={14} className="text-[#E6C673]/90" />
                                أرشيف الوعاء الموحّد (إدارة الأموال)
                            </h4>
                            <p className="mb-2 text-[10px] leading-relaxed text-slate-500 text-right">
                                بنود أضافها المحامي في الوعاء (باستثناء ما يطابق مكوّنات الإضبارة المعروضة أعلاه).
                            </p>

                            {archiveLawyerFees.map((row) => (
                                <div
                                    key={row.id}
                                    className="flex flex-row-reverse items-start justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3"
                                >
                                    <div className="min-w-0 flex-1 text-right">
                                        <span className="block text-[10px] font-medium text-emerald-200/80">
                                            أتعاب — بند في الوعاء
                                        </span>
                                        <span className="mt-0.5 block text-sm text-slate-200">{row.label}</span>
                                        <span className="mt-1 block text-[10px] text-slate-500">
                                            تاريخ التسجيل: {formatUnifiedLedgerDate(row.at)}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-200/95">
                                        {row.amount.toLocaleString('ar-IQ')}
                                    </span>
                                </div>
                            ))}

                            {archiveExpenses.map((row) => (
                                <div
                                    key={row.id}
                                    className="flex flex-row-reverse items-start justify-between gap-2 rounded-lg border border-sky-500/20 bg-sky-950/20 p-3"
                                >
                                    <div className="min-w-0 flex-1 text-right">
                                        <span className="block text-[10px] font-medium text-sky-200/80">
                                            مصاريف إضبارة
                                        </span>
                                        <span className="mt-0.5 block text-sm text-slate-200">{row.reason}</span>
                                        <span className="mt-1 block text-[10px] text-slate-500">
                                            تاريخ التسجيل: {formatUnifiedLedgerDate(row.at)}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold tabular-nums text-sky-200/95">
                                        {row.amount.toLocaleString('ar-IQ')}
                                    </span>
                                </div>
                            ))}

                            {unifiedSnap.payments.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-semibold text-slate-400 text-right">
                                        دفعات مُسجَّلة في الوعاء
                                    </p>
                                    {unifiedSnap.payments.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-950/15 p-2.5"
                                        >
                                            <div className="min-w-0 flex-1 text-right text-[11px] text-slate-300">
                                                {p.kind === 'full' ? 'تسديد كامل' : 'تسوية'} — متبقي{' '}
                                                {p.balanceAfter.toLocaleString('ar-IQ')} د.ع
                                                <span className="mt-0.5 block text-[10px] text-slate-500">
                                                    {formatUnifiedLedgerDate(p.at)}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-sm font-bold tabular-nums text-amber-200/90">
                                                −{p.amount.toLocaleString('ar-IQ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {hasFinancialLedger && (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                            <h4 className="mb-1 flex items-center justify-end gap-2 text-xs font-semibold text-slate-200">
                                <History size={14} className="text-[#E6C673]/90" />
                                حركات اللوحة العامة
                            </h4>
                            <ul className="space-y-1.5">
                                {financialLedger.map((e) => (
                                    <li
                                        key={e.id}
                                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400 text-right"
                                    >
                                        <span className="text-slate-200">{e.description}</span>
                                        <span className="mx-1 text-slate-500">—</span>
                                        <span className="font-mono tabular-nums text-[#E6C673]/90">
                                            {e.amount.toLocaleString('ar-IQ')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

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
            </motion.div>
        </div>
    );
};
