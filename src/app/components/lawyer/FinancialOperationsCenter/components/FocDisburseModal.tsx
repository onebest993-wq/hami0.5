import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { FocModalPortal } from './FocModalPortal';
import { formatNumberInput } from '../utils';

export interface FocDisburseModalProps {
    open: boolean;
    onClose: () => void;
    canShowGhuramaaDivision: boolean;
    trustBalanceUnified: number;
    creditorsCount?: number;
    disburseAmountInput: string;
    setDisburseAmountInput: (v: string) => void;
    canApplyDisburseAmount: boolean;
    onApplyDisbursement: () => void;
    onOpenGhuramaaModal: () => void;
}

export const FocDisburseModal: React.FC<FocDisburseModalProps> = ({
    open,
    onClose,
    canShowGhuramaaDivision,
    trustBalanceUnified,
    creditorsCount,
    disburseAmountInput,
    setDisburseAmountInput,
    canApplyDisburseAmount,
    onApplyDisbursement,
    onOpenGhuramaaModal,
}) => {
    if (!open) return null;

    return (
        <FocModalPortal open onBackdropClick={onClose} backdropClassName="bg-black/55">
            <motion.div
                initial={{ scale: 0.98, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 8 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl"
                dir="rtl"
            >
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                    >
                        <X size={18} />
                    </button>
                    <h4 className="text-sm font-black text-emerald-200">طلب صرف الأمانات التنفيذية</h4>
                </div>
                <div className="mt-3 space-y-3">
                    {canShowGhuramaaDivision && trustBalanceUnified > 0 ? (
                        <>
                            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-right">
                                <p className="text-[11px] font-black text-amber-200">قسمة الغرماء (توزيع الأمانات)</p>
                                <p className="mt-1 text-[10px] text-slate-300 leading-relaxed">
                                    يوجد أكثر من دائن واحد؛ أدخل حصة كل دائن يدوياً ضمن رصيد الأمانات وديونه المتبقية.
                                </p>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                        <p className="text-slate-500">رصيد الأمانات</p>
                                        <p className="mt-0.5 font-black tabular-nums text-slate-200">
                                            {trustBalanceUnified.toLocaleString('ar-IQ')} د.ع
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                        <p className="text-slate-500">عدد الدائنين</p>
                                        <p className="mt-0.5 font-black tabular-nums text-slate-200">
                                            {creditorsCount ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-bold text-slate-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenGhuramaaModal();
                                    }}
                                    className="flex-1 rounded-xl bg-amber-600/80 py-2.5 text-xs font-black text-white"
                                >
                                    إجراء القسمة
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="المبلغ المراد صرفه (د.ع)"
                                value={disburseAmountInput}
                                onChange={(e) => setDisburseAmountInput(formatNumberInput(e.target.value))}
                                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500"
                            />
                            <p className="text-[10px] text-slate-400 text-right">
                                رصيد الأمانات الحالي: {trustBalanceUnified.toLocaleString('ar-IQ')} د.ع
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-bold text-slate-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={onApplyDisbursement}
                                    disabled={!canApplyDisburseAmount}
                                    className="flex-1 rounded-xl bg-emerald-600/75 py-2.5 text-xs font-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    توثيق الصرف
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </FocModalPortal>
    );
};
