import React from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    applySalaryMonthlyDeduction,
    pickPrimarySalarySeizureForDeduction,
    readMonthlyDeductionFromAsset,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureLedgerSync';

type SalarySeizureFinancialCenterDeductionButtonProps = {
    executionId: string;
    executionData: ExecutionFile | null | undefined;
    salarySeizureRegistryAssets: Array<Record<string, unknown>>;
    remainingBalanceIqd: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    getLocalTodayYmd?: () => string;
    pushTimelineEvent?: (event: unknown) => void;
    nextTimelineId?: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

export const SalarySeizureFinancialCenterDeductionButton: React.FC<
    SalarySeizureFinancialCenterDeductionButtonProps
> = ({
    executionId,
    executionData,
    salarySeizureRegistryAssets,
    remainingBalanceIqd,
    persistExecutionMerge,
    getLocalTodayYmd,
    pushTimelineEvent,
    nextTimelineId,
    showToast,
}) => {
    const asset = React.useMemo(
        () => pickPrimarySalarySeizureForDeduction(salarySeizureRegistryAssets),
        [salarySeizureRegistryAssets]
    );

    if (!asset) return null;

    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : null;
    const decisionRowId = String(det?.decisionRowId || asset.id || '').trim();
    const deductionIqd = readMonthlyDeductionFromAsset(asset);
    const canDeduct = deductionIqd > 0 && remainingBalanceIqd > 0 && Boolean(decisionRowId);

    return (
        <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-3" dir="rtl">
            <p className="text-[10px] font-bold text-emerald-100 text-right">خصم الراتب المحجوز</p>
            <p className="mt-1 text-[9px] text-slate-400 text-right">
                المتبقي:{' '}
                <span className="font-mono text-emerald-200">
                    {remainingBalanceIqd.toLocaleString('ar-IQ')} د.ع
                </span>
                {deductionIqd > 0 ? (
                    <>
                        {' '}
                        — الخصم الشهري:{' '}
                        <span className="font-mono text-white">{deductionIqd.toLocaleString('ar-IQ')} د.ع</span>
                    </>
                ) : null}
            </p>
            <button
                type="button"
                disabled={!canDeduct}
                onClick={() => {
                    if (deductionIqd <= 0) {
                        showToast('حدّد مبلغ الاستقطاع الشهري في سجل الحجز أولاً.', 'warning');
                        return;
                    }
                    if (deductionIqd > remainingBalanceIqd) {
                        showToast(
                            `المبلغ يتجاوز المتبقي (${remainingBalanceIqd.toLocaleString('ar-IQ')} د.ع).`,
                            'warning'
                        );
                        return;
                    }
                    const ok = applySalaryMonthlyDeduction({
                        executionId,
                        executionData,
                        decisionRowId,
                        amountIqd: deductionIqd,
                        persistExecutionMerge,
                        getLocalTodayYmd,
                    });
                    if (!ok) {
                        showToast('تعذر مزامنة الخصم مع المركز المالي.', 'error');
                        return;
                    }
                    const ymd = getLocalTodayYmd?.() ?? new Date().toISOString().slice(0, 10);
                    if (pushTimelineEvent && nextTimelineId) {
                        pushTimelineEvent({
                            id: nextTimelineId(),
                            date: ymd,
                            timestamp: new Date().toISOString(),
                            title: '💼 تم الخصم من الراتب',
                            description: `خصم ${deductionIqd.toLocaleString('ar-IQ')} د.ع — يُخصم من المتبقي في المركز المالي.`,
                            type: 'coercive',
                            source: 'حجز الراتب',
                            metadata: {
                                decisionRowId,
                                timelineThreadKey: `salary_deduction:${decisionRowId}`,
                            },
                        });
                    }
                    showToast(
                        `تم تسجيل خصم ${deductionIqd.toLocaleString('ar-IQ')} د.ع — تم تحديث المتبقي.`,
                        'success'
                    );
                }}
                className="mt-2 w-full rounded-xl border border-emerald-500/40 bg-emerald-600/25 py-2.5 text-[11px] font-black text-emerald-50 hover:bg-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
                تم الخصم من الراتب
            </button>
            {deductionIqd <= 0 ? (
                <p className="mt-1.5 text-[9px] text-amber-200/85 text-right">
                    عدّل مبلغ الاستقطاع من «سجل الحجز — الراتب» قبل التسجيل هنا.
                </p>
            ) : null}
        </div>
    );
};
