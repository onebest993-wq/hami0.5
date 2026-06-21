import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Search, Bell, ChevronDown, Users } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { FORUM_UNREAD_CHANGED_EVENT } from '@/app/services/forum/forumNotificationBridge';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { ForumCategoryPanel } from './ForumCategoryPanel';
import { RepositoryFilterPanel } from './RepositoryFilterPanel';
import { ForumSectionSwitch, type ForumSectionId } from './ForumSectionSwitch';
import { ForumNotificationRow } from './ForumNotificationRow';
import { FORUM_FILTER_LABELS } from '../forumFilters';
import {
    FORUM_APP_BAR,
    FORUM_ACCENT_CHIP,
    FORUM_PANEL,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import {
    repositoryFilterSummary,
    repositoryHasActiveListFilters,
    type RepositorySortKey,
} from '../repositoryListFilters';

interface ForumAppBarProps {
    onBack?: () => void;
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
    followingCount?: number;
    onOpenFollowing?: () => void;
    forumFeedScope?: 'all' | 'following';
    onForumFeedScopeChange?: (scope: 'all' | 'following') => void;
    notificationStreamActive?: boolean;
}

export const ForumAppBar = ({
    onBack,
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
    followingCount = 0,
    onOpenFollowing,
    forumFeedScope = 'all',
    onForumFeedScopeChange,
    notificationStreamActive = false,
}: ForumAppBarProps) => {
    const [notifications, setNotifications] = useState<ForumNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const lastUnreadRef = useRef(0);
    const seenNotifIdsRef = useRef<Set<string>>(new Set());
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [showForumFilterPanel, setShowForumFilterPanel] = useState(false);
    const [showRepositoryFilterPanel, setShowRepositoryFilterPanel] = useState(false);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
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

    const fetchNotifications = useCallback(async () => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        setLoadingNotifs(true);
        try {
            const { notifications: list, unreadCount: unread } = await ForumApiService.listForumNotifications(userId);
            const slice = list.slice(0, 25);
            setNotifications(slice);
            setUnreadCount(unread);

            if (lastUnreadRef.current > 0 && unread > lastUnreadRef.current) {
                const fresh = slice.find((n) => !n.read && !seenNotifIdsRef.current.has(n.id));
                if (fresh) {
                    SmartToast.show(fresh.title, {
                        type: 'info',
                        description: fresh.message,
                        duration: 4500,
                    });
                }
            }
            lastUnreadRef.current = unread;
            for (const n of slice) seenNotifIdsRef.current.add(n.id);
        } catch {
            SmartToast.error('تعذّر تحميل التنبيهات');
        } finally {
            setLoadingNotifs(false);
        }
    }, [userId]);

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    useVisibilityAwareInterval(() => {
        void fetchNotifications();
    }, notificationStreamActive ? 45_000 : 5_000, Boolean(userId));

    useEffect(() => {
        const onExternal = (e: Event) => {
            const detail = (e as CustomEvent<{ count: number; refresh?: boolean }>).detail;
            if (typeof detail?.count === 'number') {
                setUnreadCount(detail.count);
                lastUnreadRef.current = detail.count;
            }
            if (detail?.refresh) void fetchNotifications();
        };
        window.addEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
        return () => window.removeEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
    }, [fetchNotifications]);

    const handleMarkAllRead = async () => {
        if (!userId) return;
        try {
            await ForumApiService.markAllForumNotificationsRead(userId);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            lastUnreadRef.current = 0;
            SmartToast.success('تم تحديد جميع التنبيهات كمقروءة');
        } catch {
            SmartToast.error('تعذّر تحديث التنبيهات');
        }
    };

    const handleNotificationClick = async (notif: ForumNotification) => {
        if (!userId) return;
        try {
            if (!notif.read) {
                await ForumApiService.markForumNotificationRead(notif.id, userId);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
                );
                setUnreadCount((c) => Math.max(0, c - 1));
                lastUnreadRef.current = Math.max(0, lastUnreadRef.current - 1);
            }
            setShowNotifPanel(false);
            if (notif.postId) {
                onSectionChange('forum');
                onNavigateToPost?.(notif.postId);
            }
        } catch {
            SmartToast.error('تعذّر فتح التنبيه');
        }
    };

    const handleBellClick = () => {
        if (!userId) {
            SmartToast.warning('سجّل الدخول لعرض التنبيهات');
            return;
        }
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel(false);
        setShowNotifPanel((v) => {
            const next = !v;
            if (next) void fetchNotifications();
            return next;
        });
    };

    const handleForumSearchClick = () => {
        setShowForumFilterPanel(false);
        onSearchOpen();
    };

    const handleForumFilterToggle = () => {
        setShowNotifPanel(false);
        setShowRepositoryFilterPanel(false);
        setShowForumFilterPanel((v) => !v);
    };

    const handleRepositoryFilterToggle = () => {
        setShowNotifPanel(false);
        setShowForumFilterPanel(false);
        setShowRepositoryFilterPanel((v) => !v);
    };

    return (
        <div className={FORUM_APP_BAR}>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className="w-9 h-9 rounded-full bg-[#2C2434] flex items-center justify-center text-[#9A9098] hover:text-[#F0B896] hover:bg-[#342C3E] hover:shadow-[inset_0_0_16px_rgba(240,184,150,0.1)] transition-all shrink-0"
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
                            onClick={onOpenFollowing}
                            aria-label="المتابَعون"
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${
                                forumFeedScope === 'following'
                                    ? 'bg-[#F0B896]/14 text-[#F0B896] border border-[#F0B896]/30'
                                    : 'bg-[#2C2434] text-[#9A9098] hover:text-[#F0B896] hover:bg-[#342C3E]'
                            }`}
                        >
                            <Users size={18} />
                            {followingCount > 0 ? (
                                <span className="absolute -bottom-0.5 -left-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-[#F0B896] text-[#2A1520] text-[9px] font-bold rounded-full">
                                    {followingCount > 9 ? '9+' : followingCount}
                                </span>
                            ) : null}
                        </button>
                    ) : null}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={handleBellClick}
                            aria-label="التنبيهات"
                            aria-expanded={showNotifPanel}
                            className="w-10 h-10 rounded-full bg-[#2C2434] flex items-center justify-center text-[#9A9098] hover:text-[#F0B896] hover:bg-[#342C3E] transition-colors relative"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 ? (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-lg">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            ) : null}
                        </button>

                        {showNotifPanel ? (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                                <div className={`absolute left-0 top-full mt-2 w-80 z-50 ${FORUM_PANEL} shadow-2xl overflow-hidden`}>
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#4A3D52]/40">
                                        <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-sm`}>التنبيهات</h3>
                                        {unreadCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleMarkAllRead()}
                                                className={`${FORUM_TEXT_APRICOT} text-[11px] font-bold hover:underline`}
                                            >
                                                تحديد الكل كمقروء
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {loadingNotifs ? (
                                            <p className="text-white/40 text-xs text-center py-6">جاري التحميل...</p>
                                        ) : notifications.length === 0 ? (
                                            <p className="text-gray-500 text-xs text-center py-6">لا توجد تنبيهات</p>
                                        ) : (
                                            notifications.map((n) => (
                                                <ForumNotificationRow
                                                    key={n.id}
                                                    notification={n}
                                                    onClick={() => void handleNotificationClick(n)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>

                    {activeSection === 'forum' ? (
                        <div className="relative">
                            <div className="flex items-center h-10 rounded-full bg-[#2C2434] border border-[#4A3D52]/50 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={handleForumSearchClick}
                                    aria-label="بحث في المنتدى والمستودع"
                                    className="w-10 h-10 flex items-center justify-center text-[#9A9098] hover:text-[#F0B896] hover:bg-[#342C3E] transition-colors"
                                >
                                    <Search size={18} />
                                </button>
                                <div
                                    className="w-px h-5 bg-gradient-to-b from-transparent via-white/15 to-transparent"
                                    aria-hidden
                                />
                                <button
                                    type="button"
                                    onClick={handleForumFilterToggle}
                                    aria-label="تصنيفات المنتدى"
                                    aria-expanded={showForumFilterPanel}
                                    className={`relative h-10 px-2.5 flex items-center gap-1 transition-colors ${
                                        showForumFilterPanel || hasForumFilter
                                            ? `${FORUM_TEXT_APRICOT} bg-[#F0B896]/12 shadow-[inset_0_0_14px_rgba(240,184,150,0.1)]`
                                            : 'text-[#9A9098] hover:text-[#F0B896] hover:bg-[#342C3E]'
                                    }`}
                                >
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-200 ${showForumFilterPanel ? 'rotate-180' : ''}`}
                                    />
                                    {hasForumFilter ? (
                                        <span className="max-w-[72px] truncate text-[10px] font-bold leading-none">
                                            {activeFilterLabel}
                                        </span>
                                    ) : null}
                                </button>
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
                                        />
                                    </>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="px-4 pb-3">
                <ForumSectionSwitch activeSection={activeSection} onSectionChange={onSectionChange} />
            </div>

            {activeSection === 'repository' ? (
                <div className="px-4 pb-3">
                    <div className="relative">
                        <div className="flex items-center h-11 rounded-2xl bg-[#25293C] border border-white/10 overflow-hidden shadow-lg shadow-black/20 focus-within:border-[#E6C673]/30 transition-colors">
                            <div className="flex flex-1 items-center gap-2 px-3 min-w-0">
                                <Search size={17} className="text-white/35 shrink-0" />
                                <input
                                    type="search"
                                    value={repositorySearchTerm}
                                    onChange={(e) => onRepositorySearchTermChange(e.target.value)}
                                    placeholder="ابحث في المستندات، الوسوم، المؤلف..."
                                    aria-label="بحث في المستودع"
                                    className="w-full bg-transparent text-white text-sm placeholder-white/30 outline-none"
                                />
                            </div>
                            <div
                                className="w-px h-6 bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0"
                                aria-hidden
                            />
                            <button
                                type="button"
                                onClick={handleRepositoryFilterToggle}
                                aria-label="ترتيب وتصفية المستودع"
                                aria-expanded={showRepositoryFilterPanel}
                                className={`relative h-11 px-3 flex items-center gap-1.5 shrink-0 transition-colors ${
                                    showRepositoryFilterPanel || hasRepositoryFilter
                                        ? 'text-[#E6C673] bg-[#E6C673]/10'
                                        : 'text-white/70 hover:text-white hover:bg-[#2f3346]'
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
                        </div>

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
            ) : null}
        </div>
    );
};
