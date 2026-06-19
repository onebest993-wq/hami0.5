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
  success: (message: string, duration?: number) =>
    SmartToast.show(message, { type: 'success', ...(duration !== undefined ? { duration } : {}) }),
  error: (message: string, duration?: number) =>
    SmartToast.show(message, { type: 'error', ...(duration !== undefined ? { duration } : {}) }),
  warning: (message: string, duration?: number) =>
    SmartToast.show(message, { type: 'warning', ...(duration !== undefined ? { duration } : {}) }),
  loading: (message: string, duration?: number) =>
    SmartToast.show(message, {
      type: 'loading',
      icon: Sparkles,
      ...(duration !== undefined ? { duration } : {}),
    }),
  info: (message: string, duration?: number) =>
    SmartToast.show(message, { type: 'info', ...(duration !== undefined ? { duration } : {}) }),
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
    let colorClass = 'text-[#E6C673]';
    let btnClass = 'bg-[#E6C673]/15 hover:bg-[#E6C673]/25 border-[#E6C673]/30 text-[#E6C673]';

    let accentBorder = 'border-[#E6C673]/20';
    let iconGlow = 'text-[#E6C673]';

    switch (toast.type) {
        case 'success':
            IconComp = CheckCircle;
            colorClass = 'text-emerald-400';
            accentBorder = 'border-emerald-400/25';
            iconGlow = 'text-emerald-400';
            btnClass = 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30 text-emerald-100';
            break;
        case 'error':
            IconComp = AlertCircle;
            colorClass = 'text-rose-400';
            accentBorder = 'border-rose-400/25';
            iconGlow = 'text-rose-400';
            btnClass = 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/30 text-rose-100';
            break;
        case 'warning':
            IconComp = AlertCircle;
            colorClass = 'text-amber-400';
            accentBorder = 'border-amber-400/25';
            iconGlow = 'text-amber-400';
            btnClass = 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/30 text-amber-100';
            break;
        case 'loading':
            IconComp = Sparkles;
            colorClass = 'text-sky-300';
            accentBorder = 'border-sky-400/25';
            iconGlow = 'text-sky-300';
            btnClass = 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/30 text-sky-100';
            break;
        default:
            accentBorder = 'border-[#E6C673]/20';
            iconGlow = 'text-[#E6C673]';
            btnClass = 'bg-[#E6C673]/15 hover:bg-[#E6C673]/25 border-[#E6C673]/30 text-[#E6C673]';
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
        renderedIcon = <IconComp size={18} className={iconGlow} strokeWidth={1.75} />;
    }

    const containerClasses = `
        flex items-center gap-3 px-5 py-3.5 min-w-[220px]
        bg-[#0A0F1C]/80 backdrop-blur-2xl
        rounded-2xl border ${accentBorder}
        shadow-[0_12px_48px_rgba(0,0,0,0.5)]
        bg-gradient-to-l from-white/[0.04] via-transparent to-transparent
    `;

    return (
        <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.5 }}
            animate={{ y: 'calc(env(safe-area-inset-top, 0px) + 7.5rem)', opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
            className="pointer-events-auto absolute"
        >
             <div className={containerClasses}>
                {renderedIcon}
                <div className="flex flex-col">
                    <span className={`text-sm font-bold whitespace-nowrap ${colorClass}`}>{toast.message}</span>
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
