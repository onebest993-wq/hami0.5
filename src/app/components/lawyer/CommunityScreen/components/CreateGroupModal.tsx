import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useCommunitySheetChrome } from '@/app/hooks/useCommunitySheetChrome';
import { X } from '@/app/components/ui/icons/X';
import { ForumSheetSwipeHandle } from './ForumSheetSwipeHandle';
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
import { getForumOverlayPortalRoot } from '../forumOverlayPortal';

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
    const { sheetStyle } = useCommunitySheetChrome(isOpen);

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
                        className="fixed inset-0 bg-black/70 z-[120] pointer-events-auto"
                        aria-hidden
                    />
                    <motion.div
                        initial={reduceMotion ? false : { y: '100%' }}
                        animate={{ y: 0 }}
                        exit={reduceMotion ? undefined : { y: '100%' }}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
                        style={sheetStyle}
                        className={`fixed bottom-0 left-0 right-0 z-[120] pointer-events-auto ${FORUM_PANEL} rounded-t-[24px] p-5 sm:p-6 border-t border-white/[0.1] pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[min(92dvh,100%)] overflow-y-auto`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-group-title"
                    >
                        <form onSubmit={handleSubmit}>
                            <ForumSheetSwipeHandle onClose={onClose} />
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
                                        className={`w-full h-12 ${FORUM_SURFACE_INPUT} rounded-xl px-4`}
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
                                        className={`w-full h-28 ${FORUM_SURFACE_INPUT} rounded-xl p-4 resize-none`}
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
        getForumOverlayPortalRoot(),
    );
}
