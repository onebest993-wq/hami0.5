import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, Sparkles, X, Fingerprint } from 'lucide-react';

// Types
type ToastType = 'success' | 'error' | 'warning' | 'loading' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  icon?: React.ElementType | React.ReactNode; 
  duration?: number;
  id?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** حدث الحافلة — `intent` للتحكم الداخلي؛ `action` من ToastOptions لزر اختياري فقط */
interface ToastEvent extends ToastOptions {
  id: string;
  intent?: 'show' | 'dismiss';
}

// Event Bus
const listeners = new Set<(toast: ToastEvent) => void>();

export const SmartToast = {
  show: (message: string, options: Partial<ToastOptions> = {}) => {
    const id = options.id || (Date.now().toString() + Math.random().toString());
    const event: ToastEvent = {
        message,
        type: 'info',
        id,
        duration: 2500,
        intent: 'show',
        ...options,
    };
    listeners.forEach(l => l(event));
    return id;
  },
  success: (message: string, duration?: number) => SmartToast.show(message, { type: 'success', duration }),
  error: (message: string, duration?: number) => SmartToast.show(message, { type: 'error', duration }),
  warning: (message: string, duration?: number) => SmartToast.show(message, { type: 'warning', duration }),
  loading: (message: string, duration?: number) => SmartToast.show(message, { type: 'loading', duration, icon: Sparkles }),
  info: (message: string, duration?: number) => SmartToast.show(message, { type: 'info', duration }),
  dismiss: (id: string) => {
     const event: ToastEvent = { id, message: '', intent: 'dismiss' };
     listeners.forEach(l => l(event));
  }
};

export const SmartToastContainer = () => {
    const [toasts, setToasts] = useState<ToastEvent[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleToast = (newToast: ToastEvent) => {
            if (newToast.intent === 'dismiss') {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
                return;
            }

            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            setToasts([newToast]);
            
            if (newToast.duration !== Infinity) {
                timerRef.current = setTimeout(() => {
                    timerRef.current = null;
                    setToasts(prev => prev.filter(t => t.id !== newToast.id));
                }, newToast.duration || 2500);
            }
        };

        listeners.add(handleToast);
        return () => {
            listeners.delete(handleToast);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed top-0 left-0 right-0 z-[99999] flex justify-center pointer-events-none">
            <AnimatePresence mode='wait'>
                {toasts.map((toast) => (
                    <SmartToastItem key={toast.id} toast={toast} />
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
};

const SmartToastItem = ({ toast }: { toast: ToastEvent }) => {
    const actionButton =
        toast.action &&
        typeof toast.action === 'object' &&
        'onClick' in toast.action &&
        'label' in toast.action
            ? toast.action
            : null;

    // Icon Logic
    let IconComp: React.ElementType = Info;
    let colorClass = 'text-blue-400';
    let accentBg = 'bg-blue-500/[0.08]';
    let borderClass = 'border-blue-500/30';
    let shadowClass = 'shadow-blue-500/20';
    let btnClass = 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-100';

    switch (toast.type) {
        case 'success':
            IconComp = CheckCircle;
            colorClass = 'text-emerald-400';
            accentBg = 'bg-emerald-500/[0.08]';
            borderClass = 'border-emerald-500/30';
            shadowClass = 'shadow-emerald-500/20';
            btnClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100';
            break;
        case 'error':
            IconComp = AlertCircle;
            colorClass = 'text-rose-400';
            accentBg = 'bg-rose-500/[0.08]';
            borderClass = 'border-rose-500/30';
            shadowClass = 'shadow-rose-500/20';
            btnClass = 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/30 text-rose-100';
            break;
        case 'warning':
            IconComp = AlertCircle;
            colorClass = 'text-amber-400';
            accentBg = 'bg-amber-500/[0.08]';
            borderClass = 'border-amber-500/30';
            shadowClass = 'shadow-amber-500/20';
            btnClass = 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-100';
            break;
        case 'loading':
            IconComp = Sparkles;
            colorClass = 'text-blue-300';
            accentBg = 'bg-blue-500/[0.08]';
            borderClass = 'border-blue-500/30';
            shadowClass = 'shadow-blue-500/20';
            btnClass = 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-100';
            break;
    }

    let renderedIcon;
    if (toast.icon) {
        if (typeof toast.icon === 'function' || (typeof toast.icon === 'object' && toast.icon !== null && 'render' in toast.icon)) {
             // It is a component
             const CustomIcon = toast.icon as React.ElementType;
             renderedIcon = <CustomIcon size={18} className={colorClass} />;
        } else {
             // It is a node (string, number, element)
             renderedIcon = <span className="text-lg leading-none">{toast.icon as React.ReactNode}</span>;
        }
    } else {
        renderedIcon = <IconComp size={18} className={colorClass} />;
    }

    let containerClasses = `
        flex items-center gap-3 px-5 py-3 
        ${accentBg} backdrop-blur-2xl 
        rounded-2xl border ${borderClass} 
        shadow-2xl ${shadowClass}
    `;

    return (
        <motion.div
            layout
            initial={{ y: -50, opacity: 0, scale: 0.5 }}
            animate={{ y: 100, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
            className="pointer-events-auto absolute"
        >
             <div className={containerClasses}>
                {renderedIcon}
                <div className="flex flex-col">
                    <span className={`text-sm font-bold whitespace-nowrap ${toast.type === 'error' ? 'text-rose-400' : 'text-white'}`}>{toast.message}</span>
                    {toast.description && (
                        <span className="text-white/60 text-[10px] whitespace-nowrap">{toast.description}</span>
                    )}
                </div>
                {actionButton ? (
                    <button type="button" 
                        onClick={(e) => {
                            e.stopPropagation();
                            actionButton.onClick();
                        }}
                        className={`mr-3 px-4 py-1.5 backdrop-blur-md rounded-xl text-xs font-black transition-all border shadow-lg flex items-center gap-2 ${btnClass}`}
                    >
                        {actionButton.label}
                    </button>
                ) : null}
                {/* Ã¢Å“â€¦ CRITICAL UI FIX: NOTIFICATION DISMISSAL ACTION */}
                <button type="button"
                    onClick={() => SmartToast.dismiss(toast.id)}
                    className="ml-2 text-gray-400 hover:text-white transition-colors opacity-70 hover:opacity-100"
                    title="إغلاق"
                >
                    <X size={16} />
                </button>
             </div>
        </motion.div>
    );
}
