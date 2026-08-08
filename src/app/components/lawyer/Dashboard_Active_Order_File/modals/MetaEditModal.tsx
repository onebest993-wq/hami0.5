import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Info } from '@/app/components/ui/lucideIcons';
import { DatePickerField } from '../components/DatePickerField';

export type MetaEditForm = {
    requestNumber: string;
    requestDate: string;
    courtName: string;
    judgeName: string;
    specificActionType: string;
};

export type MetaEditModalProps = {
    open: boolean;
    isIqrarContext: boolean;
    khulasaText: string;
    metaEditForm: MetaEditForm;
    setMetaEditForm: React.Dispatch<React.SetStateAction<MetaEditForm>>;
    onClose: () => void;
    onSave: () => void;
};

export function MetaEditModal({
    open,
    isIqrarContext,
    khulasaText,
    metaEditForm,
    setMetaEditForm,
    onClose,
    onSave,
}: MetaEditModalProps) {
    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl p-5"
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 18, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white font-extrabold">تعديل بيانات الإضبارة</div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-semibold text-slate-400">نوع الطلب</div>
                                {!!khulasaText && (
                                    <div className="relative group">
                                        <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-white/10 border border-white/10 text-white/70 group-hover:text-white flex items-center justify-center transition-colors">
                                            <Info size={14} />
                                        </div>
                                        <div className="absolute top-full mt-2 left-0 z-20 w-[320px] max-w-[80vw] rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur p-3 text-right opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                                            <div className="text-xs font-bold text-slate-200">خلاصة الطلب</div>
                                            <div className="mt-1 text-sm text-slate-300 line-clamp-4">{khulasaText}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input
                                value={metaEditForm.specificActionType}
                                onChange={(e) => setMetaEditForm((prev) => ({ ...prev, specificActionType: e.target.value }))}
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm"
                            />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-400">رقم الطلب</div>
                            <input
                                value={metaEditForm.requestNumber}
                                onChange={(e) => setMetaEditForm((prev) => ({ ...prev, requestNumber: e.target.value }))}
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm"
                            />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-400">
                                {isIqrarContext ? 'موعد الحضور للمصادقة' : 'تاريخ تقديم الطلب / المراجعة'}
                            </div>
                            <DatePickerField
                                value={metaEditForm.requestDate || ''}
                                onValueChange={(v) => setMetaEditForm((prev) => ({ ...prev, requestDate: v }))}
                                inputClassName="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm"
                            />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-400">اسم المحكمة</div>
                            <input
                                value={metaEditForm.courtName}
                                onChange={(e) => setMetaEditForm((prev) => ({ ...prev, courtName: e.target.value }))}
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm"
                            />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-400">اسم القاضي</div>
                            <input
                                value={metaEditForm.judgeName}
                                onChange={(e) => setMetaEditForm((prev) => ({ ...prev, judgeName: e.target.value }))}
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm"
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-transparent text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2"
                        >
                            <Check size={16} />
                            حفظ التعديلات
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
