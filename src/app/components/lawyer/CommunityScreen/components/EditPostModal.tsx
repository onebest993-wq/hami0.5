import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import {
    FORUM_GHOST_BTN,
    FORUM_ICON_BTN,
    FORUM_MODAL,
    FORUM_PUBLISH_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_SURFACE_INPUT,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        key="edit-modal"
                        data-testid="forum-edit-post-modal"
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 14, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className={`w-full max-w-xl ${FORUM_MODAL} p-6 pointer-events-auto`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg`}>تعديل المنشور</h3>
                                <button type="button" onClick={onCancel} className={`w-9 h-9 ${FORUM_ICON_BTN}`}>
                                    <X size={18} />
                                </button>
                            </div>
                            <textarea
                                value={editingText}
                                onChange={(e) => onTextChange(e.target.value)}
                                className={`w-full h-40 rounded-2xl p-4 resize-none text-sm ${FORUM_SURFACE_INPUT}`}
                                placeholder="حدّث نص المنشور..."
                            />
                            <div className="mt-5 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className={`flex-1 h-12 ${FORUM_GHOST_BTN} font-bold`}
                                    disabled={savingEdit}
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void onSave()}
                                    className={`flex-1 h-12 rounded-xl font-bold ${
                                        savingEdit ? FORUM_PUBLISH_BTN_DISABLED : FORUM_PUBLISH_BTN
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
