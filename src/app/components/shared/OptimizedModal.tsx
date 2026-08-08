/**
 * 🎭 Optimized Modal Component
 * مودال محسّن مع رسوم متحركة سلسة
 */

import React, { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { slideFromBottom, modalBackdrop } from '@/app/animations/transitions';
import { X } from '@/app/components/ui/lucideIcons';

interface OptimizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

const OptimizedModalComponent: React.FC<OptimizedModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  className = '',
  showCloseButton = true,
  closeOnBackdrop = true
}) => {
  
  // Lock scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
          {...modalBackdrop}
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <motion.div
            className={`relative w-full sm:max-w-lg bg-[#0D0D1A] border border-[#DAA520]/20 sm:rounded-3xl overflow-hidden ${className}`}
            {...slideFromBottom}
            onClick={handleContentClick}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-[#DAA520]/20">
                {title && (
                  <h3 className="text-xl font-bold text-[#DAA520]">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button type="button"
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-[#DAA520]/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const OptimizedModal = memo(OptimizedModalComponent);
