import React from 'react';
import { DollarSign } from '@/app/components/ui/icons/DollarSign';
import { History } from '@/app/components/ui/icons/History';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { FinancialLedgerAmountRow } from './FinancialLedgerAmountRow';

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

type ClaimRow = { claimType: string; label: string; amount: number };

export function FinancialLedgerClaimBreakdownBlock({
    displayedClaimBreakdown,
    displayedClaimTotal,
    principalDebtAmount,
    parsedLawyerFees,
    totalExecutionExpenses,
    isEvictionExecutionModule,
    evictionCaseExpenses,
    judicialCustodianSalariesExpenseIqd,
    shouldCalculateExecutionFee,
    calculatedExecutionFee,
    evictionLawyerFeeRequested,
}: {
    displayedClaimBreakdown: ClaimRow[];
    displayedClaimTotal: number;
    principalDebtAmount: number;
    parsedLawyerFees: number;
    totalExecutionExpenses: number;
    isEvictionExecutionModule: boolean;
    evictionCaseExpenses: EvictionCaseExpenseRow[];
    judicialCustodianSalariesExpenseIqd: number;
    shouldCalculateExecutionFee: boolean;
    calculatedExecutionFee: number;
    evictionLawyerFeeRequested?: boolean;
}) {
    return (
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
                <FinancialLedgerAmountRow
                    tone="amber"
                    label="أصل الدين / المحكوم به"
                    amount={principalDebtAmount}
                />
            ) : null}

            {parsedLawyerFees > 0 && (
                <FinancialLedgerAmountRow
                    tone="emerald"
                    label="أتعاب المحاماة المحكوم بها"
                    amount={parsedLawyerFees}
                    hint="المصدر: بيانات الإضبارة / الحكم (يتحمّله المدين)"
                />
            )}

            {totalExecutionExpenses > 0 && (
                <FinancialLedgerAmountRow
                    tone="violet"
                    label="الرسوم والمصاريف التنفيذية"
                    amount={totalExecutionExpenses}
                    hint="المصدر: سجل التنفيذ والمديرية"
                />
            )}

            {isEvictionExecutionModule &&
                evictionCaseExpenses.map((ex) => (
                    <FinancialLedgerAmountRow
                        key={ex.id}
                        tone="cyan"
                        label="مصاريف إضبارة تخلية"
                        amount={ex.amount}
                        hint={`${ex.note || 'بدون بيان'}${ex.date ? ` · ${ex.date}` : ''}`}
                    />
                ))}

            {isEvictionExecutionModule && judicialCustodianSalariesExpenseIqd > 0 && (
                <FinancialLedgerAmountRow
                    tone="amber"
                    label="أجور الحارس القاضي"
                    amount={judicialCustodianSalariesExpenseIqd}
                    hint="مبلغ مُستخرج من حقل الراتب في بطاقة الحارس — يُدْرَج ضمن مصاريف الإضبارة"
                />
            )}

            {shouldCalculateExecutionFee &&
                calculatedExecutionFee > 0 &&
                (!isEvictionExecutionModule || evictionLawyerFeeRequested) && (
                    <FinancialLedgerAmountRow
                        tone="orange"
                        label="رسم التحصيل (٣٪)"
                        amount={calculatedExecutionFee}
                        hint="وفق المدة الإخبارية"
                    />
                )}
        </div>
    );
}

export function FinancialLedgerUnifiedArchiveBlock({
    unifiedSnap,
    archiveLawyerFees,
    archiveExpenses,
    formatUnifiedLedgerDate,
}: {
    unifiedSnap: UnifiedFundsLedgerSnapshot;
    archiveLawyerFees: UnifiedLawyerFeeRow[];
    archiveExpenses: UnifiedExpenseRow[];
    formatUnifiedLedgerDate: (isoOrYmd: string) => string;
}) {
    return (
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
    );
}

export function FinancialLedgerMovementsBlock({
    financialLedger,
}: {
    financialLedger: FinancialLedgerEntry[];
}) {
    return (
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
    );
}
