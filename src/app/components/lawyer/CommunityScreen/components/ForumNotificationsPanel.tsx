import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { ForumNotificationRow } from './ForumNotificationRow';
import { FORUM_PANEL, FORUM_TEXT_APRICOT, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

export type ForumNotificationsPanelProps = {
    open: boolean;
    unreadCount: number;
    loading: boolean;
    notifications: ForumNotification[];
    onClose: () => void;
    onMarkAllRead: () => void;
    onNotificationClick: (notif: ForumNotification) => void;
};

export function ForumNotificationsPanel({
    open,
    unreadCount,
    loading,
    notifications,
    onClose,
    onMarkAllRead,
    onNotificationClick,
}: ForumNotificationsPanelProps) {
    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
            <div
                data-testid="forum-notifications-panel"
                className={`absolute left-0 top-full mt-2 w-80 z-50 ${FORUM_PANEL} shadow-2xl overflow-hidden`}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#4A3D52]/40">
                    <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-sm`}>التنبيهات</h3>
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            className={`${FORUM_TEXT_APRICOT} text-[11px] font-bold hover:underline min-h-[44px] px-2 touch-manipulation`}
                        >
                            تحديد الكل كمقروء
                        </button>
                    ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {loading ? (
                        <p className="text-white/40 text-xs text-center py-6">جاري التحميل...</p>
                    ) : notifications.length === 0 ? (
                        <p className="text-gray-500 text-xs text-center py-6">لا توجد تنبيهات</p>
                    ) : (
                        notifications.map((n) => (
                            <ForumNotificationRow
                                key={n.id}
                                notification={n}
                                onClick={() => onNotificationClick(n)}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
