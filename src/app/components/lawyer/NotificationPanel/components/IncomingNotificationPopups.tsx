import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from '@/app/components/ui/lucideIcons';
import type { IncomingNotificationPopup } from '@/app/hooks/lawyerDashboard/useIncomingNotificationPopups';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { formatTimeShort } from '@/app/components/lawyer/NotificationPanel/utils/timeGrouping';

export type IncomingNotificationPopupsProps = {
    items: IncomingNotificationPopup[];
    onDismiss: (id: string) => void;
    onOpen: (id: string) => void;
};

function PopupCard({
    item,
    onDismiss,
    onOpen,
    reduceMotion,
}: {
    item: IncomingNotificationPopup;
    onDismiss: (id: string) => void;
    onOpen: (id: string) => void;
    reduceMotion: boolean;
}) {
    return (
        <motion.button
            type="button"
            layout={reduceMotion ? false : true}
            initial={reduceMotion ? false : { opacity: 0, x: 48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: 32, scale: 0.98 }}
            transition={
                reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring' as const, stiffness: 420, damping: 32 }
            }
            drag={reduceMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
                if (info.offset.x > 72 || info.velocity.x > 420) onDismiss(item.id);
            }}
            onClick={() => onOpen(item.id)}
            data-testid={`incoming-notification-popup-${item.id}`}
            className="group pointer-events-auto w-full text-right rounded-2xl border border-[#E6C673]/20 bg-[#0A0F1C]/92 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset] overflow-hidden touch-manipulation"
        >
            <div className="absolute inset-y-0 end-0 w-1 bg-gradient-to-b from-[#E6C673]/80 via-[#E6C673]/40 to-transparent" aria-hidden />
            <div className="relative px-4 py-3.5 flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#E6C673]/12 border border-[#E6C673]/25 flex items-center justify-center shadow-[0_0_20px_rgba(230,198,115,0.15)]">
                    <Bell size={18} className="text-[#E6C673]" strokeWidth={2} aria-hidden />
                </div>
                <div className="flex-1 min-w-0 pe-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-white leading-snug line-clamp-1">{item.title}</p>
                        <span className="text-[10px] text-white/35 font-mono shrink-0 tabular-nums">
                            {formatTimeShort(item.createdAt)}
                        </span>
                    </div>
                    <p className="text-xs text-white/65 leading-relaxed mt-1 line-clamp-2">{item.message}</p>
                    <p className="text-[10px] text-[#E6C673]/75 mt-2 font-semibold">اضغط للعرض</p>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(item.id);
                    }}
                    className="shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/5 transition-colors touch-manipulation"
                    aria-label="إغلاق الإشعار المنبثق"
                >
                    <X size={16} />
                </button>
            </div>
            <motion.div
                className="h-0.5 bg-[#E6C673]/30 origin-right"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 6.5, ease: 'linear' }}
                aria-hidden
            />
        </motion.button>
    );
}

function IncomingNotificationPopupsInner({ items, onDismiss, onOpen }: IncomingNotificationPopupsProps) {
    const reduceMotion = useReduceMotion();

    if (typeof document === 'undefined' || items.length === 0) return null;

    return createPortal(
        <div
            className="hami-incoming-notification-popups-host fixed z-[99990] inset-x-4 sm:inset-x-auto sm:end-4 sm:w-[min(100%,380px)] flex flex-col gap-2.5 pointer-events-none"
            dir="rtl"
            data-testid="incoming-notification-popups"
            aria-live="polite"
        >
            <AnimatePresence initial={false} mode="popLayout">
                {items.map((item) => (
                    <PopupCard
                        key={item.id}
                        item={item}
                        onDismiss={onDismiss}
                        onOpen={onOpen}
                        reduceMotion={reduceMotion}
                    />
                ))}
            </AnimatePresence>
        </div>,
        document.body,
    );
}

export const IncomingNotificationPopups = memo(IncomingNotificationPopupsInner);
