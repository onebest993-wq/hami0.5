import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import type { IncomingNotificationPopup } from '@/app/hooks/lawyerDashboard/useIncomingNotificationPopups';
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
}: {
    item: IncomingNotificationPopup;
    onDismiss: (id: string) => void;
    onOpen: (id: string) => void;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onOpen(item.id)}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                onOpen(item.id);
            }}
            data-testid={`incoming-notification-popup-${item.id}`}
            className="relative group hami-incoming-notification-popup-card pointer-events-auto w-full text-right rounded-2xl border border-white/[0.08] bg-[#0b1021] overflow-hidden touch-manipulation"
        >
            <div className="absolute inset-y-0 end-0 w-0.5 bg-white/15" aria-hidden />
            <div className="relative px-4 py-3.5 flex items-start gap-3">
                <div className="flex-1 min-w-0 pe-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-white leading-snug line-clamp-1">{item.title}</p>
                        <span className="text-[10px] text-white/35 font-mono shrink-0 tabular-nums">
                            {formatTimeShort(item.createdAt)}
                        </span>
                    </div>
                    <p className="text-xs text-white/65 leading-relaxed mt-1 line-clamp-2">{item.message}</p>
                </div>
                <button
                    type="button"
                    data-testid="incoming-notification-popup-dismiss"
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
            <div
                className="hami-incoming-notification-popup-ttl h-0.5 bg-[#E6C673]/30 origin-right"
                aria-hidden
            />
        </div>
    );
}

function IncomingNotificationPopupsInner({ items, onDismiss, onOpen }: IncomingNotificationPopupsProps) {
    if (typeof document === 'undefined' || items.length === 0) return null;

    return createPortal(
        <div
            className="hami-incoming-notification-popups-host fixed z-[99990] inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] sm:inset-x-auto sm:end-[max(1rem,env(safe-area-inset-right))] sm:top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] sm:w-[min(100%,380px)] md:w-[min(100%,420px)] lg:w-[min(100%,440px)] flex flex-col gap-2.5 pointer-events-none"
            dir="rtl"
            data-testid="incoming-notification-popups"
            aria-live="polite"
        >
            {items.map((item) => (
                <PopupCard key={item.id} item={item} onDismiss={onDismiss} onOpen={onOpen} />
            ))}
        </div>,
        document.body,
    );
}

export const IncomingNotificationPopups = memo(IncomingNotificationPopupsInner);
