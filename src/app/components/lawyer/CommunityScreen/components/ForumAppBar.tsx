import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { ForumSectionSwitch } from './ForumSectionSwitch';
import { useForumAppBarNotifications } from '../hooks/useForumAppBarNotifications';
import { useForumAppBarChrome } from '../hooks/useForumAppBarChrome';
import { FORUM_APP_BAR, FORUM_APP_BAR_ICON, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';
import { ForumAppBarTools } from './ForumAppBarTools';
import { ForumAppBarSearchRow } from './ForumAppBarSearchRow';
import type { ForumAppBarProps } from './forumAppBarTypes';

export type { ForumAppBarProps } from './forumAppBarTypes';

export const ForumAppBar = ({
    onBack,
    forumSurfaceOpen = true,
    activeSection,
    onSectionChange,
    onSectionIntent,
    onSearchOpen,
    onNavigateToPost,
    userId,
    selectedFilterIndex,
    onFilterSelect,
    repositorySearchTerm,
    onRepositorySearchTermChange,
    repositorySortBy,
    onRepositorySortChange,
    repositorySelectedType,
    onRepositoryTypeChange,
    repositorySelectedTag,
    onRepositoryTagChange,
    groupsSearchQuery = '',
    onGroupsSearchQueryChange,
    followingCount = 0,
    onOpenFollowing,
    forumFeedScope = 'all',
    notificationStreamActive = false,
    onAppBarDropdownChange,
    closeAppBarDropdownsRef,
}: ForumAppBarProps) => {
    const notif = useForumAppBarNotifications(
        userId,
        notificationStreamActive,
        onNavigateToPost,
        onSectionChange,
        forumSurfaceOpen,
    );
    const chrome = useForumAppBarChrome({
        activeSection,
        forumSurfaceOpen,
        onAppBarDropdownChange,
        closeAppBarDropdownsRef,
        setShowNotifPanel: notif.setShowNotifPanel,
        handleBellClick: notif.handleBellClick,
    });

    const searchPlaceholder =
        activeSection === 'forum'
            ? 'ابحث في المنتدى والمستودع...'
            : activeSection === 'groups'
              ? 'ابحث عن مجموعة...'
              : 'ابحث في المستندات، الوسوم، المؤلف...';

    return (
        <div className={FORUM_APP_BAR} data-testid="forum-app-bar">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {onBack ? (
                        <button
                            type="button"
                            data-testid="forum-back"
                            onClick={onBack}
                            className={`${FORUM_APP_BAR_ICON} text-[#9AA3B2] hover:text-[#E6C673] shrink-0`}
                            aria-label="رجوع"
                        >
                            <ArrowRight size={20} />
                        </button>
                    ) : null}
                    <h1 className={`${FORUM_TEXT_PRIMARY} font-semibold text-[17px] truncate leading-tight tracking-tight`}>
                        منتدى الزملاء
                    </h1>
                </div>
                <ForumAppBarTools
                    showFollowing={activeSection === 'forum' && Boolean(onOpenFollowing)}
                    forumFeedScope={forumFeedScope}
                    followingCount={followingCount}
                    onOpenFollowing={() => chrome.onOpenFollowing(onOpenFollowing)}
                    unreadCount={notif.unreadCount}
                    showNotifPanel={notif.showNotifPanel}
                    refreshingNotifs={notif.refreshingNotifs}
                    notifications={notif.notifications}
                    onBellClick={chrome.onBellClick}
                    onCloseNotif={() => {
                        notif.setShowNotifPanel(false);
                        onAppBarDropdownChange?.(false);
                    }}
                    onMarkAllRead={() => void notif.handleMarkAllRead()}
                    onNotificationClick={(n) => void notif.handleNotificationClick(n)}
                    onNotificationDismiss={(n) => void notif.handleNotificationDismiss(n)}
                />
            </div>

            <div className="px-4 pb-2">
                <ForumSectionSwitch
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    onSectionIntent={onSectionIntent}
                />
            </div>

            <ForumAppBarSearchRow
                activeSection={activeSection}
                searchPlaceholder={searchPlaceholder}
                groupsSearchQuery={groupsSearchQuery}
                onGroupsSearchQueryChange={onGroupsSearchQueryChange}
                repositorySearchTerm={repositorySearchTerm}
                onRepositorySearchTermChange={onRepositorySearchTermChange}
                selectedFilterIndex={selectedFilterIndex}
                onFilterSelect={onFilterSelect}
                repositorySortBy={repositorySortBy}
                onRepositorySortChange={onRepositorySortChange}
                repositorySelectedType={repositorySelectedType}
                onRepositoryTypeChange={onRepositoryTypeChange}
                repositorySelectedTag={repositorySelectedTag}
                onRepositoryTagChange={onRepositoryTagChange}
                showForumFilterPanel={chrome.showForumFilterPanel}
                showRepositoryFilterPanel={chrome.showRepositoryFilterPanel}
                forumFilterTriggerRef={chrome.forumFilterTriggerRef}
                onForumSearchOpen={() => chrome.onForumSearchOpen(onSearchOpen)}
                onForumFilterToggle={chrome.onForumFilterToggle}
                onRepositoryFilterToggle={chrome.onRepositoryFilterToggle}
                onCloseForumFilter={() => chrome.setShowForumFilterPanel(false)}
                onCloseRepositoryFilter={() => chrome.setShowRepositoryFilterPanel(false)}
            />
        </div>
    );
};
