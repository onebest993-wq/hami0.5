import React from 'react';
import { motion } from 'motion/react';
import { Bell } from 'lucide-react';

interface HeaderNotificationsTriggerProps {
    unreadCount: number;
    onClick: () => void;
    onPointerEnter?: () => void;
}

function formatBadgeCount(count: number): string {
    if (count <= 0) return '';
    if (count > 99) return '99+';
    return String(count);
}

export function HeaderNotificationsTrigger({
    unreadCount,
    onClick,
    onPointerEnter,
}: HeaderNotificationsTriggerProps) {
    const label =
        unreadCount > 0 ? `الإشعارات (${unreadCount})` : 'الإشعارات';
    const badgeText = formatBadgeCount(unreadCount);

    return (
        <motion.button
            type="button"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            aria-label={label}
            title={label}
            data-testid="header-notifications-trigger"
            whileTap={{ scale: 0.9 }}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center touch-manipulation"
        >
            <span
                className="absolute inset-0 rounded-xl bg-white/[0.04] border border-white/[0.08] group-active:border-[#E6C673]/30 transition-colors"
                aria-hidden
            />
            <span
                className="absolute inset-[2px] rounded-[10px] bg-gradient-to-br from-[#E6C673]/12 via-transparent to-transparent opacity-90 group-active:opacity-100 transition-opacity"
                aria-hidden
            />
            <Bell
                className="relative text-white/85 group-active:text-[#E6C673] drop-shadow-[0_0_6px_rgba(255,255,255,0.12)] transition-colors"
                size={19}
                strokeWidth={1.8}
                aria-hidden
            />
            {badgeText ? (
                <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-[#0F172A] tabular-nums"
                    aria-hidden
                >
                    {badgeText}
                </span>
            ) : null}
        </motion.button>
    );
}
