import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { Info } from '@/app/components/ui/icons/Info';
import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { X } from '@/app/components/ui/icons/X';
import { subscribeSmartToast, type ToastEvent } from '@/app/components/ui/smartToastBus';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

const MAX_STACK = 3;
const DEFAULT_DURATION = 2_800;

type ToastStyle = {
    IconComp: React.ElementType;
    accentBorder: string;
    iconGlow: string;
    titleClass: string;
    btnClass: string;
    progressClass: string;
    iconWrap: string;
};

function resolveToastStyle(type: ToastEvent['type']): ToastStyle {
    switch (type) {
        case 'success':
            return {
                IconComp: CheckCircle,
                accentBorder: 'border-emerald-400/30',
                iconGlow: 'text-emerald-400',
                titleClass: 'text-emerald-50',
                btnClass:
                    'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30 text-emerald-100',
                progressClass: 'bg-emerald-400/70',
                iconWrap: 'bg-emerald-500/15 border-emerald-400/25',
            };
        case 'error':
            return {
                IconComp: AlertCircle,
                accentBorder: 'border-rose-400/30',
                iconGlow: 'text-rose-400',
                titleClass: 'text-rose-50',
                btnClass: 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/30 text-rose-100',
                progressClass: 'bg-rose-400/70',
                iconWrap: 'bg-rose-500/15 border-rose-400/25',
            };
        case 'warning':
            return {
                IconComp: AlertCircle,
                accentBorder: 'border-amber-400/30',
                iconGlow: 'text-amber-400',
                titleClass: 'text-amber-50',
                btnClass: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/30 text-amber-100',
                progressClass: 'bg-amber-400/70',
                iconWrap: 'bg-amber-500/15 border-amber-400/25',
            };
        case 'loading':
            return {
                IconComp: Sparkles,
                accentBorder: 'border-sky-400/30',
                iconGlow: 'text-sky-300',
                titleClass: 'text-sky-50',
                btnClass: 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/30 text-sky-100',
                progressClass: 'bg-sky-400/70',
                iconWrap: 'bg-sky-500/15 border-sky-400/25',
            };
        default:
            return {
                IconComp: Info,
                accentBorder: 'border-[#E6C673]/30',
                iconGlow: 'text-[#E6C673]',
                titleClass: 'text-white',
                btnClass:
                    'bg-[#E6C673]/15 hover:bg-[#E6C673]/25 border-[#E6C673]/30 text-[#E6C673]',
                progressClass: 'bg-[#E6C673]/75',
                iconWrap: 'bg-[#E6C673]/12 border-[#E6C673]/25',
            };
    }
}

const SmartToastItem = React.forwardRef<
    HTMLDivElement,
    {
        toast: ToastEvent;
        reduceMotion: boolean;
        onDismiss: (id: string) => void;
    }
>(function SmartToastItem({ toast, reduceMotion, onDismiss }, ref) {
    const style = resolveToastStyle(toast.type);
    const { IconComp } = style;
    const duration = toast.duration === Infinity ? null : (toast.duration ?? DEFAULT_DURATION);

    const actionButton =
        toast.action &&
        typeof toast.action === 'object' &&
        'onClick' in toast.action &&
        'label' in toast.action
            ? toast.action
            : null;

    let renderedIcon: React.ReactNode;
    if (toast.icon) {
        if (
            typeof toast.icon === 'function' ||
            (typeof toast.icon === 'object' && toast.icon !== null && 'render' in toast.icon)
        ) {
            const CustomIcon = toast.icon as React.ElementType;
            renderedIcon = <CustomIcon size={18} className={style.iconGlow} />;
        } else {
            renderedIcon = <span className="text-lg leading-none">{toast.icon as React.ReactNode}</span>;
        }
    } else {
        renderedIcon = <IconComp size={18} className={style.iconGlow} strokeWidth={1.75} />;
    }

    return (
        <motion.div
            ref={ref}
            layout={reduceMotion ? false : true}
            initial={reduceMotion ? false : { opacity: 0, y: -16, x: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10, x: 16, scale: 0.96 }}
            transition={
                reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring' as const, stiffness: 420, damping: 30 }
            }
            drag={reduceMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
                if (info.offset.x > 64 || info.velocity.x > 380) onDismiss(toast.id);
            }}
            className="pointer-events-auto w-full"
            data-testid="smart-toast-item"
        >
            <div
                className={`relative overflow-hidden rounded-2xl border ${style.accentBorder} bg-[#0A0F1C]/90 backdrop-blur-2xl shadow-[0_18px_56px_rgba(0,0,0,0.55)]`}
            >
                <div className="flex items-start gap-3 px-4 py-3.5">
                    <div
                        className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${style.iconWrap}`}
                    >
                        {renderedIcon}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <p className={`text-sm font-bold leading-snug ${style.titleClass}`}>{toast.message}</p>
                        {toast.description ? (
                            <p className="text-white/55 text-xs mt-1 leading-relaxed">{toast.description}</p>
                        ) : null}
                        {actionButton ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    actionButton.onClick();
                                }}
                                className={`mt-2.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${style.btnClass}`}
                            >
                                {actionButton.label}
                            </button>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={() => onDismiss(toast.id)}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/5 transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                </div>
                {duration ? (
                    <motion.div
                        className={`h-0.5 ${style.progressClass} origin-right`}
                        initial={{ scaleX: 1 }}
                        animate={{ scaleX: 0 }}
                        transition={{ duration: duration / 1000, ease: 'linear' }}
                        aria-hidden
                    />
                ) : null}
            </div>
        </motion.div>
    );
});

export function SmartToastContainer() {
    const reduceMotion = useReduceMotion();
    const [toasts, setToasts] = useState<ToastEvent[]>([]);
    const timersRef = useRef<Map<string, number>>(new Map());

    const clearTimer = (id: string) => {
        const t = timersRef.current.get(id);
        if (t !== undefined) {
            window.clearTimeout(t);
            timersRef.current.delete(id);
        }
    };

    const dismiss = (id: string) => {
        clearTimer(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    useEffect(() => {
        return subscribeSmartToast((newToast) => {
            if (newToast.intent === 'dismiss') {
                dismiss(newToast.id);
                return;
            }

            setToasts((prev) => {
                const withoutDup = prev.filter((t) => t.id !== newToast.id);
                const next = [newToast, ...withoutDup].slice(0, MAX_STACK);
                return next;
            });

            if (newToast.duration !== Infinity) {
                clearTimer(newToast.id);
                const ms = newToast.duration ?? DEFAULT_DURATION;
                const t = window.setTimeout(() => dismiss(newToast.id), ms);
                timersRef.current.set(newToast.id, t);
            }
        });
    }, []);

    useEffect(() => {
        return () => {
            for (const t of timersRef.current.values()) window.clearTimeout(t);
            timersRef.current.clear();
        };
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed z-[99999] inset-x-4 top-[max(12px,env(safe-area-inset-top))] sm:inset-x-auto sm:end-4 sm:w-[min(100%,380px)] flex flex-col gap-2.5 pointer-events-none"
            dir="rtl"
            data-testid="smart-toast-stack"
        >
            <AnimatePresence initial={false} mode="popLayout">
                {toasts.map((toast) => (
                    <SmartToastItem
                        key={toast.id}
                        toast={toast}
                        reduceMotion={reduceMotion}
                        onDismiss={dismiss}
                    />
                ))}
            </AnimatePresence>
        </div>,
        document.body,
    );
}
