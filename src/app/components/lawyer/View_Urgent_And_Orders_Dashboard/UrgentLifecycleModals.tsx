import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_DIALOG_PANEL,
    URGENT_DOSSIER_INPUT,
} from '../Dashboard_Active_Order_File/layout/urgentDossierUi';
import type {
    UrgentArchiveModalState,
    UrgentPermanentDeleteModalState,
    UrgentTrashModalState,
} from './hooks/useUrgentLifecycleModals';

type UrgentLifecycleModalsProps = {
    archiveModal: UrgentArchiveModalState;
    onArchiveReasonChange: (reason: string) => void;
    onCloseArchive: () => void;
    onConfirmArchive: () => void;
    trashModal: UrgentTrashModalState;
    onTrashReasonChange: (reason: string) => void;
    onCloseTrash: () => void;
    onConfirmTrash: () => void;
    permanentDeleteModal: UrgentPermanentDeleteModalState;
    onClosePermanentDelete: () => void;
    onConfirmPermanentDelete: () => void;
};

export function UrgentLifecycleModals({
    archiveModal,
    onArchiveReasonChange,
    onCloseArchive,
    onConfirmArchive,
    trashModal,
    onTrashReasonChange,
    onCloseTrash,
    onConfirmTrash,
    permanentDeleteModal,
    onClosePermanentDelete,
    onConfirmPermanentDelete,
}: UrgentLifecycleModalsProps) {
    return (
        <>
            <AnimatePresence>
                {archiveModal.isOpen ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={onCloseArchive}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="w-full max-w-lg rounded-2xl bg-[#0B1021] border border-white/10 p-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-white font-extrabold text-lg">📦 أرشفة الملف</div>
                            <div className="text-white/60 text-sm mt-1">
                                {archiveModal.mode === 'auto'
                                    ? 'تم إنهاء الإضبارة. هل تريد أرشفتها الآن؟'
                                    : 'سيتم نقل الملف إلى الأرشيف ويمكن إرجاعه لاحقاً.'}
                            </div>
                            <div className="mt-4">
                                <label className="block text-white/70 text-sm mb-2">سبب الأرشفة</label>
                                <textarea
                                    value={archiveModal.reason}
                                    onChange={(e) => onArchiveReasonChange(e.target.value)}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#E6C673] focus:outline-none"
                                    placeholder="مثال: اكتسب الدرجة القطعية / تم استرداد الحقوق / لا يوجد إجراء متبقٍ..."
                                />
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onCloseArchive}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all"
                                >
                                    {archiveModal.mode === 'auto' ? 'لاحقاً' : 'إغلاق'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onConfirmArchive}
                                    className="px-4 py-2 rounded-lg bg-[#E6C673] text-[#0B1021] text-sm font-extrabold hover:opacity-90 transition-all"
                                >
                                    تأكيد الأرشفة
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                {trashModal.isOpen ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`${URGENT_DOSSIER_DIALOG_OVERLAY} z-[120]`}
                        onClick={onCloseTrash}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className={URGENT_DOSSIER_DIALOG_PANEL}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-white font-extrabold text-sm">نقل إلى سلة المهملات</div>
                            <div className="text-white/60 text-xs mt-1 leading-relaxed">
                                لن يتم حذف الملف نهائياً، ويمكن استعادته لاحقاً.
                            </div>
                            <div className="mt-4">
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">
                                    سبب الحذف (اختياري)
                                </label>
                                <textarea
                                    value={trashModal.reason}
                                    onChange={(e) => onTrashReasonChange(e.target.value)}
                                    rows={3}
                                    className={`${URGENT_DOSSIER_INPUT} resize-y min-h-[80px] py-2`}
                                />
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onCloseTrash}
                                    className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[40px] py-2 text-xs`}
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={onConfirmTrash}
                                    className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[40px] py-2 text-xs`}
                                >
                                    نقل إلى سلة المهملات
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                {permanentDeleteModal.isOpen ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`${URGENT_DOSSIER_DIALOG_OVERLAY} z-[120]`}
                        onClick={onClosePermanentDelete}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className={URGENT_DOSSIER_DIALOG_PANEL}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-white font-extrabold text-sm">حذف نهائي</div>
                            <div className="text-white/60 text-xs mt-1 leading-relaxed">
                                سيتم حذف الملف نهائياً من سلة المهملات ولا يمكن استعادته بعد ذلك.
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onClosePermanentDelete}
                                    className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[40px] py-2 text-xs`}
                                >
                                    إغلاق
                                </button>
                                <button
                                    type="button"
                                    onClick={onConfirmPermanentDelete}
                                    disabled={permanentDeleteModal.countdown > 0}
                                    className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[40px] py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {permanentDeleteModal.countdown > 0
                                        ? `انتظر ${permanentDeleteModal.countdown} ثواني`
                                        : 'حذف نهائي'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </>
    );
}
