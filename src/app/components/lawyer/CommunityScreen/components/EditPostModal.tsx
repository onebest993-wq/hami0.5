import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';

interface EditPostModalProps {
    editingPostId: string | null;
    editingText: string;
    onTextChange: (text: string) => void;
    onSave: () => void;
    onCancel: () => void;
    savingEdit: boolean;
}

export const EditPostModal = ({ editingPostId, editingText, onTextChange, onSave, onCancel, savingEdit }: EditPostModalProps) => {
    return (
        <AnimatePresence>
            {editingPostId && (
                <>
                    <motion.div
                        key="edit-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
                    />
                    <motion.div
                        key="edit-modal"
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 14, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-xl bg-[#25293C] rounded-3xl border border-white/10 shadow-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">تعديل المنشور</h3>
                                <button type="button"
                                    onClick={onCancel}
                                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <textarea
                                value={editingText}
                                onChange={(e) => onTextChange(e.target.value)}
                                className="w-full h-40 bg-[#151822] text-white rounded-2xl p-4 border border-white/10 focus:border-[#E6C673]/40 focus:outline-none resize-none placeholder-white/30 text-sm"
                                placeholder="حدّث نص المنشور..."
                            />
                            <div className="mt-5 flex gap-3">
                                <button type="button"
                                    onClick={onCancel}
                                    className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold transition-colors"
                                    disabled={savingEdit}
                                >
                                    إلغاء
                                </button>
                                <button type="button"
                                    onClick={() => void onSave()}
                                    className={`flex-1 h-12 rounded-xl font-bold transition-colors ${
                                        savingEdit ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-[#E6C673] hover:bg-[#d4b560] text-black'
                                    }`}
                                    disabled={savingEdit}
                                >
                                    {savingEdit ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin" />
                                            جاري الحفظ...
                                        </span>
                                    ) : (
                                        'حفظ'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
