/**
 * تأكيد قابل لإعادة الاستخدام: الانتقال لمحضر الجرد/التخلية بعد قبول المنفذ.
 */

import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';

export interface ExecutorWorkflowConfirmModalProps {
    open: boolean;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
}

export const ExecutorWorkflowConfirmModal: React.FC<ExecutorWorkflowConfirmModalProps> = ({
    open,
    message,
    onClose,
    onConfirm,
}) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="backdrop-blur-3xl bg-slate-900/40 border border-emerald-500/20 rounded-3xl p-6 max-w-md w-full shadow-lg shadow-emerald-500/10"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-emerald-200">محضر التنفيذ</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <X size={22} />
                    </button>
                </div>
                <p className="text-gray-300 text-sm text-right leading-relaxed mb-6">{message}</p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-600/50 text-slate-300 text-sm font-bold"
                    >
                        لاحقاً
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold"
                    >
                        نعم، افتح المحضر
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
