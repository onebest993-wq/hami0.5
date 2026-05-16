/**
 * إدخال / تعديل بيانات الحارس القاضي — الاسم والراتب.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { JudicialCustodianSavePayload } from '@/app/utils/executorApprovalWorkflow';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

export interface ExecutorJudicialCustodianModalProps {
    open: boolean;
    requestTitle: string;
    /** عند التعديل من البطاقة */
    initialName?: string;
    initialSalary?: string;
    onClose: () => void;
    onConfirm: (payload: JudicialCustodianSavePayload) => void;
}

export const ExecutorJudicialCustodianModal: React.FC<ExecutorJudicialCustodianModalProps> = ({
    open,
    requestTitle,
    initialName = '',
    initialSalary = '',
    onClose,
    onConfirm,
}) => {
    const [name, setName] = useState('');
    const [salary, setSalary] = useState('');

    useEffect(() => {
        if (open) {
            setName((initialName || '').trim());
            setSalary((initialSalary || '').trim());
        }
    }, [open, initialName, initialSalary]);

    if (!open) return null;

    const handleSave = () => {
        const n = name.trim();
        const s = salary.trim();
        if (!n || !s) return;
        onConfirm({ name: n, salary: s });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="backdrop-blur-3xl bg-slate-900/40 border border-amber-500/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-amber-500/10"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                        بيانات الحارس القاضي
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>
                <p className="text-gray-400 text-xs text-right mb-4 leading-relaxed">{requestTitle}</p>

                <div className="space-y-3 text-right">
                    <div>
                        <label className="block text-[10px] text-slate-500 mb-1">اسم الحارس القاضي</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            placeholder="الاسم الرباعي أو الاختصاص"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-slate-500 mb-1">الراتب (د.ع أو ما يعادله)</label>
                        <input
                            type="text"
                            value={salary}
                            onChange={(e) => setSalary(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            placeholder="مثال: ٥٠٠٬٠٠٠ د.ع شهرياً"
                        />
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 text-sm font-bold hover:bg-white/5"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!name.trim() || !salary.trim()}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        حفظ
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
