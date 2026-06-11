import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownCircle, ChevronDown, Wallet } from 'lucide-react';
import { formatNumberInput } from '../utils';

export interface SettlementRepaymentStripProps {
    repaymentInput: string;
    setRepaymentInput: (v: string) => void;
    canApplyRepayment: boolean;
    onApply: () => boolean;
    disabled?: boolean;
    remainingUnified?: number;
    repaymentExceedsRemaining?: boolean;
}

/** تسديد فوري — يُفتح عند الحاجة فقط */
export const SettlementRepaymentStrip: React.FC<SettlementRepaymentStripProps> = ({
    repaymentInput,
    setRepaymentInput,
    canApplyRepayment,
    onApply,
    disabled = false,
    remainingUnified = 0,
    repaymentExceedsRemaining = false,
}) => {
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
        if (disabled) setExpanded(false);
    }, [disabled]);

    return (
        <div className="overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.07] via-[#0A1122]/40 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="flex w-full flex-row-reverse items-center justify-between gap-3 px-3.5 py-3 text-right transition-colors hover:bg-emerald-500/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <span className="flex flex-row-reverse items-center gap-2.5 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                        <Wallet size={16} />
                    </span>
                    <span className="min-w-0 text-right">
                        <span className="block text-[11px] font-black text-emerald-100">تسديد الوعاء</span>
                        <span className="block text-[9px] font-medium text-slate-500">
                            {expanded ? 'إخفاء نموذج التسديد' : 'تسجيل دفعة على المتبقي'}
                        </span>
                    </span>
                </span>
                <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400"
                >
                    <ChevronDown size={14} />
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {expanded ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
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
                                    onClick={() => setExpanded(false)}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-[10px] font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onApply()) setExpanded(false);
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
                ) : null}
            </AnimatePresence>
        </div>
    );
};
