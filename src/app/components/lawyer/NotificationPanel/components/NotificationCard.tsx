import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Camera, MessageCircle } from 'lucide-react';
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
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onTap(notification)}
            className={[
                'group w-full text-right relative px-4 py-3.5 rounded-2xl transition-all backdrop-blur-md touch-manipulation',
                'flex items-start gap-3 ring-1 active:scale-[0.99]',
                unread
                    ? `bg-[#0A0F1C]/80 ${theme.tone.ring} shadow-[0_8px_32px_rgba(0,0,0,0.35)] border border-white/[0.06]`
                    : 'bg-white/[0.02] ring-white/5 border border-transparent',
            ].join(' ')}
            data-testid={`notification-card-${notification.id}`}
        >
            {unread ? (
                <span
                    className={`absolute top-3.5 end-3 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.65)]`}
                    aria-hidden
                />
            ) : null}
            <div
                className={`absolute inset-y-3 start-0 w-1 rounded-full ${accentBarForCategory(category)}`}
                aria-hidden
            />
            <div
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${theme.tone.bg} ${theme.tone.text} border border-white/[0.06]`}
            >
                <TypeIcon size={18} aria-hidden />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4
                        className={`text-sm font-semibold leading-snug truncate ${unread ? 'text-white' : 'text-white/70'}`}
                    >
                        {cardLines.eventTitle}
                    </h4>
                    <span className="text-[10px] text-white/30 font-mono shrink-0 tabular-nums">
                        {formatTimeShort(notification.createdAt)}
                    </span>
                </div>

                {cardLines.caseRef ? (
                    <p className="text-[11px] font-semibold text-[#E6C673]/85 mt-1 truncate">
                        {cardLines.caseRef}
                    </p>
                ) : null}

                <p
                    className={`text-xs leading-relaxed mt-1 line-clamp-2 ${unread ? 'text-white/70' : 'text-white/45'}`}
                >
                    {cardLines.detailLine}
                </p>

                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/40">
                    <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${theme.tone.bg} ${theme.tone.text}`}
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
                            className="flex-1 py-2.5 bg-[#E6C673]/15 active:bg-[#E6C673]/25 text-[#E6C673] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                        >
                            <Camera size={12} aria-hidden />
                            مسح المستند
                        </button>
                        <button
                            type="button"
                            onClick={(e) => onClientRequest(e, notification)}
                            className="flex-1 py-2.5 bg-white/5 active:bg-white/10 text-white/80 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
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
