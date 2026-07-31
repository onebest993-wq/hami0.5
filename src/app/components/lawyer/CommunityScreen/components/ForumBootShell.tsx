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
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { ForumFeedSkeleton } from '@/app/components/lawyer/CommunityScreen/components/ForumFeedSkeleton';
import '../forumPlumChrome.css';

export type ForumBootShellProps = {
    onBack?: () => void;
    /** false داخل Host الذي يملك قفل التمرير */
    lockBodyScroll?: boolean;
};

/**
 * قشرة إقلاع احترافية — هندسة مطابقة لـ ForumAppBar + منطقة تغذية هادئة.
 * تُستبدل بالمحتوى الكامل دون «إعادة بناء» الشاشة من الصفر (نمط RepositoryInstantShell).
 */
export function ForumBootShell({
    onBack,
    lockBodyScroll = true,
}: ForumBootShellProps): React.ReactElement {
    useBodyScrollLock(lockBodyScroll && Boolean(onBack));

    return (
        <div
            className="hami-forum-silk-root relative flex h-full w-full flex-col overflow-hidden"
            style={FORUM_PAGE_BG}
            dir="rtl"
            data-testid="forum-boot-shell"
            data-forum-boot-shell="1"
            data-forum-silk="1"
            role="dialog"
            aria-modal="true"
            aria-label="منتدى الزملاء"
            aria-busy="true"
        >
            <div className={`${FORUM_APP_BAR} shrink-0`}>
                <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className={FORUM_ICON_BTN}
                            aria-label="رجوع"
                            data-testid="forum-boot-shell-back"
                        >
                            <HomeArrowRightIcon size={18} />
                        </button>
                    ) : null}
                    <h1 className={`${FORUM_TEXT_PRIMARY} truncate text-lg font-bold`}>منتدى الزملاء</h1>
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
                        <span className="text-sm text-[#9AA3B2]/70">ابحث في المنشورات والمستودع...</span>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden pt-1">
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

            <span className="sr-only">جاري تجهيز المنتدى</span>
        </div>
    );
}

/** توافق مع الاستيرادات السابقة */
export { ForumBootShell as ForumChromeShell };
