import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import {
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_DIALOG_PANEL,
} from '../layout/urgentDossierUi';

export type ConfirmDialogPortalProps = {
    open: boolean;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
};

export function ConfirmDialogPortal({ open, message, onCancel, onConfirm }: ConfirmDialogPortalProps) {
    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                className={URGENT_DOSSIER_DIALOG_OVERLAY}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
            >
                    <motion.div
                    className={URGENT_DOSSIER_DIALOG_PANEL}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-white font-extrabold text-sm">تأكيد</div>
                    <div className="mt-2 text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{message}</div>
                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancel();
                            }}
                            className="min-h-[44px] px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 font-bold text-sm touch-manipulation"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onConfirm();
                            }}
                            className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[44px] py-2 text-xs`}
                        >
                            تأكيد
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body,
    );
}
