import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

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
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
            >
                <motion.div
                    className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5"
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 18, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-white font-extrabold text-sm">تأكيد</div>
                    <div className="mt-3 text-white/80 text-sm font-bold whitespace-pre-wrap">{message}</div>
                    <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancel();
                            }}
                            className="px-4 py-2 rounded-xl bg-transparent text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onConfirm();
                            }}
                            className="px-4 py-2 rounded-xl bg-[#E6C673] hover:opacity-90 text-[#0B1021] text-sm font-extrabold"
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
