import React, { useRef } from 'react';
import { CheckCheck } from '@/app/components/ui/icons/CheckCheck';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { Volume2 } from '@/app/components/ui/icons/Volume2';
import { VolumeX } from '@/app/components/ui/icons/VolumeX';
import { X } from '@/app/components/ui/icons/X';

type Props = {
    unreadCount: number;
    showHeaderBusy?: boolean;
    isMarkingAllRead: boolean;
    onMarkAllRead: () => void;
    onClose: () => void;
    showDragHandle?: boolean;
    isAlertsMuted?: boolean;
    onPrefetchAlertControls?: () => void;
    onNavigateToAlertControls?: () => void;
};

export function NotificationHeaderInbox({
    unreadCount,
    showHeaderBusy = false,
    isMarkingAllRead,
    onMarkAllRead,
    onClose,
    showDragHandle = false,
    isAlertsMuted = false,
    onPrefetchAlertControls,
    onNavigateToAlertControls,
}: Props) {
    const openedByPointerRef = useRef(false);

    return (
        <div className="hami-notif-header relative shrink-0 border-b border-white/[0.06] px-4 pb-2.5 pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
            {showDragHandle ? (
                <div
                    className="hami-notif-handle touch-none"
                    aria-hidden
                    data-testid="notification-sheet-handle"
                />
            ) : null}

            <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <h2 className="hami-notif-title truncate">الإشعارات</h2>
                    {unreadCount > 0 ? (
                        <span className="hami-notif-unread-chip" data-testid="notification-unread-chip">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    ) : null}
                    {showHeaderBusy ? (
                        <Loader2
                            size={16}
                            className="shrink-0 animate-spin text-white/40"
                            aria-hidden
                        />
                    ) : null}
                    {showHeaderBusy ? (
                        <span className="sr-only" aria-live="polite">
                            جاري التحديث
                        </span>
                    ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        data-testid="notification-alert-controls-toggle"
                        onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            openedByPointerRef.current = true;
                            onPrefetchAlertControls?.();
                            onNavigateToAlertControls?.();
                        }}
                        onClick={(e) => {
                            if (openedByPointerRef.current) {
                                openedByPointerRef.current = false;
                                e.preventDefault();
                                return;
                            }
                            onPrefetchAlertControls?.();
                            onNavigateToAlertControls?.();
                        }}
                        onPointerEnter={onPrefetchAlertControls}
                        onFocus={onPrefetchAlertControls}
                        aria-label="تحكم التنبيهات والصوت"
                        title="تحكم الصوت والتنبيهات"
                        className={`hami-notif-icon-btn min-h-[44px] min-w-[44px] ${isAlertsMuted ? 'hami-notif-icon-btn--accent' : ''}`}
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                        {isAlertsMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            data-testid="notification-mark-all-read"
                            onClick={onMarkAllRead}
                            disabled={isMarkingAllRead}
                            aria-busy={isMarkingAllRead}
                            title="تحديد الكل كمقروء"
                            aria-label="تحديد الكل كمقروء"
                            className="hami-notif-icon-btn min-h-[44px] min-w-[44px] disabled:opacity-50"
                        >
                            <CheckCheck size={18} />
                        </button>
                    ) : null}
                    <button
                        type="button"
                        data-testid="notification-panel-close"
                        onClick={onClose}
                        className="hami-notif-icon-btn min-h-[44px] min-w-[44px]"
                        aria-label="إغلاق الإشعارات"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            {isAlertsMuted ? (
                <p className="mt-1 truncate text-[11px] text-white/40">التنبيهات مكتومة مؤقتاً</p>
            ) : null}
        </div>
    );
}
