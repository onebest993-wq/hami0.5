import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Search, Bell, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { NotificationDB, type ForumNotification } from '@/app/services/lawyer-cloud';
import { ForumCategoryPanel } from './ForumCategoryPanel';
import { RepositoryFilterPanel } from './RepositoryFilterPanel';
import { ForumSectionSwitch, type ForumSectionId } from './ForumSectionSwitch';
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
}: ForumAppBarProps) => {
    const [notifications, setNotifications] = useState<ForumNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
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
            const list = await NotificationDB.getNotifications(userId);
            setNotifications(list.slice(0, 20));
            setUnreadCount(list.filter((n) => !n.read).length);
        } catch {
            SmartToast.error('تعذّر تحميل التنبيهات');
        } finally {
            setLoadingNotifs(false);
        }
    }, [userId]);

    useEffect(() => {
        void fetchNotifications();
        if (!userId) return;
        const interval = setInterval(() => void fetchNotifications(), 30000);
        return () => clearInterval(interval);
    }, [userId, fetchNotifications]);

    const handleMarkAllRead = async () => {
        if (!userId) return;
        try {
            await NotificationDB.markAllAsRead(userId);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            SmartToast.success('تم تحديد جميع التنبيهات كمقروءة');
        } catch {
            SmartToast.error('تعذّر تحديث التنبيهات');
        }
    };

    const handleNotificationClick = async (notif: ForumNotification) => {
        if (!userId) return;
        try {
            if (!notif.read) {
                await NotificationDB.markAsRead(notif.id, userId);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
                );
                setUnreadCount((c) => Math.max(0, c - 1));
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
                                                <button
                                                    key={n.id}
                                                    type="button"
                                                    onClick={() => void handleNotificationClick(n)}
                                                    className={`w-full text-right px-4 py-3 border-b border-[#4A3D52]/30 last:border-0 transition hover:bg-[#342C3E] hover:shadow-[inset_0_0_16px_rgba(240,184,150,0.06)] ${
                                                        !n.read ? 'bg-[#F0B896]/6' : ''
                                                    }`}
                                                >
                                                    <p className="text-white text-xs font-bold">{n.title}</p>
                                                    <p className="text-white/50 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                                                </button>
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
