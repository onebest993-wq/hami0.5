import React, { memo } from 'react';
import { Bell, MessageCircle, Reply, ThumbsUp, UserPlus, Award, FileText, AtSign, X } from 'lucide-react';
import type { ForumNotification, NotificationType } from '@/app/services/lawyer-cloud';
import { FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

const TYPE_META: Record<
    NotificationType,
    { icon: React.ElementType; accent: string; label: string }
> = {
    new_post: { icon: FileText, accent: 'text-[#C9A86C]', label: 'منشور' },
    new_document: { icon: FileText, accent: 'text-[#C9A86C]', label: 'مستند' },
    comment: { icon: MessageCircle, accent: 'text-sky-300', label: 'تعليق' },
    reply: { icon: Reply, accent: 'text-violet-300', label: 'رد' },
    upvote: { icon: ThumbsUp, accent: 'text-emerald-300', label: 'تصويت' },
    best_answer: { icon: Award, accent: 'text-amber-300', label: 'أفضل إجابة' },
    follow: { icon: UserPlus, accent: 'text-[#C9A86C]', label: 'متابعة' },
    mention: { icon: AtSign, accent: 'text-[#C9A86C]', label: 'إشارة' },
    report_update: { icon: Bell, accent: 'text-orange-300', label: 'بلاغ' },
    system: { icon: Bell, accent: 'text-white/50', label: 'نظام' },
};

function formatWhen(iso: string): string {
    const diff = Date.now() - Date.parse(iso);
    if (!Number.isFinite(diff) || diff < 0) return 'الآن';
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} ي`;
}

export const ForumNotificationRow = memo(function ForumNotificationRow({
    notification,
    onClick,
    onDismiss,
}: {
    notification: ForumNotification;
    onClick: () => void;
    onDismiss: () => void;
}) {
    const meta = TYPE_META[notification.type] ?? TYPE_META.system;
    const Icon = meta.icon;
    return (
        <div
            className={`w-full text-right px-4 py-3 border-b border-[#2A3344]/30 last:border-0 transition hover:bg-[#1A2333] ${
                !notification.read ? 'bg-[#C9A86C]/6' : ''
            }`}
        >
            <div className="flex items-start gap-2.5">
                <span
                    className={`w-8 h-8 rounded-lg bg-[#161E2C] border border-[#2A3344]/45 flex items-center justify-center shrink-0 ${meta.accent}`}
                >
                    <Icon size={15} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`${FORUM_TEXT_PRIMARY} text-xs font-bold truncate`}>{notification.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                            <span className={`${FORUM_TEXT_MUTED} text-[10px] tabular-nums`}>
                                {formatWhen(notification.createdAt)}
                            </span>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDismiss();
                                }}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/5 transition-colors"
                                aria-label="إزالة التنبيه"
                                title="إزالة"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                    <button type="button" onClick={onClick} className="w-full text-right">
                        <p className="text-white/50 text-[11px] mt-0.5 line-clamp-2">{notification.message}</p>
                        <span className={`inline-block mt-1 text-[9px] font-bold ${meta.accent} opacity-70`}>
                            {meta.label}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
});
