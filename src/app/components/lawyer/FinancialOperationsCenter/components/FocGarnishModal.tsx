import React from 'react';
import { motion } from 'motion/react';
import { FocModalPortal } from './FocModalPortal';
import { formatNumberInput } from '../utils';

export interface FocGarnishModalProps {
    open: boolean;
    onClose: () => void;
    garnishMonthlyInput: string;
    setGarnishMonthlyInput: (v: string) => void;
    garnishMemoInput: string;
    setGarnishMemoInput: (v: string) => void;
    remainingUnified: number;
    canConfirmGarnishment: boolean;
    onConfirm: () => void;
}

export const FocGarnishModal: React.FC<FocGarnishModalProps> = ({
    open,
    onClose,
    garnishMonthlyInput,
    setGarnishMonthlyInput,
    garnishMemoInput,
    setGarnishMemoInput,
    remainingUnified,
    canConfirmGarnishment,
    onConfirm,
}) => {
    if (!open) return null;

    return (
        <FocModalPortal open onBackdropClick={onClose} backdropClassName="bg-black/55">
            <motion.div
                layout
                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-[#0A1122]/80 backdrop-blur-xl p-6 border border-white/10 shadow-2xl space-y-5"
            >
                <div className="text-center border-b border-white/5 pb-4">
                    <h3 className="text-base font-black text-white">حجز الراتب</h3>
                    <p className="text-[11px] text-slate-500 mt-1">قاعدة الخُمس (١/٥) — مدين موظف</p>
                </div>

                <div className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-indigo-950/50 via-violet-950/30 to-transparent px-4 py-3.5 text-right">
                    <p className="text-violet-100 text-sm font-bold">بيانات الاستقطاع والكتاب</p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        خصم شهري لا يتجاوز الخُمس؛ يُتابع لدى المنفذ وجهة العمل. أكمل الحقول ثم أكّد.
                    </p>
                </div>

                <motion.div
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="space-y-4 overflow-hidden"
                >
                    <label className="block text-right">
                        <span className="text-[11px] text-slate-400 mb-1.5 block">
                            مقدار الاستقطاع الشهري (قاعدة الخُمس)
                        </span>
                        <input
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            placeholder="المبلغ الشهري (د.ع)"
                            value={garnishMonthlyInput}
                            onChange={(e) =>
                                setGarnishMonthlyInput(formatNumberInput(e.target.value))
                            }
                            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/35"
                        />
                    </label>
                    <label className="block text-right">
                        <span className="text-[11px] text-slate-400 mb-1.5 block">رقم الكتاب</span>
                        <input
                            type="text"
                            placeholder="رقم الكتاب / المرجع"
                            value={garnishMemoInput}
                            onChange={(e) => setGarnishMemoInput(e.target.value)}
                            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/35"
                        />
                    </label>
                </motion.div>

                <p className="text-slate-400 text-xs text-right border-t border-white/5 pt-3">
                    المتبقي على الوعاء:{' '}
                    <span className="text-[#E6C673] font-black tabular-nums">
                        {remainingUnified.toLocaleString('ar-IQ')} د.ع
                    </span>
                </p>

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/10 transition"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!canConfirmGarnishment}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-800 text-white text-sm font-bold shadow-lg shadow-violet-950/40 hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        تأكيد حجز الراتب
                    </button>
                </div>
            </motion.div>
        </FocModalPortal>
    );
};
