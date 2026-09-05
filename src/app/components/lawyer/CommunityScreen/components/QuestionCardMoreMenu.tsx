import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from '@/app/components/ui/icons/MoreHorizontal';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_APP_BAR_ICON } from '../forumPlumTheme';
import { buildQuestionCardMoreMenuItems } from '../questionCardMoreMenuItems';
import { QuestionCardMoreMenuPanel } from './QuestionCardMoreMenuPanel';

export type QuestionCardMoreMenuProps = {
    post: CommunityPost;
    currentUserId: string | null;
    isOwner: boolean;
    isAdmin: boolean;
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
                <QuestionCardMoreMenuPanel
                    menuId={menuId}
                    items={items}
                    destructiveItems={destructiveItems}
                    onClose={close}
                    onRunItem={(item, event) => {
                        event.stopPropagation();
                        item.onClick();
                        close();
                    }}
                />
            ) : null}
        </div>
    );
}
