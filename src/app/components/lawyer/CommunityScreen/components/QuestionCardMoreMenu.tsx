import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from '@/app/components/ui/icons/MoreHorizontal';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_APP_BAR_ICON, FORUM_DROPDOWN_PANEL, FORUM_TEXT_APRICOT, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';
import {
    buildQuestionCardMoreMenuItems,
    type QuestionCardMoreMenuItem,
} from '../questionCardMoreMenuItems';

export type QuestionCardMoreMenuProps = {
    post: CommunityPost;
    currentUserId: string | null;
    isOwner: boolean;
    isAdmin: boolean;
    isAnonymous: boolean;
    isPinned: boolean;
    isLocked: boolean;
    isThreadFollowing: boolean;
    canLockUnlock: boolean;
    onToggleLock?: (postId: string) => void;
    onCopyPostText?: (postId: string) => void;
    onSaveToVault?: (postId: string) => void;
    onToggleThreadFollow?: (postId: string) => void;
    onMuteUser?: (userId: string) => void;
    onTogglePin: (postId: string) => void;
    onEdit: (postId: string) => void;
    onDelete: (postId: string) => void;
    onReport: (postId: string) => void;
};

export function QuestionCardMoreMenu({
    post,
    currentUserId,
    isOwner,
    isAdmin,
    isAnonymous,
    isPinned,
    isLocked,
    isThreadFollowing,
    canLockUnlock,
    onToggleLock,
    onCopyPostText,
    onSaveToVault,
    onToggleThreadFollow,
    onMuteUser,
    onTogglePin,
    onEdit,
    onDelete,
    onReport,
}: QuestionCardMoreMenuProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const canSaveToVault =
        Boolean(onSaveToVault && currentUserId && post.attachment) &&
        (post.attachment?.type === 'image' || post.attachment?.type === 'document');

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (!rootRef.current?.contains(target)) close();
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
        };
    }, [close, open]);

    const { items, destructiveItems } = buildQuestionCardMoreMenuItems({
        post,
        currentUserId,
        isOwner,
        isAdmin,
        isAnonymous,
        isPinned,
        isLocked,
        isThreadFollowing,
        canLockUnlock,
        canSaveToVault,
        onToggleLock,
        onCopyPostText,
        onSaveToVault,
        onToggleThreadFollow,
        onMuteUser,
        onTogglePin,
        onEdit,
        onDelete,
        onReport,
    });

    if (items.length === 0 && destructiveItems.length === 0) return null;

    const runItem = (item: QuestionCardMoreMenuItem, event: React.MouseEvent) => {
        event.stopPropagation();
        item.onClick();
        close();
    };

    return (
        <div ref={rootRef} className="relative shrink-0" data-testid="forum-post-more-menu">
            <button
                type="button"
                aria-label="خيارات المنشور"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((value) => !value);
                }}
                className={`${FORUM_APP_BAR_ICON} text-[#9AA3B2] hover:text-[#E6C673]`}
            >
                <MoreHorizontal size={20} />
            </button>
            {open ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
                    <div
                        id={menuId}
                        role="menu"
                        className={`absolute top-full end-0 mt-2 z-50 w-56 py-1.5 ${FORUM_DROPDOWN_PANEL}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                role="menuitem"
                                onClick={(event) => runItem(item, event)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] text-right text-sm transition-colors touch-manipulation ${
                                    item.active
                                        ? `${FORUM_TEXT_APRICOT} bg-[#E6C673]/10`
                                        : `${FORUM_TEXT_PRIMARY} hover:bg-white/[0.06]`
                                }`}
                            >
                                <item.icon size={16} className="shrink-0 opacity-80" />
                                <span className="flex-1">{item.label}</span>
                            </button>
                        ))}
                        {items.length > 0 && destructiveItems.length > 0 ? (
                            <div className="my-1 border-t border-white/10" role="separator" />
                        ) : null}
                        {destructiveItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                role="menuitem"
                                onClick={(event) => runItem(item, event)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] text-right text-sm text-rose-300 hover:bg-rose-500/10 transition-colors touch-manipulation"
                            >
                                <item.icon size={16} className="shrink-0" />
                                <span className="flex-1">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}
