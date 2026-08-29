import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { BellRing } from '@/app/components/ui/icons/BellRing';
import { Copy } from '@/app/components/ui/icons/Copy';
import { Flag } from '@/app/components/ui/icons/Flag';
import { FolderOpen } from '@/app/components/ui/icons/FolderOpen';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Pin } from '@/app/components/ui/icons/Pin';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Unlock } from '@/app/components/ui/icons/Unlock';
import { VolumeX } from '@/app/components/ui/icons/VolumeX';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

export type QuestionCardMoreMenuItem = {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    destructive?: boolean;
    active?: boolean;
};

type BuildQuestionCardMoreMenuItemsArgs = {
    post: CommunityPost;
    currentUserId: string | null;
    isOwner: boolean;
    isAdmin: boolean;
    isAnonymous: boolean;
    isPinned: boolean;
    isLocked: boolean;
    isThreadFollowing: boolean;
    canLockUnlock: boolean;
    canSaveToVault: boolean;
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

export function buildQuestionCardMoreMenuItems({
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
}: BuildQuestionCardMoreMenuItemsArgs): {
    items: QuestionCardMoreMenuItem[];
    destructiveItems: QuestionCardMoreMenuItem[];
} {
    const authorId = post.authorId || post.author_id || '';
    const items: QuestionCardMoreMenuItem[] = [];

    if (onCopyPostText) {
        items.push({
            id: 'copy',
            label: 'نسخ نص المنشور',
            icon: Copy,
            onClick: () => onCopyPostText(post.id),
        });
    }
    if (canSaveToVault) {
        items.push({
            id: 'vault',
            label: 'حفظ المرفق في المستودع',
            icon: FolderOpen,
            onClick: () => onSaveToVault!(post.id),
        });
    }
    if (onToggleThreadFollow && currentUserId) {
        items.push({
            id: 'thread-follow',
            label: isThreadFollowing ? 'إيقاف تنبيهات النقاش' : 'تنبيهات النقاش',
            icon: BellRing,
            onClick: () => onToggleThreadFollow(post.id),
            active: isThreadFollowing,
        });
    }
    if (canLockUnlock && onToggleLock) {
        items.push({
            id: 'lock',
            label: isLocked ? 'فتح النقاش' : 'قفل النقاش',
            icon: isLocked ? Lock : Unlock,
            onClick: () => onToggleLock(post.id),
            active: isLocked,
        });
    }
    if (isOwner) {
        items.push({
            id: 'edit',
            label: 'تعديل المنشور',
            icon: Pencil,
            onClick: () => onEdit(post.id),
        });
    }
    if (isAdmin) {
        items.push({
            id: 'pin',
            label: isPinned ? 'إلغاء التثبيت' : 'تثبيت المنشور',
            icon: Pin,
            onClick: () => onTogglePin(post.id),
            active: isPinned,
        });
    }
    if (!isOwner && !isAnonymous && onMuteUser) {
        items.push({
            id: 'mute',
            label: 'كتم هذا المحامي',
            icon: VolumeX,
            onClick: () => onMuteUser(authorId),
        });
    }

    const destructiveItems: QuestionCardMoreMenuItem[] = [];
    if (isOwner || isAdmin) {
        destructiveItems.push({
            id: 'delete',
            label: isAdmin && !isOwner ? 'حذف (إدارة)' : 'حذف المنشور',
            icon: Trash2,
            onClick: () => onDelete(post.id),
            destructive: true,
        });
    } else {
        destructiveItems.push({
            id: 'report',
            label: 'إبلاغ عن المنشور',
            icon: Flag,
            onClick: () => onReport(post.id),
            destructive: true,
        });
    }

    return { items, destructiveItems };
}
