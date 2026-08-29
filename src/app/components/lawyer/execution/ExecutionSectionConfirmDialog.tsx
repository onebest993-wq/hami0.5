/**
 * تأكيد قسم التنفيذ — بديل Capacitor-safe لـ window.confirm.
 * سطح مسطّح متناسق مع نموذج الإنشاء (ذهب / كحلي).
 */
import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { ecg } from '@/app/components/lawyer/ExecutionCreationView/components/executionCreationGlassUi';

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
            className="fixed inset-0 bg-black/55 flex items-center justify-center p-4"
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="execution-section-confirm-title"
            data-testid="execution-section-confirm-dialog"
        >
            <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className={`${ecg.modalPanel} max-w-md`}
            >
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h3
                        id="execution-section-confirm-title"
                        className="min-w-0 truncate text-right text-[13px] font-bold text-[#E6C673]"
                    >
                        تأكيد
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className={ecg.modalClose}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>
                <p className="mb-5 whitespace-pre-line text-right text-sm leading-relaxed text-slate-300">
                    {message}
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className={ecg.modalBtnGhost}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={ecg.modalBtnPrimary}
                        data-testid="execution-section-confirm-accept"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
