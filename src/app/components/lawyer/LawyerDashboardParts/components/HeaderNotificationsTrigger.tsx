import React from 'react';
import { Bell } from 'lucide-react';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';
import { formatHeaderToolbarBadge } from './headerToolbarUtils';

interface HeaderNotificationsTriggerProps {
    unreadCount: number;
    onClick: () => void;
    onPointerEnter?: () => void;
}

export function HeaderNotificationsTrigger({
    unreadCount,
    onClick,
    onPointerEnter,
}: HeaderNotificationsTriggerProps) {
    const label =
        unreadCount > 0 ? `الإشعارات (${unreadCount})` : 'الإشعارات';
    const badgeText = formatHeaderToolbarBadge(unreadCount);

    return (
        <HeaderToolbarIcon
            icon={Bell}
            label={label}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            testId="header-notifications-trigger"
            badge={
                badgeText ? (
                    <span
                        className="absolute -top-0.5 -right-0.5 z-[2] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-[#0F172A] tabular-nums"
                        aria-hidden
                    >
                        {badgeText}
                    </span>
                ) : null
            }
        />
    );
}
