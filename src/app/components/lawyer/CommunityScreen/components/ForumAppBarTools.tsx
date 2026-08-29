import { Users } from '@/app/components/ui/icons/Users';
import { Bell } from '@/app/components/ui/icons/Bell';
import { FORUM_APP_BAR_ICON } from '../forumPlumTheme';
import { prefetchCommunityFollowingPanel } from '../communityScreenLazySections';
import { ForumNotificationsPanel } from './ForumNotificationsPanel';
import type { ForumNotification } from '@/app/services/lawyer-cloud';

type ForumAppBarToolsProps = {
    showFollowing: boolean;
    forumFeedScope: 'all' | 'following';
    followingCount: number;
    onOpenFollowing: () => void;
    unreadCount: number;
    showNotifPanel: boolean;
    refreshingNotifs: boolean;
    notifications: ForumNotification[];
    onBellClick: () => void;
    onCloseNotif: () => void;
    onMarkAllRead: () => void;
    onNotificationClick: (notif: ForumNotification) => void;
    onNotificationDismiss: (notif: ForumNotification) => void;
};

export function ForumAppBarTools({
    showFollowing,
    forumFeedScope,
    followingCount,
    onOpenFollowing,
    unreadCount,
    showNotifPanel,
    refreshingNotifs,
    notifications,
    onBellClick,
    onCloseNotif,
    onMarkAllRead,
    onNotificationClick,
    onNotificationDismiss,
}: ForumAppBarToolsProps) {
    return (
        <div className="flex items-center gap-2 shrink-0">
            {showFollowing ? (
                <button
                    type="button"
                    data-testid="forum-following-trigger"
                    onClick={onOpenFollowing}
                    onPointerEnter={prefetchCommunityFollowingPanel}
                    aria-label="المتابَعون"
                    className={`${FORUM_APP_BAR_ICON} relative ${
                        forumFeedScope === 'following'
                            ? 'bg-[#E6C673]/14 text-[#E6C673] border border-[#E6C673]/30'
                            : 'text-[#9AA3B2] hover:text-[#E6C673]'
                    }`}
                >
                    <Users size={18} />
                    {followingCount > 0 ? (
                        <span className="absolute -bottom-0.5 -left-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-[#E6C673] text-[#0A0F1C] text-[9px] font-bold rounded-full">
                            {followingCount > 9 ? '9+' : followingCount}
                        </span>
                    ) : null}
                </button>
            ) : null}
            <div className="relative">
                <button
                    type="button"
                    data-testid="forum-notifications-trigger"
                    onClick={onBellClick}
                    aria-label="التنبيهات"
                    aria-expanded={showNotifPanel}
                    className={`${FORUM_APP_BAR_ICON} text-[#9AA3B2] hover:text-[#E6C673] relative`}
                >
                    <Bell size={20} />
                    {unreadCount > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    ) : null}
                </button>
                <ForumNotificationsPanel
                    open={showNotifPanel}
                    unreadCount={unreadCount}
                    refreshing={refreshingNotifs}
                    notifications={notifications}
                    onClose={onCloseNotif}
                    onMarkAllRead={onMarkAllRead}
                    onNotificationClick={onNotificationClick}
                    onNotificationDismiss={onNotificationDismiss}
                />
            </div>
        </div>
    );
}
