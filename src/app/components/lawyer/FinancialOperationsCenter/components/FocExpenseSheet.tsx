import React from 'react';
import { motion } from 'motion/react';
import { X } from '@/app/components/ui/lucideIcons';
import { FocModalPortal } from './FocModalPortal';
import { formatNumberInput } from '../utils';
import type { ExpenseRow } from '../types';

export interface FocExpenseSheetProps {
    open: boolean;
    onClose: () => void;
    sheetClass: string;
    expenseAmountInput: string;
    setExpenseAmountInput: (v: string) => void;
    expenseReasonInput: string;
    setExpenseReasonInput: (v: string) => void;
    canAddExpense: boolean;
    onAddExpense: () => void;
    expenses: ExpenseRow[];
}

export const FocExpenseSheet: React.FC<FocExpenseSheetProps> = ({
    open,
    onClose,
    sheetClass,
    expenseAmountInput,
    setExpenseAmountInput,
    expenseReasonInput,
    setExpenseReasonInput,
    canAddExpense,
    onAddExpense,
    expenses,
}) => {
    if (!open) return null;

    return (
        <FocModalPortal open onBackdropClick={onClose} backdropClassName="bg-black/50">
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={sheetClass}
            >
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                    >
                        <X size={18} />
                    </button>
                    <h4 className="text-sm font-bold text-sky-200/95">إضافة مصاريف</h4>
                </div>
                <div className="space-y-2">
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="المبلغ (د.ع)"
                        value={expenseAmountInput}
                        onChange={(e) => setExpenseAmountInput(formatNumberInput(e.target.value))}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm"
                    />
                    <textarea
                        placeholder="السبب — أجور خبير، رسوم، ..."
                        value={expenseReasonInput}
                        onChange={(e) => setExpenseReasonInput(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm resize-none"
                    />
                    <button
                        type="button"
                        onClick={onAddExpense}
                        disabled={!canAddExpense}
                        className="w-full rounded-xl bg-sky-600/75 py-2.5 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        تسجيل مصروف
                    </button>
                </div>
                <ul className="space-y-2 max-h-40 overflow-y-auto text-right text-[11px] text-slate-400">
                    {expenses.map((r) => (
                        <li key={r.id} className="border-b border-white/5 pb-1">
                            <span className="text-sky-400 font-bold tabular-nums">
                                {r.amount.toLocaleString('ar-IQ')}
                            </span>{' '}
                            — {r.reason}
                        </li>
                    ))}
                </ul>
            </motion.div>
        </FocModalPortal>
    );
};
