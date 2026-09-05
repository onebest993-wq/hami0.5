import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { ArrowDownCircle } from '@/app/components/ui/icons/ArrowDownCircle';
import { formatNumberInput } from '../utils';

export function SettlementRepaymentStripPanel({
    repaymentInput,
    setRepaymentInput,
    canApplyRepayment,
    onApply,
    disabled = false,
    remainingUnified = 0,
    repaymentExceedsRemaining = false,
    onCollapse,
}: {
    repaymentInput: string;
    setRepaymentInput: (v: string) => void;
    canApplyRepayment: boolean;
    onApply: () => boolean;
    disabled?: boolean;
    remainingUnified?: number;
    repaymentExceedsRemaining?: boolean;
    onCollapse: () => void;
}): React.ReactElement {
    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
        >
            <div className="space-y-2.5 border-t border-emerald-500/10 px-3.5 pb-3.5 pt-2">
                <input
                    type="text"
                    inputMode="decimal"
                    placeholder="مبلغ التسديد (د.ع)"
                    value={repaymentInput}
                    onChange={(e) => setRepaymentInput(formatNumberInput(e.target.value))}
                    disabled={disabled}
                    className={[
                        'w-full rounded-xl border bg-[#0A0F1C]/70 px-3 py-3 text-right text-sm font-bold tabular-nums text-white placeholder:text-slate-500 shadow-inner focus:outline-none focus:ring-1',
                        repaymentExceedsRemaining
                            ? 'border-rose-400/45 focus:border-rose-400/45 focus:ring-rose-400/20'
                            : 'border-white/10 focus:border-emerald-400/35 focus:ring-emerald-400/20',
                    ].join(' ')}
                />
                {repaymentExceedsRemaining ? (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-950/25 px-3 py-2 text-[10px] font-bold leading-relaxed text-rose-200/95">
                        المبلغ المُدخل يتجاوز المتبقي (
                        {remainingUnified.toLocaleString('ar-IQ')} د.ع)
                    </p>
                ) : null}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCollapse}
                        className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-[10px] font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (onApply()) onCollapse();
                        }}
                        disabled={disabled || !canApplyRepayment}
                        className="flex-[1.4] rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-700 py-2.5 text-[11px] font-black text-white shadow-md shadow-emerald-950/25 flex items-center justify-center gap-2 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        <ArrowDownCircle size={14} />
                        تسجيل التسديد
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
