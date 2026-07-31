import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { X } from 'lucide-react';
import {
    FORUM_FIELD_LABEL,
    FORUM_ICON_BTN,
    FORUM_PANEL,
    FORUM_PUBLISH_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_SURFACE_INPUT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import '../forumPlumChrome.css';

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

    if (typeof document === 'undefined') return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <>
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 z-[100]"
                        aria-hidden
                    />
                    <motion.div
                        initial={reduceMotion ? false : { y: '100%' }}
                        animate={{ y: 0 }}
                        exit={reduceMotion ? undefined : { y: '100%' }}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed bottom-0 left-0 right-0 z-[100] ${FORUM_PANEL} rounded-t-[24px] p-6 shadow-2xl border-t border-white/[0.1] pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-group-title"
                    >
                        <form onSubmit={handleSubmit}>
                            <div className="flex items-center justify-between mb-5">
                                <h2 id="create-group-title" className={`${FORUM_TEXT_PRIMARY} text-lg font-bold`}>
                                    إنشاء مجموعة تخصصية
                                </h2>
                                <button type="button" onClick={onClose} className={FORUM_ICON_BTN} aria-label="إغلاق">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-5">
                                <div>
                                    <label htmlFor="forum-create-group-name" className={FORUM_FIELD_LABEL}>
                                        اسم المجموعة
                                    </label>
                                    <input
                                        id="forum-create-group-name"
                                        value={name}
                                        onChange={(e) => onNameChange(e.target.value)}
                                        className={`w-full h-12 ${FORUM_SURFACE_INPUT} rounded-xl px-4 text-sm`}
                                        placeholder="مثال: محامو بداءة الديوانية"
                                        maxLength={120}
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="forum-create-group-desc" className={FORUM_FIELD_LABEL}>
                                        وصف المجموعة{' '}
                                        <span className={`${FORUM_TEXT_MUTED} font-normal`}>(اختياري)</span>
                                    </label>
                                    <textarea
                                        id="forum-create-group-desc"
                                        value={description}
                                        onChange={(e) => onDescriptionChange(e.target.value)}
                                        className={`w-full h-28 ${FORUM_SURFACE_INPUT} rounded-xl p-4 resize-none text-sm`}
                                        placeholder="التخصص أو موضوع الغرفة النقاشية…"
                                        maxLength={600}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full h-[52px] rounded-xl font-bold text-lg touch-manipulation ${
                                    submitting ? FORUM_PUBLISH_BTN_DISABLED : FORUM_PUBLISH_BTN
                                }`}
                            >
                                {submitting ? 'جاري الإنشاء…' : 'إنشاء المجموعة'}
                            </button>
                        </form>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>,
        document.body,
    );
}
