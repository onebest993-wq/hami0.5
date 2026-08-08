import React from 'react';
import { Bell, CheckCheck, Loader2, Volume2, VolumeX, X } from '@/app/components/ui/lucideIcons';

interface NotificationHeaderProps {
    unreadCount: number;
    showHeaderBusy?: boolean;
    isMarkingAllRead: boolean;
    onMarkAllRead: () => void;
    onClose: () => void;
    showDragHandle?: boolean;
    alertControlsOpen?: boolean;
    isAlertsMuted?: boolean;
    onToggleAlertControls?: () => void;
    onQuickMute?: () => void;
}

export function NotificationHeader({
    unreadCount,
    showHeaderBusy = false,
    isMarkingAllRead,
    onMarkAllRead,
    onClose,
    showDragHandle = false,
    alertControlsOpen = false,
    isAlertsMuted = false,
    onToggleAlertControls,
    onQuickMute,
}: NotificationHeaderProps) {
    return (
        <div className="hami-notif-header relative shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
            {showDragHandle ? (
                <div
                    className="hami-notif-handle touch-none"
                    aria-hidden
                    data-testid="notification-sheet-handle"
                />
            ) : null}

            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6C673]/45 to-transparent"
                aria-hidden
            />

            <div className="flex items-center gap-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative shrink-0">
                        <div className="hami-notif-header-icon flex h-11 w-11 items-center justify-center rounded-2xl">
                            <Bell
                                className="text-[#E6C673] drop-shadow-[0_0_8px_rgba(230,198,115,0.35)]"
                                size={20}
                                strokeWidth={2}
                                aria-hidden
                            />
                        </div>
                        {unreadCount > 0 ? (
                            <span className="absolute -top-1 -start-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#080D18] bg-rose-500 px-1 text-[10px] font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        ) : null}
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                            الإشعارات
                        </h2>
                        {unreadCount > 0 ? (
                            <p className="truncate text-[11px] text-white/45">
                                {unreadCount} غير مقروء
                                {isAlertsMuted ? ' · صامت' : ''}
                            </p>
                        ) : showHeaderBusy ? (
                            <p className="sr-only truncate text-[11px] text-white/35" aria-live="polite">
                                جاري التحديث
                            </p>
                        ) : (
                            <p className="truncate text-[11px] text-white/35">
                                {isAlertsMuted ? 'التنبيهات مكتومة مؤقتاً' : 'لا جديد حالياً'}
                            </p>
                        )}
                    </div>
                    {showHeaderBusy ? (
                        <Loader2
                            size={18}
                            className="shrink-0 animate-spin text-[#E6C673]/70"
                            aria-hidden
                        />
                    ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <button
                        type="button"
                        data-testid="notification-alert-controls-toggle"
                        onClick={onToggleAlertControls}
                        aria-pressed={alertControlsOpen}
                        aria-label={alertControlsOpen ? 'إخفاء تحكم التنبيهات' : 'تحكم التنبيهات والصوت'}
                        title="تحكم الصوت والتنبيهات"
                        className={`flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-2xl border transition-colors active:scale-[0.96] ${
                            alertControlsOpen || isAlertsMuted
                                ? 'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]'
                                : 'border-white/[0.08] bg-white/[0.04] text-white/55 hover:border-[#E6C673]/25 hover:text-[#E6C673]'
                        }`}
                    >
                        {isAlertsMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button
                        type="button"
                        data-testid="notification-quick-mute"
                        onClick={onQuickMute}
                        aria-label="كتم سريع لمدة ساعة"
                        title="كتم سريع — ساعة واحدة"
                        className="flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition-colors active:scale-[0.96] hover:border-rose-400/30 hover:text-rose-300"
                    >
                        <VolumeX size={17} />
                    </button>
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            disabled={isMarkingAllRead}
                            aria-busy={isMarkingAllRead}
                            title="تحديد الكل كمقروء"
                            aria-label="تحديد الكل كمقروء"
                            className="flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#E6C673]/70 transition-colors active:scale-[0.96] hover:border-[#E6C673]/25 hover:text-[#E6C673] disabled:opacity-50"
                        >
                            <CheckCheck size={18} />
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition-colors active:scale-[0.96] hover:border-white/15 hover:text-white"
                        aria-label="إغلاق الإشعارات"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
