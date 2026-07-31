import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { FocModalPortal } from './FocModalPortal';
import { formatNumberInput } from '../utils';
import type { LawyerFeeRow } from '../types';

export interface FocFeesSheetEvictionStrip {
    lawyerFeeRequestTitle?: string;
    lawyerFeeRequestDisabled?: boolean;
    onRequestLawyerFees: () => void;
}

export interface FocFeesSheetProps {
    open: boolean;
    onClose: () => void;
    sheetClass: string;
    lawyerAmountInput: string;
    setLawyerAmountInput: (v: string) => void;
    lawyerLabelInput: string;
    setLawyerLabelInput: (v: string) => void;
    canAddLawyerFee: boolean;
    onAddLawyerFee: () => void;
    evictionFinanceStrip?: FocFeesSheetEvictionStrip;
    isEvictionFundsModule: boolean;
    lawyerFees: LawyerFeeRow[];
}

export const FocFeesSheet: React.FC<FocFeesSheetProps> = ({
    open,
    onClose,
    sheetClass,
    lawyerAmountInput,
    setLawyerAmountInput,
    lawyerLabelInput,
    setLawyerLabelInput,
    canAddLawyerFee,
    onAddLawyerFee,
    evictionFinanceStrip,
    isEvictionFundsModule,
    lawyerFees,
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
                    <h4 className="text-sm font-bold text-emerald-200/95">تعديل الأتعاب</h4>
                </div>
                <div className="space-y-2">
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="المبلغ (د.ع)"
                        value={lawyerAmountInput}
                        onChange={(e) => setLawyerAmountInput(formatNumberInput(e.target.value))}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm"
                    />
                    <input
                        type="text"
                        placeholder="وصف (اختياري)"
                        value={lawyerLabelInput}
                        onChange={(e) => setLawyerLabelInput(e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm"
                    />
                    <button
                        type="button"
                        onClick={onAddLawyerFee}
                        disabled={!canAddLawyerFee}
                        className="w-full rounded-xl bg-emerald-600/75 py-2.5 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        إضافة بند أتعاب
                    </button>
                </div>
                {evictionFinanceStrip && isEvictionFundsModule && (
                    <button
                        type="button"
                        title={evictionFinanceStrip.lawyerFeeRequestTitle}
                        disabled={evictionFinanceStrip.lawyerFeeRequestDisabled}
                        onClick={() => {
                            if (!evictionFinanceStrip.lawyerFeeRequestDisabled) {
                                evictionFinanceStrip.onRequestLawyerFees();
                                onClose();
                            }
                        }}
                        className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 text-[11px] text-slate-300 disabled:opacity-40"
                    >
                        طلب صرف أتعاب (تخلية)
                    </button>
                )}
                <ul className="space-y-2 max-h-40 overflow-y-auto text-right text-[11px] text-slate-400">
                    {lawyerFees.map((r) => (
                        <li key={r.id} className="border-b border-white/5 pb-1">
                            <span className="text-emerald-400 font-bold tabular-nums">
                                {r.amount.toLocaleString('ar-IQ')}
                            </span>{' '}
                            — {r.label}
                        </li>
                    ))}
                </ul>
            </motion.div>
        </FocModalPortal>
    );
};
