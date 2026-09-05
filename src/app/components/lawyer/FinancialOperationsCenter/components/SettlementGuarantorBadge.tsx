import React, { useState } from 'react';
import { Shield } from '@/app/components/ui/icons/Shield';
import { formatNumberInput, parseAmount } from '@/app/utils/execution/amountInput';

export type SettlementGuarantorBadgeProps = {
    guarantorName?: string | null;
    guarantorDeductionIqd?: number | null;
    onPersist: (guarantorName: string, deductionIqd: number | null) => void;
};

/**
 * شارة كفيل مرتبطة بالتسوية فقط: اسم + استقطاع.
 * لا مسار طلب قرارات منفصل من هذه الواجهة.
 */
export const SettlementGuarantorBadge: React.FC<SettlementGuarantorBadgeProps> = ({
    guarantorName,
    guarantorDeductionIqd,
    onPersist,
}) => {
    const [open, setOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState(String(guarantorName || '').trim());
    const [deductionDraft, setDeductionDraft] = useState(
        guarantorDeductionIqd != null && Number.isFinite(guarantorDeductionIqd)
            ? formatNumberInput(String(guarantorDeductionIqd))
            : '',
    );

    const label = String(guarantorName || '').trim() || 'كفيل';

    return (
        <div className="w-full" dir="rtl" data-testid="settlement-guarantor-badge">
            <button
                type="button"
                data-testid="foc-amount-guarantor-request"
                onClick={() => {
                    setNameDraft(String(guarantorName || '').trim());
                    setDeductionDraft(
                        guarantorDeductionIqd != null && Number.isFinite(guarantorDeductionIqd)
                            ? formatNumberInput(String(guarantorDeductionIqd))
                            : '',
                    );
                    setOpen((v) => !v);
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/[0.04] px-4 py-2.5 text-[11px] font-bold text-cyan-300/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:bg-cyan-500/10"
            >
                <Shield size={14} className="shrink-0 opacity-80" aria-hidden />
                {label}
            </button>
            {open ? (
                <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="space-y-1">
                        <label className="block text-[9px] text-slate-500">اسم الكفيل</label>
                        <input
                            type="text"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            className="w-full min-h-[44px] rounded-lg border border-white/12 bg-white/5 px-2.5 py-2 text-[11px] text-slate-100 placeholder:text-slate-600"
                            placeholder="اسم الكفيل"
                            dir="rtl"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[9px] text-slate-500">الاستقطاع (د.ع)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={deductionDraft}
                            onChange={(e) => setDeductionDraft(formatNumberInput(e.target.value))}
                            className="w-full min-h-[44px] rounded-lg border border-white/12 bg-white/5 px-2.5 py-2 text-right font-mono text-[11px] text-slate-100 placeholder:text-slate-600"
                            placeholder="مبلغ الاستقطاع"
                            dir="ltr"
                        />
                    </div>
                    <button
                        type="button"
                        className="w-full min-h-[44px] rounded-lg border border-cyan-400/40 bg-cyan-950/50 py-2.5 text-[10px] font-extrabold text-cyan-100 hover:bg-cyan-900/55"
                        onClick={() => {
                            const n = nameDraft.trim();
                            if (!n) return;
                            const parsed = parseAmount(deductionDraft);
                            onPersist(n, Number.isFinite(parsed) ? parsed : null);
                            setOpen(false);
                        }}
                    >
                        حفظ
                    </button>
                </div>
            ) : null}
        </div>
    );
};
