import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from '@/app/components/ui/lucideIcons';
import { DatePickerField } from '../components/DatePickerField';
import { getDynamicPartyLabels, ordinalOf } from '../utils/partyLabels';
import type { MetaEditForm } from './MetaEditModal';

export type PartyEditRow = {
    name: string;
    address: string;
};

export type DossierEditForm = {
    meta: MetaEditForm;
    party1: PartyEditRow[];
    party2: PartyEditRow[];
};

export type DossierEditModalProps = {
    open: boolean;
    isIqrarContext: boolean;
    procedureType: string;
    dossierEditForm: DossierEditForm;
    setDossierEditForm: React.Dispatch<React.SetStateAction<DossierEditForm>>;
    onClose: () => void;
    onSave: () => void;
};

function PartyFields({
    label,
    form,
    onChange,
}: {
    label: string;
    form: PartyEditRow;
    onChange: (next: PartyEditRow) => void;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
            <div className="text-xs font-extrabold text-[#E6C673]/90">{label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                    <div className="text-[10px] font-semibold text-white/40 mb-1">الاسم</div>
                    <input
                        value={form.name}
                        onChange={(e) => onChange({ ...form, name: e.target.value })}
                        className="w-full bg-[#12182a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div>
                    <div className="text-[10px] font-semibold text-white/40 mb-1">العنوان</div>
                    <input
                        value={form.address}
                        onChange={(e) => onChange({ ...form, address: e.target.value })}
                        className="w-full bg-[#12182a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
            </div>
        </div>
    );
}

export function DossierEditModal({
    open,
    isIqrarContext,
    procedureType,
    dossierEditForm,
    setDossierEditForm,
    onClose,
    onSave,
}: DossierEditModalProps) {
    if (!open) return null;

    const labels = getDynamicPartyLabels(procedureType);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full sm:max-w-lg bg-[#0B1021] border border-white/10 rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 max-h-[min(88vh,640px)] overflow-y-auto"
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-white font-extrabold">تعديل البيانات</div>
                            {procedureType ? (
                                <div className="text-[11px] text-white/45 mt-0.5 truncate">{procedureType}</div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center touch-manipulation"
                            aria-label="إغلاق"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <section>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-white/40 mb-2">
                                بيانات الإضبارة
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <div className="text-[10px] font-semibold text-white/40 mb-1">رقم الطلب</div>
                                    <input
                                        value={dossierEditForm.meta.requestNumber}
                                        onChange={(e) =>
                                            setDossierEditForm((prev) => ({
                                                ...prev,
                                                meta: { ...prev.meta, requestNumber: e.target.value },
                                            }))
                                        }
                                        className="w-full bg-[#12182a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-white/40 mb-1">
                                        {isIqrarContext ? 'موعد الحضور' : 'تاريخ الطلب'}
                                    </div>
                                    <DatePickerField
                                        value={dossierEditForm.meta.requestDate || ''}
                                        onValueChange={(v) =>
                                            setDossierEditForm((prev) => ({
                                                ...prev,
                                                meta: { ...prev.meta, requestDate: v },
                                            }))
                                        }
                                        wrapperClassName="w-full max-w-[304px]"
                                        inputClassName="w-full bg-[#12182a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-white/40 mb-1">المحكمة</div>
                                    <input
                                        value={dossierEditForm.meta.courtName}
                                        onChange={(e) =>
                                            setDossierEditForm((prev) => ({
                                                ...prev,
                                                meta: { ...prev.meta, courtName: e.target.value },
                                            }))
                                        }
                                        className="w-full bg-[#12182a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-white/40 mb-1">القاضي</div>
                                    <input
                                        value={dossierEditForm.meta.judgeName}
                                        onChange={(e) =>
                                            setDossierEditForm((prev) => ({
                                                ...prev,
                                                meta: { ...prev.meta, judgeName: e.target.value },
                                            }))
                                        }
                                        className="w-full bg-[#12182a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-2.5">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-white/40">الأطراف</div>
                            {dossierEditForm.party1.map((row, index) => {
                                const titleBase = labels.party1;
                                const title =
                                    dossierEditForm.party1.length > 1
                                        ? `${titleBase} ${ordinalOf(index)}`
                                        : titleBase;
                                return (
                                    <PartyFields
                                        key={`party1-${index}`}
                                        label={title}
                                        form={row}
                                        onChange={(next) =>
                                            setDossierEditForm((prev) => {
                                                const party1 = [...prev.party1];
                                                party1[index] = next;
                                                return { ...prev, party1 };
                                            })
                                        }
                                    />
                                );
                            })}
                            {dossierEditForm.party2.map((row, index) => {
                                const titleBase = labels.party2;
                                const title =
                                    dossierEditForm.party2.length > 1
                                        ? `${titleBase} ${ordinalOf(index)}`
                                        : titleBase;
                                return (
                                    <PartyFields
                                        key={`party2-${index}`}
                                        label={title}
                                        form={row}
                                        onChange={(next) =>
                                            setDossierEditForm((prev) => {
                                                const party2 = [...prev.party2];
                                                party2[index] = next;
                                                return { ...prev, party2 };
                                            })
                                        }
                                    />
                                );
                            })}
                        </section>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2 sticky bottom-0 pt-2 bg-[#0B1021]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm touch-manipulation"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            className="px-4 py-2 rounded-xl bg-[#E6C673]/20 border border-[#E6C673]/35 hover:bg-[#E6C673]/30 text-[#F5F0E6] text-sm font-bold flex items-center gap-2 touch-manipulation"
                        >
                            <Check size={16} />
                            حفظ
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
