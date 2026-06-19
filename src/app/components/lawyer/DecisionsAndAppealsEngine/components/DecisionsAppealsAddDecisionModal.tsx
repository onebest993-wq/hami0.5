import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

export type DecisionsAppealsAddDecisionModalProps = {
    showAddModal: boolean;
    setShowAddModal: (v: boolean) => void;
    resetAddDecisionForm: () => void;
    newTitle: string;
    setNewTitle: (v: string) => void;
    newDate: string;
    setNewDate: (v: string) => void;
    newBody: string;
    setNewBody: (v: string) => void;
    handleAddDecision: () => void;
    decisionBtnPrimaryWFull: string;
};

export function DecisionsAppealsAddDecisionModal({
    showAddModal,
    setShowAddModal,
    resetAddDecisionForm,
    newTitle,
    setNewTitle,
    newDate,
    setNewDate,
    newBody,
    setNewBody,
    handleAddDecision,
    decisionBtnPrimaryWFull,
}: DecisionsAppealsAddDecisionModalProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
                                    {showAddModal && (
                                        <motion.div
                                            key="decisions-add-overlay"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-2xl"
                                            style={{ zIndex: EXEC_MODAL_Z.nestedOverDecisions }}
                                            role="presentation"
                                            onClick={(e) => {
                                                if (e.target === e.currentTarget) {
                                                    resetAddDecisionForm();
                                                    setShowAddModal(false);
                                                }
                                            }}
                                        >
                                            <motion.div
                                                initial={{ scale: 0.94, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.94, opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="my-auto flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/50 shadow-2xl backdrop-blur-2xl"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-4">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            resetAddDecisionForm();
                                                            setShowAddModal(false);
                                                        }}
                                                        className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5"
                                                        aria-label="إغلاق"
                                                    >
                                                        <X size={20} className="text-slate-100" />
                                                    </button>
                                                    <h2 className="flex flex-1 items-center justify-end gap-2 text-right text-lg font-bold text-gray-100">
                                                        إضافة قرار منفذ العدل
                                                    </h2>
                                                </div>
            
                                                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-gray-400">
                                                            عنوان القرار *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={newTitle}
                                                            onChange={(e) => setNewTitle(e.target.value)}
                                                            className="w-full border-b border-white/10 bg-transparent py-2.5 text-right text-gray-100 outline-none focus:border-purple-500/40"
                                                            placeholder=""
                                                        />
                                                    </div>
            
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-gray-400">
                                                            تاريخ القرار *
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={newDate}
                                                            onChange={(e) => setNewDate(e.target.value)}
                                                            className="w-full border-b border-white/10 bg-transparent py-2.5 text-gray-100 outline-none focus:border-purple-500/40"
                                                            style={{ direction: 'ltr', textAlign: 'right' }}
                                                        />
                                                    </div>
            
                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold text-gray-400">
                                                            تفاصيل القرار (اختياري)
                                                        </label>
                                                        <textarea
                                                            value={newBody}
                                                            onChange={(e) => setNewBody(e.target.value)}
                                                            className="min-h-[120px] max-h-[40vh] w-full resize-y border-b border-white/10 bg-transparent py-2.5 text-right text-gray-100 outline-none focus:border-purple-500/40"
                                                            placeholder="اكتب ملخصاً للقرار أو منطوقه..."
                                                        />
                                                    </div>
            
                                                    <button
                                                        type="button"
                                                        onClick={handleAddDecision}
                                                        className={decisionBtnPrimaryWFull}
                                                    >
                                                        حفظ القرار
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
        </AnimatePresence>,
        document.body,
    );
}
