/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔔 Execution Toast - إشعارات التطبيق العائمة
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * مكون عرض الإشعارات العائمة (Toast Notifications) في لوحة التحكم
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionToastProps {
    /** حالة ظهور الإشعار */
    visible: boolean;
    /** الرسالة المعروضة */
    message: React.ReactNode;
    /** نوع الإشعار */
    type: 'success' | 'error' | 'warning' | 'info';
    /** معرف فريد للإشعار */
    epoch: number;
    /** دالة إغلاق الإشعار */
    onClose: () => void;
    /** مستوى الـ Z-index */
    zIndex: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * مكون الإشعارات العائمة (Toast Notifications)
 */
export const ExecutionToast: React.FC<ExecutionToastProps> = ({
    visible,
    message,
    type,
    epoch,
    onClose,
    zIndex,
}) => {
    // تحديد ألوان وأنماط بناءً على نوع الإشعار
    const getToastStyles = () => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-emerald-500/[0.08] border-emerald-500/30 shadow-emerald-500/20',
                    icon: <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />,
                };
            case 'error':
                return {
                    container: 'bg-rose-500/[0.08] border-rose-500/30 shadow-rose-500/20',
                    icon: <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />,
                };
            case 'warning':
                return {
                    container: 'bg-amber-500/[0.08] border-amber-500/30 shadow-amber-500/20',
                    icon: <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />,
                };
            case 'info':
            default:
                return {
                    container: 'bg-blue-500/[0.08] border-blue-500/30 shadow-blue-500/20',
                    icon: <AlertCircle size={20} className="text-blue-400 shrink-0 mt-0.5" />,
                };
        }
    };

    const styles = getToastStyles();

    // إذا لم يكن document متاحاً (في SSR)، لا نعرض شيئاً
    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <AnimatePresence initial={false}>
            {visible && (
                <motion.div
                    key={epoch}
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0, transition: { duration: 0.06 } }}
                    transition={{ duration: 0.12 }}
                    className="fixed top-4 right-4 max-w-md pointer-events-auto"
                    style={{ zIndex }}
                    dir="rtl"
                >
                    <div
                        className={`rounded-2xl p-3 shadow-md border ${styles.container}`}
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                                {styles.icon}
                                <div className="text-white text-sm font-medium flex-1 text-right leading-snug">
                                    {message}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-white shrink-0 transition-colors"
                                    aria-label="إغلاق الإشعار"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};