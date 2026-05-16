import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface FullscreenImageOverlayProps {
    imageUrl: string | null;
    onClose: () => void;
}

export const FullscreenImageOverlay = ({ imageUrl, onClose }: FullscreenImageOverlayProps) => {
    return (
        <AnimatePresence>
            {imageUrl && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <button type="button"
                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        <X size={24} />
                    </button>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
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
