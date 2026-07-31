import React from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ecg } from './executionCreationGlassUi';

interface LawyerFeesToggleCardProps {
    includeLawyerFees: boolean;
    onIncludeLawyerFeesChange: (checked: boolean) => void;
    lawyerFeesAmount: string;
    formatCurrency: (raw: string) => string;
    handleAmountChange: (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: (val: string) => void,
    ) => void;
    onLawyerFeesAmountChange: (v: string) => void;
}

/** بطاقة تفعيل المطالبة بأتعاب المحاماة المحكوم بها — مستخرجة من ExecutionCreationView (Phase-1 split). */
export const LawyerFeesToggleCard: React.FC<LawyerFeesToggleCardProps> = ({
    includeLawyerFees,
    onIncludeLawyerFeesChange,
    lawyerFeesAmount,
    formatCurrency,
    handleAmountChange,
    onLawyerFeesAmountChange,
}) => (
    <div
        className={[
            'rounded-2xl border transition-colors duration-200 overflow-hidden',
            includeLawyerFees
                ? 'border-[#E6C673]/35 bg-[#E6C673]/08'
                : 'border-white/10 bg-white/[0.03]',
        ].join(' ')}
    >
        <label className="flex min-h-[52px] flex-row-reverse items-center gap-3 px-3.5 py-3.5 cursor-pointer">
            <input
                type="checkbox"
                checked={includeLawyerFees}
                onChange={(e) => onIncludeLawyerFeesChange(e.target.checked)}
                className="sr-only"
            />
            <span
                className={[
                    'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
                    includeLawyerFees
                        ? 'border-[#E6C673] bg-[#E6C673] text-[#0A0F1C]'
                        : 'border-white/30 bg-transparent',
                ].join(' ')}
                aria-hidden
            >
                {includeLawyerFees ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            <span className="flex-1 text-right text-sm font-bold text-[#F0DFA8]">
                المطالبة بأتعاب المحاماة المحكوم بها
            </span>
        </label>

        <AnimatePresence initial={false}>
            {includeLawyerFees ? (
                <motion.div
                    key="lawyer-fees-amount"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                >
                    <div className="border-t border-white/10 px-3.5 pb-3.5 pt-3">
                        <label className={ecg.labelGold}>المبلغ (دينار)</label>
                        <div className={ecg.moneyWrap}>
                            <input
                                type="text"
                                value={formatCurrency(lawyerFeesAmount)}
                                onChange={(e) =>
                                    handleAmountChange(e, onLawyerFeesAmountChange)
                                }
                                className={ecg.moneyInput}
                                aria-label="أتعاب المحاماة المحكوم بها (دينار)"
                            />
                            <span className="text-slate-500 text-[10px] font-bold shrink-0">د.ع</span>
                        </div>
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    </div>
);
