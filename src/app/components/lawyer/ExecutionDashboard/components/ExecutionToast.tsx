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
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ExecutionToastProps {
    /** حالة ظهور الإشعار */
    visible: boolean;
    /** الرسالة المعروضة */
    message: React.ReactNode;
    /** نوع الإشعار */
    type: 'success' | 'error' | 'warning' | 'info';
    /** إجراء اختياري */
    action?: ToastAction;
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
    action,
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
                    button: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100',
                };
            case 'error':
                return {
                    container: 'bg-rose-500/[0.08] border-rose-500/30 shadow-rose-500/20',
                    icon: <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />,
                    button: 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/30 text-rose-100',
                };
            case 'warning':
                return {
                    container: 'bg-amber-500/[0.08] border-amber-500/30 shadow-amber-500/20',
                    icon: <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />,
                    button: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-100',
                };
            case 'info':
            default:
                return {
                    container: 'bg-blue-500/[0.08] border-blue-500/30 shadow-blue-500/20',
                    icon: <AlertCircle size={20} className="text-blue-400 shrink-0 mt-0.5" />,
                    button: 'bg-blue-500/20 hover:bg-blue-600/30 border-blue-500/30 text-blue-100',
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
                        className={`backdrop-blur-2xl rounded-2xl p-4 shadow-2xl border ${styles.container}`}
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
                            {action && (
                                <div className="flex justify-center pt-2 border-t border-white/5 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => action.onClick()}
                                        className={`w-full py-2.5 rounded-xl backdrop-blur-md text-[11px] font-black transition-all border shadow-lg flex items-center justify-center gap-2 ${styles.button}`}
                                    >
                                        {action.label}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};