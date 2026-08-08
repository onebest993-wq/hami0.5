/**
 * إدخال / تعديل بيانات الحارس القاضي — الاسم والراتب.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { UserCheck, X } from '@/app/components/ui/lucideIcons';
import type { JudicialCustodianSavePayload } from '@/app/utils/executorApprovalWorkflow';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import { formatNumberInput, formatStoredAmountForInput } from '@/app/utils/execution/amountInput';

export interface ExecutorJudicialCustodianModalProps {
    open: boolean;
    requestTitle: string;
    initialName?: string;
    initialSalary?: string;
    existingCustodianNames?: string[];
    onClose: () => void;
    onConfirm: (payload: JudicialCustodianSavePayload) => void;
}

export const ExecutorJudicialCustodianModal: React.FC<ExecutorJudicialCustodianModalProps> = ({
    open,
    requestTitle,
    initialName = '',
    initialSalary = '',
    existingCustodianNames = [],
    onClose,
    onConfirm,
}) => {
    const [name, setName] = useState('');
    const [salary, setSalary] = useState('');

    useEffect(() => {
        if (open) {
            setName(String(initialName || '').trim());
            setSalary(formatStoredAmountForInput(initialSalary) || formatNumberInput(String(initialSalary || '').trim()));
        }
    }, [open, initialName, initialSalary]);

    if (!open || typeof document === 'undefined') return null;

    const handleSave = () => {
        const n = name.trim();
        const s = salary.trim();
        if (!n || !s) return;
        onConfirm({ name: n, salary: s });
        onClose();
    };

    const listedCustodians = existingCustodianNames.filter((x) => String(x || '').trim());

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
                dir="rtl"
                role="presentation"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="w-full max-w-[480px] rounded-3xl border-2 border-emerald-500/30 bg-[#0B1120] shadow-2xl shadow-black/60"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="بيانات الحارس القاضي"
                >
                    <div className="sticky top-0 flex items-center justify-between border-b border-emerald-500/20 bg-[#0B1120] p-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-200 hover:bg-emerald-500/15"
                            aria-label="إغلاق"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex flex-row-reverse items-center gap-2">
                            <UserCheck size={18} className="text-emerald-400/90 shrink-0" />
                            <h3 className="text-right text-base font-black text-emerald-100">
                                بيانات الحارس القاضي
                            </h3>
                        </div>
                    </div>

                    <div className="p-5 space-y-3">
                        {requestTitle ? (
                            <p className="text-[11px] leading-relaxed text-slate-400 text-right">{requestTitle}</p>
                        ) : null}
                        {listedCustodians.length > 0 && !initialName ? (
                            <div className="rounded-xl border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-right">
                                <p className="text-[10px] font-bold text-amber-100">
                                    يوجد حارس قضائي مسجّل في الإضبارة
                                </p>
                                <p className="mt-0.5 text-[9px] text-amber-200/85">{listedCustodians.join(' · ')}</p>
                            </div>
                        ) : null}
                        <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                اسم الحارس القاضي
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                disabled={false}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-300">الراتب (د.ع)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={salary}
                                onChange={(e) => setSalary(formatNumberInput(e.target.value))}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right tabular-nums"
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold text-slate-200 hover:bg-white/10"
                                onClick={onClose}
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!name.trim() || !salary.trim()}
                                className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-5 py-2 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                            >
                                حفظ
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
