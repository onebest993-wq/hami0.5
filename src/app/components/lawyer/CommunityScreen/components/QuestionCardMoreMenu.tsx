import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    BellRing,
    Copy,
    Flag,
    FolderOpen,
    Lock,
    MoreHorizontal,
    Pencil,
    Pin,
    Trash2,
    Unlock,
    VolumeX,
} from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_APP_BAR_ICON, FORUM_DROPDOWN_PANEL, FORUM_TEXT_APRICOT, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

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

type MenuItem = {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    destructive?: boolean;
    active?: boolean;
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
    const authorId = post.authorId || post.author_id || '';
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

    const items: MenuItem[] = [];

    if (onCopyPostText) {
        items.push({
            id: 'copy',
            label: '┘╪│╪« ┘╪╡ ╪د┘┘à┘╪┤┘ê╪▒',
            icon: Copy,
            onClick: () => onCopyPostText(post.id),
        });
    }
    if (canSaveToVault) {
        items.push({
            id: 'vault',
            label: '╪ص┘╪╕ ╪د┘┘à╪▒┘┘é ┘┘è ╪د┘┘à╪│╪ز┘ê╪»╪╣',
            icon: FolderOpen,
            onClick: () => onSaveToVault!(post.id),
        });
    }
    if (onToggleThreadFollow && currentUserId) {
        items.push({
            id: 'thread-follow',
            label: isThreadFollowing ? '╪ح┘è┘é╪د┘ ╪ز┘╪ذ┘è┘ç╪د╪ز ╪د┘┘┘é╪د╪┤' : '╪ز┘╪ذ┘è┘ç╪د╪ز ╪د┘┘┘é╪د╪┤',
            icon: BellRing,
            onClick: () => onToggleThreadFollow(post.id),
            active: isThreadFollowing,
        });
    }
    if (canLockUnlock && onToggleLock) {
        items.push({
            id: 'lock',
            label: isLocked ? '┘╪ز╪ص ╪د┘┘┘é╪د╪┤' : '┘é┘┘ ╪د┘┘┘é╪د╪┤',
            icon: isLocked ? Lock : Unlock,
            onClick: () => onToggleLock(post.id),
            active: isLocked,
        });
    }
    if (isOwner) {
        items.push({
            id: 'edit',
            label: '╪ز╪╣╪»┘è┘ ╪د┘┘à┘╪┤┘ê╪▒',
            icon: Pencil,
            onClick: () => onEdit(post.id),
        });
    }
    if (isAdmin) {
        items.push({
            id: 'pin',
            label: isPinned ? '╪ح┘╪║╪د╪ة ╪د┘╪ز╪س╪ذ┘è╪ز' : '╪ز╪س╪ذ┘è╪ز ╪د┘┘à┘╪┤┘ê╪▒',
            icon: Pin,
            onClick: () => onTogglePin(post.id),
            active: isPinned,
        });
    }
    if (!isOwner && !isAnonymous && onMuteUser) {
        items.push({
            id: 'mute',
            label: '┘â╪ز┘à ┘ç╪░╪د ╪د┘┘à╪ص╪د┘à┘è',
            icon: VolumeX,
            onClick: () => onMuteUser(authorId),
        });
    }

    const destructiveItems: MenuItem[] = [];
    if (isOwner || isAdmin) {
        destructiveItems.push({
            id: 'delete',
            label: isAdmin && !isOwner ? '╪ص╪░┘ (╪ح╪»╪د╪▒╪ر)' : '╪ص╪░┘ ╪د┘┘à┘╪┤┘ê╪▒',
            icon: Trash2,
            onClick: () => onDelete(post.id),
            destructive: true,
        });
    } else {
        destructiveItems.push({
            id: 'report',
            label: '╪ح╪ذ┘╪د╪║ ╪╣┘ ╪د┘┘à┘╪┤┘ê╪▒',
            icon: Flag,
            onClick: () => onReport(post.id),
            destructive: true,
        });
    }

    if (items.length === 0 && destructiveItems.length === 0) return null;

    const runItem = (item: MenuItem, event: React.MouseEvent) => {
        event.stopPropagation();
        item.onClick();
        close();
    };

    return (
        <div ref={rootRef} className="relative shrink-0" data-testid="forum-post-more-menu">
            <button
                type="button"
                aria-label="╪«┘è╪د╪▒╪د╪ز ╪د┘┘à┘╪┤┘ê╪▒"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((value) => !value);
                }}
                className={`${FORUM_APP_BAR_ICON} text-[#9AA3B2] hover:text-[#C9A86C]`}
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
                                        ? `${FORUM_TEXT_APRICOT} bg-[#C9A86C]/10`
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
