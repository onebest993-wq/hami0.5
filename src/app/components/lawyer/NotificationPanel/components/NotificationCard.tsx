import React, { memo } from 'react';
import { Camera } from '@/app/components/ui/icons/Camera';
import { deriveNotificationCategory, type NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { formatNotificationForCard } from '@/app/services/notificationMessageFormat';
import {
    accentBarForCategory,
    resolveNotificationTheme,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import { formatTimeShort } from '@/app/components/lawyer/NotificationPanel/utils/timeGrouping';

interface NotificationCardProps {
    notification: NotificationModel;
    onTap: (n: NotificationModel) => void;
    onScan: (e: React.MouseEvent) => void;
}

function stopScanBubble(event: React.SyntheticEvent) {
    event.stopPropagation();
}

function NotificationCardInner({
    notification,
    onTap,
    onScan,
}: NotificationCardProps) {
    const category = deriveNotificationCategory(notification);
    const theme = resolveNotificationTheme(notification);
    const cardLines = formatNotificationForCard(notification);
    const isMissingDoc =
        notification.type === 'new_document' || notification.title.includes('ناقص');
    const unread = !notification.isRead;
    const ThemeIcon = theme.icon;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onTap(notification)}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onTap(notification);
            }}
            data-unread={unread ? 'true' : 'false'}
            className="hami-notif-card group flex w-full touch-manipulation items-start gap-2.5 px-3 py-2.5 text-right"
            data-testid={`notification-card-${notification.id}`}
        >
            {unread ? (
                <span className="absolute end-2.5 top-3 h-1.5 w-1.5 rounded-full bg-[#E6C673]" aria-hidden />
            ) : null}
            <div
                className={`absolute inset-y-2.5 start-0 w-0.5 rounded-full ${accentBarForCategory(category)}`}
                aria-hidden
            />
            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.tone.bg} ${theme.tone.text}`}
            >
                <ThemeIcon size={16} aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h4
                        className={`truncate text-[13px] font-semibold leading-snug ${unread ? 'text-white' : 'text-white/68'}`}
                    >
                        {cardLines.eventTitle}
                    </h4>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/30">
                        {formatTimeShort(notification.createdAt)}
                    </span>
                </div>

                {cardLines.caseRef ? (
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-[#E6C673]/80">
                        {cardLines.caseRef}
                    </p>
                ) : null}

                <p
                    className={`mt-0.5 line-clamp-1 text-[11px] leading-snug ${unread ? 'text-white/62' : 'text-white/40'}`}
                >
                    {cardLines.detailLine}
                </p>

                {isMissingDoc ? (
                    <div className="mt-2 flex gap-2">
                        <button
                            type="button"
                            onPointerDown={stopScanBubble}
                            onPointerUp={stopScanBubble}
                            onClick={(event) => {
                                event.stopPropagation();
                                onScan(event);
                            }}
                            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#E6C673]/15 py-2 text-xs font-semibold text-[#E6C673] touch-manipulation active:bg-[#E6C673]/25"
                        >
                            <Camera size={12} aria-hidden />
                            مسح المستند
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export const NotificationCard = memo(NotificationCardInner);
