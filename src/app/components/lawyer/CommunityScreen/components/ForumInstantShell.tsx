import React from 'react';
import { HomeArrowRightIcon, HomePlusIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    FORUM_APP_BAR,
    FORUM_ICON_BTN,
    FORUM_PAGE_BG,
    FORUM_PUBLISH_FAB,
    FORUM_PUBLISH_FAB_ICON,
    FORUM_PUBLISH_FAB_LABEL,
    FORUM_PUBLISH_FAB_SLOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { ForumFeedSkeleton } from '@/app/components/lawyer/CommunityScreen/components/ForumFeedSkeleton';
import '../forumPlumChrome.css';

type ForumInstantShellProps = {
    onBack?: () => void;
    /** داخل Host الذي يملك الطبقة — لا تكرّر fixed */
    embedded?: boolean;
};

/**
 * هيكل المنتدى الفوري (مثل RepositoryInstantShell) —
 * يظهر مع النقرة قبل جاهزية chunk المحتوى — Obsidian Slate.
 */
export function ForumInstantShell({
    onBack,
    embedded = false,
}: ForumInstantShellProps): React.ReactElement {
    useBodyScrollLock(Boolean(onBack));

    const baseStyle: React.CSSProperties = { ...FORUM_PAGE_BG };
    if (!onBack) baseStyle.pointerEvents = 'none';

    return (
        <div
            className={
                embedded
                    ? 'hami-forum-silk-root h-full w-full flex flex-col relative overflow-hidden'
                    : 'hami-forum-silk-root fixed inset-0 z-[95] h-[100dvh] flex flex-col relative overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
            }
            style={baseStyle}
            dir="rtl"
            data-testid="forum-instant-shell"
            data-forum-instant-shell="1"
            data-forum-silk="1"
            role="dialog"
            aria-modal="true"
            aria-label="منتدى الزملاء"
            aria-busy="true"
        >
            <div className={`${FORUM_APP_BAR} shrink-0`}>
                <div className="flex items-center gap-3 min-w-0 px-4 py-3">
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className={FORUM_ICON_BTN}
                            aria-label="رجوع"
                            data-testid="forum-instant-shell-back"
                        >
                            <HomeArrowRightIcon size={18} />
                        </button>
                    ) : null}
                    <h1 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg truncate`}>منتدى الزملاء</h1>
                </div>

                <div className="flex items-center justify-center gap-2 px-4 pb-2" aria-hidden>
                    {['المنتدى', 'المجموعات', 'المستودع'].map((label, i) => (
                        <div
                            key={label}
                            className={`hami-forum-cuneiform-btn min-h-[36px] px-3.5 rounded-lg text-sm font-bold inline-flex items-center ${
                                i === 0 ? 'hami-forum-section-active' : 'hami-forum-section-idle'
                            }`}
                        >
                            {label}
                        </div>
                    ))}
                </div>

                <div className="px-4 pb-3" aria-hidden>
                    <div className="hami-forum-search-bar flex h-11 items-center overflow-hidden rounded-xl px-3">
                        <span className={`text-sm ${FORUM_TEXT_MUTED} opacity-70`}>
                            ابحث في المنشورات والمستودع...
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden pt-1">
                <ForumFeedSkeleton count={2} />
            </div>

            <div className={FORUM_PUBLISH_FAB_SLOT} aria-hidden>
                <div className={`pointer-events-none ${FORUM_PUBLISH_FAB}`}>
                    <span className={FORUM_PUBLISH_FAB_ICON}>
                        <HomePlusIcon size={20} strokeWidth={2.5} />
                    </span>
                    <span className={FORUM_PUBLISH_FAB_LABEL}>النشر</span>
                </div>
            </div>

            <span className="sr-only">جاري فتح المنتدى</span>
        </div>
    );
}
