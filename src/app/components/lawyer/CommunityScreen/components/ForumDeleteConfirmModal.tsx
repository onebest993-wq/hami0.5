import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { X } from '@/app/components/ui/icons/X';
import { getForumOverlayPortalRoot } from '../forumOverlayPortal';
import { FORUM_PANEL } from '../forumPlumTheme';

interface ForumDeleteConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ForumDeleteConfirmModal = ({
    open,
    title,
    message,
    confirmLabel = 'نعم، احذف',
    loading = false,
    onConfirm,
    onCancel,
}: ForumDeleteConfirmModalProps) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/65 pointer-events-auto"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        data-testid="forum-delete-confirm-modal"
                        className={`w-full max-w-md ${FORUM_PANEL} overflow-hidden`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="forum-delete-title"
                    >
                        <div className="px-5 pt-5 pb-4 border-b border-white/5 flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                                <AlertTriangle size={22} className="text-red-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 id="forum-delete-title" className="text-white font-bold text-base">{title}</h3>
                                <p className="text-white/55 text-sm mt-1 leading-relaxed">{message}</p>
                            </div>
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="min-h-[44px] min-w-[44px] touch-manipulation rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                aria-label="إغلاق"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-white/10 text-white/70 text-sm font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        getForumOverlayPortalRoot(),
    );
};
