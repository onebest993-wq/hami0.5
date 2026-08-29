/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * â³ LoadingStates - Reusable Loading Components
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 
 * Collection of loading states for different contexts
 * Ù…Ø¬Ù…ÙˆØ¹Ø© Ù…Ù† Ø­Ø§Ù„Ø§Øª Ø§Ù„ØªØ­Ù…ÙŠÙ„ Ù„Ø³ÙŠØ§Ù‚Ø§Øª Ù…Ø®ØªÙ„ÙØ©
 * 
 * @version 1.0.0
 * @author Hami Legal System - UI Components
 */

import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Scale } from '@/app/components/ui/icons/Scale';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { Clock } from '@/app/components/ui/icons/Clock';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    className?: string;
}

export interface LoadingSkeletonProps {
    lines?: number;
    className?: string;
}

export interface LoadingOverlayProps {
    message?: string;
    transparent?: boolean;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOADING SPINNER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
    size = 'md',
    message,
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <Loader2 className={`${sizeClasses[size]} text-gold-500 animate-spin`} />
            {message && (
                <p className="text-sm text-gray-400 animate-pulse">{message}</p>
            )}
        </div>
    );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOADING SKELETON
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = React.memo(({
    lines = 3,
    className = ''
}) => {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
                <div
                    key={index}
                    className="h-4 bg-navy-700/50 rounded animate-pulse"
                    style={{
                        width: `${100 - (index * 10)}%`
                    }}
                />
            ))}
        </div>
    );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOADING OVERLAY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LoadingOverlay: React.FC<LoadingOverlayProps> = React.memo(({
    message = 'جاري التحميل...',
    transparent = false
}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center ${
                transparent ? 'bg-navy-900/60' : 'bg-navy-900/90'
            } backdrop-blur-sm`}
        >
            <div className="bg-navy-800 border border-navy-700 rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
                <p className="text-lg text-white font-semibold">{message}</p>
            </div>
        </motion.div>
    );
});

LoadingOverlay.displayName = 'LoadingOverlay';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LEGAL DOCUMENT LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LoadingDocument: React.FC<{ message?: string }> = React.memo(({
    message = 'جاري تحميل الوثيقة...'
}) => {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <motion.div
                animate={{
                    y: [0, -10, 0],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            >
                <FileText className="w-16 h-16 text-gold-500" />
            </motion.div>
            <p className="text-gray-400">{message}</p>
        </div>
    );
});

LoadingDocument.displayName = 'LoadingDocument';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LEGAL CASE LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LoadingCase: React.FC<{ message?: string }> = React.memo(({
    message = 'جاري تحميل القضية...'
}) => {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="relative">
                <motion.div
                    animate={{
                        rotate: 360
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                    className="absolute inset-0"
                >
                    <Scale className="w-16 h-16 text-gold-500/30" />
                </motion.div>
                <Scale className="w-16 h-16 text-gold-500" />
            </div>
            <p className="text-gray-400">{message}</p>
        </div>
    );
});

LoadingCase.displayName = 'LoadingCase';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXECUTION LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LoadingExecution: React.FC<{ message?: string }> = React.memo(({
    message = 'جاري تحميل ملف التنفيذ...'
}) => {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <motion.div
                animate={{
                    rotate: [0, 10, -10, 10, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            >
                <Gavel className="w-16 h-16 text-gold-500" />
            </motion.div>
            <p className="text-gray-400">{message}</p>
        </div>
    );
});

LoadingExecution.displayName = 'LoadingExecution';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PROCESSING LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LoadingProcessing: React.FC<{ message?: string }> = React.memo(({
    message = 'جاري المعالجة...'
}) => {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="relative">
                {[0, 1, 2].map((index) => (
                    <motion.div
                        key={index}
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.8, 0, 0.8]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.4,
                            ease: 'easeInOut'
                        }}
                    >
                        <div className="w-12 h-12 rounded-full border-4 border-gold-500" />
                    </motion.div>
                ))}
                <Clock className="w-12 h-12 text-gold-500 relative z-10" />
            </div>
            <p className="text-gray-400">{message}</p>
        </div>
    );
});

LoadingProcessing.displayName = 'LoadingProcessing';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INLINE LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const InlineLoading: React.FC<{ size?: 'sm' | 'md' }> = React.memo(({
    size = 'sm'
}) => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

    return (
        <Loader2 className={`${sizeClass} text-gold-500 animate-spin`} />
    );
});

InlineLoading.displayName = 'InlineLoading';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BUTTON LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const ButtonLoading: React.FC<{ 
    text?: string;
    loadingText?: string;
    isLoading?: boolean;
}> = React.memo(({
    text = 'حفظ',
    loadingText = 'جاري الحفظ...',
    isLoading = false
}) => {
    if (isLoading) {
        return (
            <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {loadingText}
            </span>
        );
    }

    return <span>{text}</span>;
});

ButtonLoading.displayName = 'ButtonLoading';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DOTS LOADING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const DotsLoading: React.FC = React.memo(() => {
    return (
        <div className="flex items-center justify-center gap-1">
            {[0, 1, 2].map((index) => (
                <motion.div
                    key={index}
                    className="w-2 h-2 bg-gold-500 rounded-full"
                    animate={{
                        y: [0, -8, 0],
                        opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: index * 0.15,
                        ease: 'easeInOut'
                    }}
                />
            ))}
        </div>
    );
});

DotsLoading.displayName = 'DotsLoading';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXPORTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default {
    LoadingSpinner,
    LoadingSkeleton,
    LoadingOverlay,
    LoadingDocument,
    LoadingCase,
    LoadingExecution,
    LoadingProcessing,
    InlineLoading,
    ButtonLoading,
    DotsLoading
};
