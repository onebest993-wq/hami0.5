import React from 'react';
import { Bell, CheckCheck, Loader2, X } from 'lucide-react';

interface NotificationHeaderProps {
    unreadCount: number;
    showHeaderBusy?: boolean;
    isMarkingAllRead: boolean;
    onMarkAllRead: () => void;
    onClose: () => void;
}

export function NotificationHeader({
    unreadCount,
    showHeaderBusy = false,
    isMarkingAllRead,
    onMarkAllRead,
    onClose,
}: NotificationHeaderProps) {
    return (
        <div className="relative shrink-0 px-4 pt-2 pb-3 sm:px-5 sm:pt-4 border-b border-white/[0.06]">
            <div className="w-11 h-1 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent mx-auto mb-4 sm:hidden" aria-hidden />

            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6C673]/50 to-transparent" aria-hidden />

            <div className="flex items-center gap-2.5">
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 text-sm font-bold text-[#E6C673]/80 active:text-[#E6C673] active:scale-[0.97] px-1 min-h-[44px] sm:hidden touch-manipulation"
                    aria-label="إغلاق الإشعارات"
                >
                    إغلاق
                </button>

                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#E6C673]/10 border border-[#E6C673]/25 flex items-center justify-center shadow-[0_0_24px_rgba(230,198,115,0.12)]">
                            <Bell
                                className="text-[#E6C673] drop-shadow-[0_0_8px_rgba(230,198,115,0.35)]"
                                size={20}
                                strokeWidth={2}
                                aria-hidden
                            />
                        </div>
                        {unreadCount > 0 ? (
                            <span className="absolute -top-1 -start-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#080D18]">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        ) : null}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate tracking-tight">
                            الإشعارات
                        </h2>
                        {unreadCount > 0 ? (
                            <p className="text-[11px] text-white/45 truncate">
                                {unreadCount} غير مقروء — وارد حقيقي فقط
                            </p>
                        ) : showHeaderBusy ? (
                            <p className="text-[11px] text-white/35 truncate sr-only" aria-live="polite">
                                جاري التحديث
                            </p>
                        ) : (
                            <p className="text-[11px] text-white/35 truncate">لا جديد حالياً</p>
                        )}
                    </div>
                    {showHeaderBusy ? (
                        <Loader2
                            size={18}
                            className="text-[#E6C673]/70 animate-spin shrink-0"
                            aria-hidden
                        />
                    ) : null}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            disabled={isMarkingAllRead}
                            aria-busy={isMarkingAllRead}
                            title="تحديد الكل كمقروء"
                            aria-label="تحديد الكل كمقروء"
                            className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#E6C673]/70 hover:text-[#E6C673] hover:border-[#E6C673]/25 transition-colors disabled:opacity-50 active:scale-[0.96] touch-manipulation"
                        >
                            <CheckCheck size={18} />
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={onClose}
                        className="hidden sm:flex w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-white/[0.04] border border-white/[0.08] items-center justify-center text-white/40 hover:text-white hover:border-white/15 active:scale-[0.96] touch-manipulation"
                        aria-label="إغلاق الإشعارات"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
