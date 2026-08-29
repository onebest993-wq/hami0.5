import React from 'react';
import { HeaderNoticeMark } from './headerToolbarIcons';
import {
    beginNotificationDismissLock,
    paintNotificationInstantChrome,
} from '@/app/runtime/notificationInstantPaint';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';
import { formatHeaderToolbarBadge } from './headerToolbarUtils';

interface HeaderNotificationsTriggerProps {
    unreadCount: number;
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
}

export function HeaderNotificationsTrigger({
    unreadCount,
    onClick,
    onPointerEnter,
    onPointerDown,
}: HeaderNotificationsTriggerProps) {
    const label =
        unreadCount > 0 ? `الإشعارات (${unreadCount})` : 'الإشعارات';
    const badgeText = formatHeaderToolbarBadge(unreadCount);

    return (
        <HeaderToolbarIcon
            icon={HeaderNoticeMark}
            label={label}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={() => {
                beginNotificationDismissLock();
                paintNotificationInstantChrome();
                onPointerDown?.();
            }}
            /* طلاء الورقة في pointerdown قبل prefetch — الخلفية تُقفل حتى تكتمل اللمسة */
            activateOnPointerDown
            testId="header-notifications-trigger"
            badge={
                badgeText ? (
                    <span
                        className="hami-header-tool-badge absolute z-[2] min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
                        aria-hidden
                    >
                        {badgeText}
                    </span>
                ) : null
            }
        />
    );
}
