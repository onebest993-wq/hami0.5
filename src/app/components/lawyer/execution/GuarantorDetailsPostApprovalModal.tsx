import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { formatNumberInput } from '@/app/utils/execution/amountInput';

export function GuarantorDetailsPostApprovalModal(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    disabled?: boolean;
    name: string;
    workplace: string;
    salary: string;
    deduction: string;
    setName: (v: string) => void;
    setWorkplace: (v: string) => void;
    setSalary: (v: string) => void;
    setDeduction: (v: string) => void;
    onSave: () => void;
}) {
    if (!props.open || typeof document === 'undefined') return null;
    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                style={{ zIndex: EXEC_MODAL_Z.nestedOverDecisions }}
                dir="rtl"
                role="presentation"
                onClick={(e) => {
                    if (e.target === e.currentTarget) props.onOpenChange(false);
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="w-full max-w-[560px] rounded-3xl border-2 border-indigo-500/35 bg-[#0B1120] shadow-2xl shadow-black/60"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="تفاصيل الكفيل"
                >
                    <div className="sticky top-0 flex items-center justify-between border-b border-indigo-500/20 bg-[#0B1120] p-4">
                        <button
                            type="button"
                            onClick={() => props.onOpenChange(false)}
                            className="rounded-lg p-2 text-slate-200 hover:bg-indigo-500/15"
                            aria-label="إغلاق"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-right text-base font-black text-indigo-200">
                            تفاصيل الكفيل — بعد موافقة المنفذ
                        </h3>
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">اسم الكفيل</label>
                                <input
                                    type="text"
                                    value={props.name}
                                    onChange={(e) => props.setName(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="اكتب اسم الكفيل"
                                    disabled={props.disabled}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">مكان العمل</label>
                                <input
                                    type="text"
                                    value={props.workplace}
                                    onChange={(e) => props.setWorkplace(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="الجهة/مكان العمل"
                                    disabled={props.disabled}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-slate-300">الراتب (د.ع)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={props.salary}
                                        onChange={(e) => props.setSalary(formatNumberInput(e.target.value))}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                        placeholder="اختياري"
                                        disabled={props.disabled}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-slate-300">الاستقطاع (د.ع)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={props.deduction}
                                        onChange={(e) => props.setDeduction(formatNumberInput(e.target.value))}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                        placeholder="اختياري"
                                        disabled={props.disabled}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold text-slate-200 hover:bg-white/10"
                                onClick={() => props.onOpenChange(false)}
                            >
                                إغلاق
                            </button>
                            <button
                                type="button"
                                disabled={props.disabled}
                                className="rounded-xl bg-gradient-to-l from-indigo-500 to-violet-700 px-5 py-2 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                                onClick={props.onSave}
                            >
                                حفظ بيانات الكفيل
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
