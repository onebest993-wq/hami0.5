/**
 * تأكيد قسم التنفيذ — بديل Capacitor-safe لـ window.confirm (الموجة 7).
 * نفس أنماط المحاضر الموجودة؛ لا تغيير بصري عن حوارات التنفيذ القياسية.
 */
import React from 'react';
import { motion } from 'motion/react';
import { X } from '@/app/components/ui/lucideIcons';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

export interface ExecutionSectionConfirmDialogProps {
    open: boolean;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onClose: () => void;
    onConfirm: () => void;
}

export const ExecutionSectionConfirmDialog: React.FC<ExecutionSectionConfirmDialogProps> = ({
    open,
    message,
    confirmLabel = 'تأكيد',
    cancelLabel = 'إلغاء',
    onClose,
    onConfirm,
}) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="execution-section-confirm-title"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="backdrop-blur-3xl bg-slate-900/40 border border-emerald-500/20 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-emerald-500/10"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 id="execution-section-confirm-title" className="text-lg font-bold text-emerald-200">
                        تأكيد
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg min-h-[44px] min-w-[44px]"
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                </div>
                <p className="text-gray-300 text-sm text-right leading-relaxed mb-6">{message}</p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-600/50 text-slate-300 text-sm font-bold min-h-[44px]"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold min-h-[44px]"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
