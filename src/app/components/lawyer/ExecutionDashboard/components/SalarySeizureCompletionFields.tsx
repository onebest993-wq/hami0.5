import React from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { formatNumberInput } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import {
    parseSalaryIqdInput,
    resolveSuggestedSalaryDeductionBreakdown,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureLedgerSync';

export type SalarySeizureDraft = {
    employerName: string;
    salaryAmount: string;
    monthlyDeduction: string;
};

type SalarySeizureCompletionFieldsProps = {
    executionData: ExecutionFile | null;
    draft: SalarySeizureDraft;
    onDraftChange: (next: SalarySeizureDraft) => void;
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee?: boolean;
    isAlimonyClaim?: boolean;
    claimType?: string;
    onSaveDetails: (details: {
        employerName: string;
        salaryAmount: string;
        monthlyDeductionIqd: number;
    }) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

export const SalarySeizureCompletionFields: React.FC<SalarySeizureCompletionFieldsProps> = ({
    executionData,
    draft,
    onDraftChange,
    activeDebtorIsDeceased,
    activeDebtorIsEmployee = false,
    isAlimonyClaim = false,
    claimType,
    onSaveDetails,
    showToast,
}) => {
    const salaryIqd = parseSalaryIqdInput(draft.salaryAmount);
    const breakdown = React.useMemo(
        () =>
            resolveSuggestedSalaryDeductionBreakdown({
                executionData,
                claimType,
                salaryIqd,
                activeDebtorIsEmployee,
            }),
        [activeDebtorIsEmployee, claimType, executionData, salaryIqd]
    );

    React.useEffect(() => {
        if (draft.monthlyDeduction.trim()) return;
        if (breakdown.totalIqd <= 0) return;
        onDraftChange({
            ...draft,
            monthlyDeduction: formatNumberInput(String(breakdown.totalIqd)),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- يُعبَّأ مرة عند توفر الاقتراح فقط
    }, [breakdown.totalIqd, isAlimonyClaim, salaryIqd]);

    return (
        <div className="space-y-2">
            <input
                type="text"
                value={draft.employerName}
                onChange={(e) => onDraftChange({ ...draft, employerName: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                placeholder={activeDebtorIsDeceased ? 'جهة صرف الحوافز/المخصصات' : 'جهة العمل'}
            />
            <input
                type="text"
                inputMode="numeric"
                value={draft.salaryAmount}
                onChange={(e) =>
                    onDraftChange({
                        ...draft,
                        salaryAmount: formatNumberInput(e.target.value),
                    })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-mono text-slate-100 text-right"
                dir="ltr"
                placeholder="مقدار الراتب (اختياري)"
            />
            <div>
                <input
                    type="text"
                    inputMode="numeric"
                    value={draft.monthlyDeduction}
                    onChange={(e) =>
                        onDraftChange({
                            ...draft,
                            monthlyDeduction: formatNumberInput(e.target.value),
                        })
                    }
                    className="w-full rounded-xl border border-violet-500/30 bg-violet-950/25 px-3 py-2 text-[12px] font-mono text-violet-50 text-right"
                    dir="ltr"
                    placeholder="مقدار الاستقطاع الشهري (اختياري — يُعدَّل لاحقاً من سجل الحجز)"
                />
                {isAlimonyClaim && breakdown.totalIqd > 0 ? (
                    <p className="mt-1 text-[9px] leading-relaxed text-violet-200/85 text-right">
                        نفقة مستمرة: {breakdown.ongoingAlimonyIqd.toLocaleString('ar-IQ')} + خُمس المتراكم:{' '}
                        {breakdown.accumulatedFifthIqd.toLocaleString('ar-IQ')} د.ع
                    </p>
                ) : activeDebtorIsEmployee && breakdown.accumulatedFifthIqd > 0 ? (
                    <p className="mt-1 text-[9px] text-slate-400 text-right">
                        اقتراح الخُمس: {breakdown.accumulatedFifthIqd.toLocaleString('ar-IQ')} د.ع
                    </p>
                ) : (
                    <p className="mt-1 text-[9px] text-slate-500 text-right">
                        يُسجَّل الخصم الشهري لاحقاً من المركز المالي بعد ضبط المبلغ في سجل الحجز.
                    </p>
                )}
            </div>
            <button
                type="button"
                disabled={!String(draft.employerName || '').trim()}
                onClick={() => {
                    if (!String(draft.employerName || '').trim()) {
                        showToast('أدخل جهة العمل/الجهة الصارفة.', 'warning');
                        return;
                    }
                    onSaveDetails({
                        employerName: String(draft.employerName || '').trim(),
                        salaryAmount: String(draft.salaryAmount || '').trim(),
                        monthlyDeductionIqd: parseSalaryIqdInput(draft.monthlyDeduction),
                    });
                }}
                className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
            >
                حفظ التفاصيل
            </button>
        </div>
    );
};
