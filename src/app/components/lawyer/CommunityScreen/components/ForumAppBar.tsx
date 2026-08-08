import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Search, Bell, ChevronDown, Users } from '@/app/components/ui/lucideIcons';
import { AnimatePresence } from 'motion/react';
import { ForumCategoryPanel } from './ForumCategoryPanel';
import { RepositoryFilterPanel } from './RepositoryFilterPanel';
import { ForumSectionSwitch, type ForumSectionId } from './ForumSectionSwitch';
import { prefetchCommunitySearchOverlay } from '../communityOverlayPrefetch';
import { ForumNotificationsPanel } from './ForumNotificationsPanel';
import { useForumAppBarNotifications } from '../hooks/useForumAppBarNotifications';
import { FORUM_FILTER_LABELS } from '../forumFilters';
import {
    FORUM_APP_BAR,
    FORUM_APP_BAR_ICON,
    FORUM_REPO_SEARCH_BAR,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import {
    repositoryFilterSummary,
    repositoryHasActiveListFilters,
    type RepositorySortKey,
} from '../repositoryListFilters';

interface ForumAppBarProps {
    onBack?: () => void;
    forumSurfaceOpen?: boolean;
    activeSection: ForumSectionId;
    onSectionChange: (section: ForumSectionId) => void;
    onSearchOpen: () => void;
    onNavigateToPost?: (postId: string) => void;
    userId?: string | null;
    selectedFilterIndex: number;
    onFilterSelect: (index: number) => void;
    repositorySearchTerm: string;
    onRepositorySearchTermChange: (value: string) => void;
    repositorySortBy: RepositorySortKey;
    onRepositorySortChange: (value: RepositorySortKey) => void;
    repositorySelectedType: string;
    onRepositoryTypeChange: (value: string) => void;
    repositorySelectedTag: string | null;
    onRepositoryTagChange: (tag: string | null) => void;
    groupsSearchQuery?: string;
    onGroupsSearchQueryChange?: (value: string) => void;
    followingCount?: number;
    onOpenFollowing?: () => void;
    forumFeedScope?: 'all' | 'following';
    onForumFeedScopeChange?: (scope: 'all' | 'following') => void;
    notificationStreamActive?: boolean;
    onAppBarDropdownChange?: (open: boolean) => void;
    closeAppBarDropdownsRef?: React.MutableRefObject<(() => void) | null>;
}

export const ForumAppBar = ({
    onBack,
    forumSurfaceOpen = true,
    activeSection,
    onSectionChange,
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
    onForumFeedScopeChange,
    notificationStreamActive = false,
    onAppBarDropdownChange,
    closeAppBarDropdownsRef,
}: ForumAppBarProps) => {
    const [showForumFilterPanel, setShowForumFilterPanel] = useState(false);
    const [showRepositoryFilterPanel, setShowRepositoryFilterPanel] = useState(false);
    const forumFilterTriggerRef = useRef<HTMLButtonElement>(null);
    const notif = useForumAppBarNotifications(
        userId,
        notificationStreamActive,
        onNavigateToPost,
        onSectionChange,
        forumSurfaceOpen,
    );
    const activeFilterLabel = FORUM_FILTER_LABELS[selectedFilterIndex] ?? FORUM_FILTER_LABELS[0];
    const hasForumFilter = selectedFilterIndex !== 0;
    const hasRepositoryFilter = repositoryHasActiveListFilters(
        repositorySelectedType,
        repositorySortBy,
        repositorySelectedTag,
    );
    const repositoryFilterHint = repositoryFilterSummary(
        repositorySelectedType,
        repositorySortBy,
        repositorySelectedTag,
    );

    useEffect(() => {
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
    }, [activeSection]);

    useEffect(() => {
        if (forumSurfaceOpen) return;
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        notif.setShowNotifPanel(false);
        onAppBarDropdownChange?.(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- إغلاق محلي عند hide السطح فقط
    }, [forumSurfaceOpen]);

    const handleBellClick = () => {
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        notif.handleBellClick(onAppBarDropdownChange);
    };

    const handleForumSearchOpen = () => {
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        notif.setShowNotifPanel(false);
        onAppBarDropdownChange?.(false);
        onSearchOpen();
    };

    const handleOpenFollowing = () => {
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        notif.setShowNotifPanel(false);
        onAppBarDropdownChange?.(false);
        onOpenFollowing?.();
    };

    const handleForumFilterToggle = () => {
        notif.setShowNotifPanel(false);
        setShowRepositoryFilterPanel(false);
        setShowForumFilterPanel((v) => {
            const next = !v;
            onAppBarDropdownChange?.(next);
            return next;
        });
    };

    const handleRepositoryFilterToggle = () => {
        notif.setShowNotifPanel(false);
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel((v) => {
            const next = !v;
            onAppBarDropdownChange?.(next);
            return next;
        });
    };

    const closeAppBarDropdowns = useCallback(() => {
        notif.setShowNotifPanel(false);
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        onAppBarDropdownChange?.(false);
    }, [notif.setShowNotifPanel, onAppBarDropdownChange]);

    useEffect(() => {
        if (!closeAppBarDropdownsRef) return;
        closeAppBarDropdownsRef.current = closeAppBarDropdowns;
        return () => {
            closeAppBarDropdownsRef.current = null;
        };
    }, [closeAppBarDropdownsRef, closeAppBarDropdowns]);

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
                            className={`${FORUM_APP_BAR_ICON} text-[#9AA3B2] hover:text-[#C9A86C] shrink-0`}
                            aria-label="رجوع"
                        >
                            <ArrowRight size={20} />
                        </button>
                    ) : null}
                    <h1 className={`${FORUM_TEXT_PRIMARY} font-bold text-base sm:text-lg truncate leading-tight`}>
                        منتدى الزملاء المغلق
                    </h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {activeSection === 'forum' && onOpenFollowing ? (
                        <button
                            type="button"
                            data-testid="forum-following-trigger"
                            onClick={handleOpenFollowing}
                            aria-label="المتابَعون"
                            className={`${FORUM_APP_BAR_ICON} relative ${
                                forumFeedScope === 'following'
                                    ? 'bg-[#C9A86C]/14 text-[#C9A86C] border border-[#C9A86C]/30'
                                    : 'text-[#9AA3B2] hover:text-[#C9A86C]'
                            }`}
                        >
                            <Users size={18} />
                            {followingCount > 0 ? (
                                <span className="absolute -bottom-0.5 -left-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-[#C9A86C] text-[#0A0F1C] text-[9px] font-bold rounded-full">
                                    {followingCount > 9 ? '9+' : followingCount}
                                </span>
                            ) : null}
                        </button>
                    ) : null}
                    <div className="relative">
                        <button
                            type="button"
                            data-testid="forum-notifications-trigger"
                            onClick={handleBellClick}
                            aria-label="التنبيهات"
                            aria-expanded={notif.showNotifPanel}
                            className={`${FORUM_APP_BAR_ICON} text-[#9AA3B2] hover:text-[#C9A86C] relative`}
                        >
                            <Bell size={20} />
                            {notif.unreadCount > 0 ? (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-lg">
                                    {notif.unreadCount > 99 ? '99+' : notif.unreadCount}
                                </span>
                            ) : null}
                        </button>

                        <ForumNotificationsPanel
                            open={notif.showNotifPanel}
                            unreadCount={notif.unreadCount}
                            refreshing={notif.refreshingNotifs}
                            notifications={notif.notifications}
                            onClose={() => {
                                notif.setShowNotifPanel(false);
                                onAppBarDropdownChange?.(false);
                            }}
                            onMarkAllRead={() => void notif.handleMarkAllRead()}
                            onNotificationClick={(n) => void notif.handleNotificationClick(n)}
                            onNotificationDismiss={(n) => void notif.handleNotificationDismiss(n)}
                        />
                    </div>
                </div>
            </div>

            <div className="px-4 pb-2">
                <ForumSectionSwitch activeSection={activeSection} onSectionChange={onSectionChange} />
            </div>

            <div className="px-4 pb-3 relative">
                <div className="flex items-center gap-2">
                    <div className={`${FORUM_REPO_SEARCH_BAR} flex-1 min-w-0`}>
                        <div className="flex flex-1 items-center gap-2 px-3 min-w-0">
                            <Search size={17} className="text-[#9AA3B2] shrink-0" aria-hidden />
                            {activeSection === 'forum' ? (
                                <button
                                    type="button"
                                    data-testid="forum-search-trigger"
                                    onClick={handleForumSearchOpen}
                                    onPointerEnter={prefetchCommunitySearchOverlay}
                                    onFocus={prefetchCommunitySearchOverlay}
                                    className="w-full text-right text-sm text-[#9AA3B2] truncate py-2"
                                    aria-label="بحث في المنتدى والمستودع"
                                >
                                    {searchPlaceholder}
                                </button>
                            ) : activeSection === 'groups' ? (
                                <input
                                    type="search"
                                    value={groupsSearchQuery}
                                    onChange={(e) => onGroupsSearchQueryChange?.(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    aria-label="بحث في المجموعات"
                                    data-testid="forum-groups-search"
                                    className="w-full bg-transparent text-[#F3F0EA] text-sm placeholder-[#9AA3B2]/55 outline-none"
                                />
                            ) : (
                                <input
                                    type="search"
                                    value={repositorySearchTerm}
                                    onChange={(e) => onRepositorySearchTermChange(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    aria-label="بحث في المستودع"
                                    data-testid="forum-repository-search"
                                    className="w-full bg-transparent text-[#F3F0EA] text-sm placeholder-[#9AA3B2]/55 outline-none"
                                />
                            )}
                        </div>

                        {activeSection === 'forum' ? (
                            <>
                                <div className="w-px h-6 bg-slate-800/80 shrink-0" aria-hidden />
                                <button
                                    ref={forumFilterTriggerRef}
                                    type="button"
                                    onClick={handleForumFilterToggle}
                                    aria-label="تصنيفات المنتدى"
                                    aria-expanded={showForumFilterPanel}
                                    className={`relative h-11 px-3 flex items-center gap-1.5 shrink-0 transition-colors ${
                                        showForumFilterPanel || hasForumFilter
                                            ? `${FORUM_TEXT_APRICOT} bg-[#C9A86C]/10`
                                            : 'text-[#9AA3B2] hover:text-[#C9A86C] hover:bg-[#C9A86C]/08'
                                    }`}
                                >
                                    <span className="truncate text-xs font-bold">التصنيف</span>
                                    {hasForumFilter ? (
                                        <span className="max-w-[64px] truncate rounded-full bg-[#C9A86C]/12 px-2 py-0.5 text-[10px] leading-none">
                                            {activeFilterLabel}
                                        </span>
                                    ) : null}
                                    <ChevronDown
                                        size={14}
                                        className={`transition-transform duration-200 ${showForumFilterPanel ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </>
                        ) : null}

                        {activeSection === 'repository' ? (
                            <>
                                <div className="w-px h-6 bg-slate-800/80 shrink-0" aria-hidden />
                                <button
                                    type="button"
                                    onClick={handleRepositoryFilterToggle}
                                    aria-label="ترتيب وتصفية المستودع"
                                    aria-expanded={showRepositoryFilterPanel}
                                    className={`relative h-11 px-3 flex items-center gap-1.5 shrink-0 transition-colors ${
                                        showRepositoryFilterPanel || hasRepositoryFilter
                                            ? `${FORUM_TEXT_APRICOT} bg-[#C9A86C]/10`
                                            : 'text-[#9AA3B2] hover:text-[#C9A86C] hover:bg-[#C9A86C]/08'
                                    }`}
                                >
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-200 ${showRepositoryFilterPanel ? 'rotate-180' : ''}`}
                                    />
                                    {hasRepositoryFilter ? (
                                        <span className="max-w-[88px] truncate text-[10px] font-bold leading-none">
                                            {repositoryFilterHint}
                                        </span>
                                    ) : null}
                                </button>
                            </>
                        ) : null}
                    </div>
                </div>

                <AnimatePresence>
                    {showForumFilterPanel ? (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowForumFilterPanel(false)}
                                aria-hidden
                            />
                            <ForumCategoryPanel
                                key="forum-category-panel"
                                selectedFilterIndex={selectedFilterIndex}
                                onFilterSelect={onFilterSelect}
                                onClose={() => setShowForumFilterPanel(false)}
                                anchorRef={forumFilterTriggerRef}
                            />
                        </>
                    ) : null}
                </AnimatePresence>

                <AnimatePresence>
                    {showRepositoryFilterPanel ? (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowRepositoryFilterPanel(false)}
                                aria-hidden
                            />
                            <RepositoryFilterPanel
                                key="repository-filter-panel"
                                sortBy={repositorySortBy}
                                selectedType={repositorySelectedType}
                                selectedTag={repositorySelectedTag}
                                onSortChange={onRepositorySortChange}
                                onTypeChange={onRepositoryTypeChange}
                                onTagChange={onRepositoryTagChange}
                                onClose={() => setShowRepositoryFilterPanel(false)}
                            />
                        </>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
};
