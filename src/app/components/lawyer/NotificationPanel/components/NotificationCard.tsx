import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Camera, MessageCircle } from '@/app/components/ui/lucideIcons';
import { deriveNotificationCategory, type NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { formatNotificationForCard } from '@/app/services/notificationMessageFormat';
import {
    accentBarForCategory,
    resolveNotificationTheme,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import { formatTimeShort } from '@/app/components/lawyer/NotificationPanel/utils/timeGrouping';
import { pickTypeIcon } from '@/app/components/lawyer/NotificationPanel/utils/pickTypeIcon';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

interface NotificationCardProps {
    notification: NotificationModel;
    onTap: (n: NotificationModel) => void;
    onScan: (e: React.MouseEvent) => void;
    onClientRequest: (e: React.MouseEvent, n: NotificationModel) => void;
}

function NotificationCardInner({
    notification,
    onTap,
    onScan,
    onClientRequest,
}: NotificationCardProps) {
    const reduceMotion = useReduceMotion();
    const category = deriveNotificationCategory(notification);
    const theme = resolveNotificationTheme(notification);
    const cardLines = formatNotificationForCard(notification);
    const isMissingDoc =
        notification.type === 'new_document' || notification.title.includes('ناقص');
    const unread = !notification.isRead;
    const TypeIcon = pickTypeIcon(notification) ?? theme.icon;
    const ThemeIcon = theme.icon;

    return (
        <motion.button
            type="button"
            layout={reduceMotion ? false : true}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onTap(notification)}
            data-unread={unread ? 'true' : 'false'}
            className="hami-notif-card group flex w-full touch-manipulation items-start gap-3 px-4 py-3.5 text-right"
            data-testid={`notification-card-${notification.id}`}
        >
            <span className="hami-notif-card-sheen" aria-hidden />
            {unread ? (
                <span
                    className="absolute end-3 top-3.5 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.65)]"
                    aria-hidden
                />
            ) : null}
            <div
                className={`absolute inset-y-3 start-0 w-1 rounded-full ${accentBarForCategory(category)}`}
                aria-hidden
            />
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] ${theme.tone.bg} ${theme.tone.text}`}
            >
                <TypeIcon size={18} aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h4
                        className={`truncate text-sm font-semibold leading-snug ${unread ? 'text-white' : 'text-white/70'}`}
                    >
                        {cardLines.eventTitle}
                    </h4>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/30">
                        {formatTimeShort(notification.createdAt)}
                    </span>
                </div>

                {cardLines.caseRef ? (
                    <p className="mt-1 truncate text-[11px] font-semibold text-[#E6C673]/85">
                        {cardLines.caseRef}
                    </p>
                ) : null}

                <p
                    className={`mt-1 line-clamp-2 text-xs leading-relaxed ${unread ? 'text-white/70' : 'text-white/45'}`}
                >
                    {cardLines.detailLine}
                </p>

                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/40">
                    <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${theme.tone.bg} ${theme.tone.text}`}
                    >
                        <ThemeIcon size={12} aria-hidden />
                        {theme.label}
                    </span>
                    {unread ? <span className="text-rose-300/70">جديد</span> : null}
                </div>

                {isMissingDoc ? (
                    <div className="mt-2.5 flex gap-2">
                        <button
                            type="button"
                            onClick={onScan}
                            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#E6C673]/15 py-2.5 text-xs font-semibold text-[#E6C673] transition-colors active:bg-[#E6C673]/25"
                        >
                            <Camera size={12} aria-hidden />
                            مسح المستند
                        </button>
                        <button
                            type="button"
                            onClick={(e) => onClientRequest(e, notification)}
                            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2.5 text-xs font-semibold text-white/80 transition-colors active:bg-white/10"
                        >
                            <MessageCircle size={12} aria-hidden />
                            مراسلة الموكل
                        </button>
                    </div>
                ) : null}
            </div>
        </motion.button>
    );
}

export const NotificationCard = memo(NotificationCardInner);
