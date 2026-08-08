import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '@/app/components/ui/lucideIcons';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { FORUM_ICON_BTN } from '../forumPlumTheme';

interface FullscreenImageOverlayProps {
    imageUrl: string | null;
    onClose: () => void;
}

export const FullscreenImageOverlay = ({ imageUrl, onClose }: FullscreenImageOverlayProps) => {
    const reduceMotion = useReduceMotion();

    return (
        <AnimatePresence>
            {imageUrl && (
                <motion.div
                    data-testid="forum-fullscreen-image"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                    onClick={onClose}
                >
                    <button type="button"
                        className={`absolute top-[max(1.5rem,env(safe-area-inset-top))] right-[max(1.5rem,env(safe-area-inset-right))] ${FORUM_ICON_BTN} bg-white/10 text-white hover:bg-white/20 z-50`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        <X size={24} />
                    </button>

                    <motion.div
                        initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={reduceMotion ? undefined : { scale: 0.9, opacity: 0 }}
                        className="max-w-full max-h-full relative rounded-lg overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ImageWithFallback
                            src={imageUrl}
                            alt="Full Screen Attachment"
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
