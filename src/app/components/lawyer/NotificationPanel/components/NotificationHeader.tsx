import React from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCheck, X } from 'lucide-react';

interface NotificationHeaderProps {
    unreadCount: number;
    isMarkingAllRead: boolean;
    onMarkAllRead: () => void;
    onClose: () => void;
}

export function NotificationHeader({
    unreadCount,
    isMarkingAllRead,
    onMarkAllRead,
    onClose,
}: NotificationHeaderProps) {
    return (
        <div className="relative shrink-0 px-4 pt-2 pb-3 sm:px-5 sm:pt-4 border-b border-white/[0.06]">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" aria-hidden />

            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6C673]/40 to-transparent hidden sm:block" />

            <div className="flex items-center gap-2.5">
                <motion.button
                    type="button"
                    onClick={onClose}
                    whileTap={{ scale: 0.94 }}
                    className="shrink-0 text-sm font-bold text-[#E6C673]/80 active:text-[#E6C673] px-1 min-h-[44px] sm:hidden"
                    aria-label="إغلاق الإشعارات"
                >
                    إغلاق
                </motion.button>

                <div className="flex-1 min-w-0 flex items-center gap-2.5">
                    <Bell
                        className="text-[#E6C673] shrink-0 drop-shadow-[0_0_8px_rgba(230,198,115,0.35)]"
                        size={22}
                        strokeWidth={2}
                        aria-hidden
                    />
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">الإشعارات</h2>
                        {unreadCount > 0 ? (
                            <p className="text-[11px] text-white/40 truncate">
                                {unreadCount} غير مقروء
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCount > 0 ? (
                        <motion.button
                            type="button"
                            onClick={onMarkAllRead}
                            disabled={isMarkingAllRead}
                            aria-busy={isMarkingAllRead}
                            whileTap={{ scale: 0.92 }}
                            title="تحديد الكل كمقروء"
                            aria-label="تحديد الكل كمقروء"
                            className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#E6C673]/70 hover:text-[#E6C673] transition-colors disabled:opacity-50"
                        >
                            <CheckCheck size={18} />
                        </motion.button>
                    ) : null}
                    <motion.button
                        type="button"
                        onClick={onClose}
                        whileTap={{ scale: 0.92 }}
                        className="hidden sm:flex w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] items-center justify-center text-white/40 hover:text-white"
                        aria-label="إغلاق الإشعارات"
                    >
                        <X size={18} />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
