import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';

export type PartyEditTarget = {
    type: 'party1' | 'party2';
    index: number;
    party: Record<string, unknown>;
} | null;

export type PartyEditForm = {
    name: string;
    type: string;
    phone: string;
    address: string;
};

export type PartyEditModalProps = {
    partyEditTarget: PartyEditTarget;
    partyEditForm: PartyEditForm;
    setPartyEditForm: React.Dispatch<React.SetStateAction<PartyEditForm>>;
    onClose: () => void;
    onSave: () => void;
};

export function PartyEditModal({
    partyEditTarget,
    partyEditForm,
    setPartyEditForm,
    onClose,
    onSave,
}: PartyEditModalProps) {
    if (!partyEditTarget) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5"
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 18, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white font-extrabold">تعديل بيانات الطرف</div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <div className="text-xs font-semibold text-slate-400">النوع</div>
                            <select
                                value={partyEditForm.type}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setPartyEditForm((prev) => ({ ...prev, type: v }));
                                }}
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm"
                            >
                                <option value="person">طبيعي</option>
                                <option value="company">شركة</option>
                            </select>
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-slate-400">الاسم الكامل</div>
                            <input
                                value={partyEditForm.name}
                                onChange={(e) => setPartyEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder={
                                    partyEditForm.type === 'company'
                                        ? 'اسم الشركة / والمدير المفوض (إضافة لوظيفته)'
                                        : 'الاسم الكامل'
                                }
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm"
                            />
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-slate-400">رقم الهاتف</div>
                            <input
                                dir={partyEditTarget.type === 'party1' ? 'ltr' : 'rtl'}
                                value={partyEditForm.phone}
                                onChange={(e) => setPartyEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm font-mono"
                            />
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-slate-400">العنوان</div>
                            <textarea
                                value={partyEditForm.address}
                                onChange={(e) => setPartyEditForm((prev) => ({ ...prev, address: e.target.value }))}
                                className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-sm min-h-[90px]"
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
