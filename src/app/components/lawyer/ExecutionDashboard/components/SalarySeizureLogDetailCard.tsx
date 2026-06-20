// @ts-nocheck
import React from 'react';
import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import { formatNumberInput } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import {
    parseSalaryIqdInput,
    readMonthlyDeductionFromAsset,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureLedgerSync';
import {
    formatSalaryAmountDisplay,
    resolveSalarySeizureSubject,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';

export type SalarySeizureDetailsPatch = {
    salaryAmount: string;
    monthlyDeductionIqd: number;
    employerName?: string;
};

type SalarySeizureLogDetailCardProps = {
    asset: SeizedAsset;
    executionData: ExecutionFile | null | undefined;
    executionId?: string;
    titleLabel: string;
    locked: boolean;
    releasedLocked: boolean;
    isPending: boolean;
    onSaveDetails: (assetId: string, patch: SalarySeizureDetailsPatch) => void;
    onRelease: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

export const SalarySeizureLogDetailCard: React.FC<SalarySeizureLogDetailCardProps> = ({
    asset,
    executionData,
    executionId,
    titleLabel,
    locked,
    releasedLocked,
    isPending,
    onSaveDetails,
    onRelease,
    showToast,
}) => {
    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : null;

    const [salaryAmount, setSalaryAmount] = React.useState(() =>
        formatNumberInput(String(det?.salaryAmount || '').trim())
    );
    const [monthlyDeduction, setMonthlyDeduction] = React.useState(() => {
        const stored = readMonthlyDeductionFromAsset(asset as Record<string, unknown>);
        return stored > 0 ? formatNumberInput(String(stored)) : '';
    });
    const [employerName, setEmployerName] = React.useState(() =>
        String(det?.employerName || '').trim()
    );

    React.useEffect(() => {
        const nextDet =
            typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
                ? (asset.details as Record<string, unknown>)
                : null;
        setSalaryAmount(formatNumberInput(String(nextDet?.salaryAmount || '').trim()));
        const stored = readMonthlyDeductionFromAsset(asset as Record<string, unknown>);
        setMonthlyDeduction(stored > 0 ? formatNumberInput(String(stored)) : '');
        setEmployerName(String(nextDet?.employerName || '').trim());
    }, [asset]);

    const statusLabel = isPending
        ? 'قيد البت لدى المنفذ'
        : asset.status === 'seized'
          ? 'تم الحجز'
          : asset.status === 'released'
            ? 'فُك الحجز'
            : String(asset.status || '—');

    const canEdit = !locked && !releasedLocked && !isPending && String(asset.status) === 'seized';
    const subject = React.useMemo(
        () =>
            resolveSalarySeizureSubject(
                asset as Record<string, unknown>,
                executionData,
                executionId
            ),
        [asset, executionData, executionId]
    );
    const salaryDisplay = formatSalaryAmountDisplay(salaryAmount);
    const deductionDisplay = formatSalaryAmountDisplay(monthlyDeduction);

    const handleSave = () => {
        const salaryIqd = parseSalaryIqdInput(salaryAmount);
        const deductionIqd = parseSalaryIqdInput(monthlyDeduction);
        const workplace = employerName.trim();
        if (salaryIqd <= 0 && deductionIqd <= 0 && !workplace) {
            showToast('أدخل مكان العمل أو مقدار الراتب أو الاستقطاع (اختياري — حقل واحد على الأقل للحفظ).', 'warning');
            return;
        }
        onSaveDetails(String(asset.id), {
            salaryAmount: salaryAmount.trim(),
            monthlyDeductionIqd: deductionIqd > 0 ? Math.trunc(deductionIqd) : 0,
            employerName: workplace,
        });
        showToast('تم حفظ بيانات سجل الراتب.', 'success');
    };

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl ${
                locked
                    ? 'border-slate-600/40 bg-slate-900/55 opacity-90'
                    : isPending
                      ? 'border-amber-500/30 bg-amber-950/25'
                      : 'border-slate-700/40 bg-slate-800/55'
            }`}
        >
            <div className="mb-2 flex flex-col gap-2 sm:flex-row-reverse sm:items-start sm:justify-between">
                <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] ${
                        isPending ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'
                    }`}
                >
                    {statusLabel}
                </span>
                <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-[11px] font-bold text-slate-50">{titleLabel}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                        {subject.roleLabel}
                        {subject.personName && subject.personName !== '—'
                            ? ` — ${subject.personName}`
                            : ''}
                    </p>
                </div>
            </div>

            {canEdit ? (
                <div className="space-y-2 border-t border-white/10 pt-3">
                    <p className="text-[9px] leading-relaxed text-slate-500 text-right">
                        حقول اختيارية — يمكن تحديث مكان العمل أو الراتب أو الاستقطاع يدوياً عند الحاجة.
                    </p>
                    <div>
                        <label className="mb-1 block text-[9px] font-bold text-slate-400">
                            مكان العمل / جهة العمل — اختياري
                        </label>
                        <input
                            type="text"
                            value={employerName}
                            onChange={(e) => setEmployerName(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right"
                            placeholder=""
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[9px] font-bold text-slate-400">
                            مقدار الراتب (د.ع) — اختياري
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={salaryAmount}
                            onChange={(e) => setSalaryAmount(formatNumberInput(e.target.value))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-mono text-slate-100 text-right"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[9px] font-bold text-slate-400">
                            مقدار الاستقطاع الشهري (د.ع) — اختياري
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={monthlyDeduction}
                            onChange={(e) => setMonthlyDeduction(formatNumberInput(e.target.value))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-mono text-slate-100 text-right"
                            placeholder="0"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2 text-[10px] font-black text-emerald-100 hover:bg-emerald-500/15"
                    >
                        حفظ
                    </button>
                </div>
            ) : (
                <div className="space-y-1 border-t border-white/10 pt-3 text-right">
                    {employerName.trim() ? (
                        <p className="text-[10px] text-slate-300">
                            مكان العمل: {employerName.trim()}
                        </p>
                    ) : (
                        <p className="text-[10px] text-slate-500">مكان العمل: —</p>
                    )}
                    {salaryAmount ? (
                        <p className="text-[10px] text-slate-300 tabular-nums">
                            مقدار الراتب: {salaryDisplay} د.ع
                        </p>
                    ) : (
                        <p className="text-[10px] text-slate-500">مقدار الراتب: —</p>
                    )}
                    {monthlyDeduction ? (
                        <p className="text-[10px] text-slate-300 tabular-nums">
                            الاستقطاع الشهري: {deductionDisplay} د.ع
                        </p>
                    ) : (
                        <p className="text-[10px] text-slate-500">الاستقطاع الشهري: —</p>
                    )}
                </div>
            )}

            {!releasedLocked && String(asset.status) === 'seized' && !locked ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                    <button
                        type="button"
                        onClick={onRelease}
                        className="w-full rounded-xl border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-[11px] font-extrabold text-slate-200 hover:bg-slate-500/15"
                    >
                        فك الحجز
                    </button>
                </div>
            ) : null}
        </div>
    );
};
