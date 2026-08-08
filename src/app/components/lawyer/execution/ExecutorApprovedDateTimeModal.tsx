/**
 * هيكل نافذة تاريخ/وقت بعد قبول المنفذ (مسار التخلية — موعد ميداني أو مهلة).
 * نفس أسلوب الطبقات المستخدم في نافذة «إضافة موعد» داخل الإضبارة (بدون تغيير نظام الألوان).
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from '@/app/components/ui/lucideIcons';
import type { ScheduledDateSavePayload } from '@/app/utils/executorApprovalWorkflow';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

export interface ExecutorApprovedDateTimeModalProps {
    open: boolean;
    requestTitle: string;
    onClose: () => void;
    onConfirm: (payload: ScheduledDateSavePayload) => void;
}

export const ExecutorApprovedDateTimeModal: React.FC<ExecutorApprovedDateTimeModalProps> = ({
    open,
    requestTitle,
    onClose,
    onConfirm,
}) => {
    const [dateOnly, setDateOnly] = useState('');

    useEffect(() => {
        if (open) {
            setDateOnly('');
        }
    }, [open]);

    if (!open) return null;

    const handleSave = () => {
        if (!dateOnly.trim()) {
            return;
        }
        const timeOptional = '';
        const eventIso = `${dateOnly}T12:00:00`;
        const eventDateLabel = new Date(dateOnly).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timePart = timeOptional
            ? new Date(eventIso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            : null;
        const displayAr = timePart ? `${eventDateLabel} — ${timePart}` : eventDateLabel;
        onConfirm({ dateOnly, timeOptional, eventIso, displayAr });
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
                className="backdrop-blur-3xl bg-slate-900/40 border border-indigo-500/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-indigo-500/10"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                        اعتماد الموعد (منفذ العدل)
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
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">التاريخ المعتمد</label>
                        <input
                            type="date"
                            value={dateOnly}
                            onChange={(e) => setDateOnly(e.target.value)}
                            className="w-full backdrop-blur-xl bg-slate-800/30 border border-indigo-500/20 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                            style={{ direction: 'ltr', textAlign: 'right' }}
                        />
                    </div>
                </div>
                <button
                    type="button"
                    disabled={!dateOnly.trim()}
                    onClick={handleSave}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 mt-4"
                >
                    حفظ الموعد وربطه بالسجل
                </button>
            </motion.div>
        </div>
    );
};
