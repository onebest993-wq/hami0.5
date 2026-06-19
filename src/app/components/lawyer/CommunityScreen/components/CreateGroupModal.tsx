import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { FORUM_PANEL, FORUM_PUBLISH_BTN, FORUM_PUBLISH_BTN_DISABLED, FORUM_SURFACE_INPUT } from '../forumPlumTheme';

interface CreateGroupModalProps {
    isOpen: boolean;
    name: string;
    description: string;
    submitting: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onSubmit: () => void;
    onClose: () => void;
}

export function CreateGroupModal({
    isOpen,
    name,
    description,
    submitting,
    onNameChange,
    onDescriptionChange,
    onSubmit,
    onClose,
}: CreateGroupModalProps) {
    return (
        <AnimatePresence>
            {isOpen ? (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed bottom-0 left-0 right-0 z-[80] ${FORUM_PANEL} rounded-t-[24px] p-6 shadow-2xl border-t border-[#4A3D52]/50`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white text-lg font-bold">إنشاء مجموعة تخصصية</h2>
                            <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3 mb-5">
                            <input
                                value={name}
                                onChange={(e) => onNameChange(e.target.value)}
                                className={`w-full h-12 ${FORUM_SURFACE_INPUT} rounded-xl px-4 text-sm`}
                                placeholder="اسم المجموعة (مثال: محامو بداءة الديوانية)"
                                maxLength={120}
                            />
                            <textarea
                                value={description}
                                onChange={(e) => onDescriptionChange(e.target.value)}
                                className={`w-full h-28 ${FORUM_SURFACE_INPUT} rounded-xl p-4 resize-none text-sm`}
                                placeholder="التخصص أو وصف الغرفة النقاشية..."
                                maxLength={600}
                            />
                        </div>

                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => void onSubmit()}
                            className={`w-full h-[52px] rounded-xl font-bold text-lg ${
                                submitting ? FORUM_PUBLISH_BTN_DISABLED : FORUM_PUBLISH_BTN
                            }`}
                        >
                            {submitting ? 'جاري الإنشاء…' : 'إنشاء المجموعة'}
                        </button>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );
}
