import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { X } from 'lucide-react';
import { FORUM_PANEL, FORUM_PUBLISH_BTN, FORUM_PUBLISH_BTN_DISABLED, FORUM_SURFACE_INPUT, FORUM_ICON_BTN } from '../forumPlumTheme';

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
    const reduceMotion = useReduceMotion();

    return (
        <AnimatePresence>
            {isOpen ? (
                <>
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                    />
                    <motion.div
                        initial={reduceMotion ? false : { y: '100%' }}
                        animate={{ y: 0 }}
                        exit={reduceMotion ? undefined : { y: '100%' }}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed bottom-0 left-0 right-0 z-[80] ${FORUM_PANEL} rounded-t-[24px] p-6 shadow-2xl border-t border-[#4A3D52]/50 pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white text-lg font-bold">إنشاء مجموعة تخصصية</h2>
                            <button type="button" onClick={onClose} className={FORUM_ICON_BTN} aria-label="إغلاق">
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
