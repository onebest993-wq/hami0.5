import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { FORUM_ICON_BTN, FORUM_PANEL, FORUM_TEXT_PRIMARY } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { getForumOverlayPortalRoot } from '@/app/components/lawyer/CommunityScreen/forumOverlayPortal';
import { ForumLazySectionInstantSlots } from '@/app/components/lawyer/CommunityScreen/components/ForumLazySectionInstantSlots';

type ForumFollowingInstantCoverProps = {
    onClose: () => void;
};

/** غطاء Suspense للوحة المتابعة — نفس طبقة الورقة، بلا motion. */
export function ForumFollowingInstantCover({ onClose }: ForumFollowingInstantCoverProps) {
    const layer = (
        <>
            <button
                type="button"
                className="fixed inset-0 z-[120] bg-black/50"
                aria-label="إغلاق"
                onClick={onClose}
            />
            <div
                data-testid="forum-following-panel"
                className={`fixed inset-x-0 bottom-0 z-[121] max-h-[min(78dvh,100%)] rounded-t-2xl ${FORUM_PANEL} flex flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
                role="dialog"
                aria-modal="true"
                aria-busy="true"
                aria-label="قائمة المتابعة"
                dir="rtl"
            >
                <div className="flex items-center justify-between gap-3 border-b border-[#2A3344]/40 px-3 pb-2 pt-3">
                    <h3 className={`${FORUM_TEXT_PRIMARY} text-sm font-bold`}>المتابعة</h3>
                    <button type="button" onClick={onClose} aria-label="إغلاق" className={FORUM_ICON_BTN}>
                        <X size={16} />
                    </button>
                </div>
                <div className="space-y-2 overflow-hidden px-4 py-3">
                    <ForumLazySectionInstantSlots framed={false} count={3} />
                </div>
            </div>
        </>
    );

    if (typeof document === 'undefined') return layer;
    return createPortal(layer, getForumOverlayPortalRoot());
}
