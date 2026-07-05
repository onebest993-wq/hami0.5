import {
    Trash2, Pencil, Flag, Pin, Lock, Unlock, VolumeX, BellRing, Bookmark, Copy, FolderOpen, Download,
} from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_ACCENT_CHIP, FORUM_ICON_BTN, FORUM_TEXT_APRICOT } from '../forumPlumTheme';

export type QuestionCardToolbarProps = {
    post: CommunityPost;
    currentUserId: string | null;
    isOwner: boolean;
    isAdmin: boolean;
    isAnonymous: boolean;
    isPinned: boolean;
    isLocked: boolean;
    isBookmarked: boolean;
    isThreadFollowing: boolean;
    canLockUnlock: boolean;
    onToggleLock?: (postId: string) => void;
    onCopyPostText?: (postId: string) => void;
    onSaveToVault?: (postId: string) => void;
    onSaveToDevice?: (postId: string) => void;
    onToggleBookmark?: (postId: string) => void;
    onToggleThreadFollow?: (postId: string) => void;
    onMuteUser?: (userId: string) => void;
    onTogglePin: (postId: string) => void;
    onEdit: (postId: string) => void;
    onDelete: (postId: string) => void;
    onReport: (postId: string) => void;
};

export function QuestionCardToolbar({
    post,
    currentUserId,
    isOwner,
    isAdmin,
    isAnonymous,
    isPinned,
    isLocked,
    isBookmarked,
    isThreadFollowing,
    canLockUnlock,
    onToggleLock,
    onCopyPostText,
    onSaveToVault,
    onSaveToDevice,
    onToggleBookmark,
    onToggleThreadFollow,
    onMuteUser,
    onTogglePin,
    onEdit,
    onDelete,
    onReport,
}: QuestionCardToolbarProps) {
    const authorId = post.authorId || post.author_id || '';
    const canSaveToVault = post.attachment && (post.attachment.type === 'image' || post.attachment.type === 'document');

    return (
        <>
            {canLockUnlock && onToggleLock ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleLock(post.id);
                    }}
                    className={`${FORUM_ICON_BTN} ${
                        isLocked
                            ? 'bg-red-950/40 text-red-300 hover:bg-red-950/60'
                            : ''
                    }`}
                    title={isLocked ? 'فتح النقاش' : 'قفل النقاش'}
                >
                    {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                </button>
            ) : null}
            {onCopyPostText ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onCopyPostText(post.id);
                    }}
                    className={FORUM_ICON_BTN}
                    title="نسخ نص المنشور"
                >
                    <Copy size={15} />
                </button>
            ) : null}
            {onSaveToVault && currentUserId && canSaveToVault ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onSaveToVault(post.id);
                    }}
                    className={FORUM_ICON_BTN}
                    title="حفظ المرفق في المستودع الذكي"
                >
                    <FolderOpen size={15} />
                </button>
            ) : null}
            {onSaveToDevice && post.attachment ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onSaveToDevice(post.id);
                    }}
                    className={FORUM_ICON_BTN}
                    title="حفظ في الجهاز"
                >
                    <Download size={15} />
                </button>
            ) : null}
            {onToggleBookmark && currentUserId ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleBookmark(post.id);
                    }}
                    className={`${FORUM_ICON_BTN} ${
                        isBookmarked
                            ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}`
                            : ''
                    }`}
                    title={isBookmarked ? 'إلغاء الحفظ' : 'حفظ للقراءة لاحقاً'}
                >
                    <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>
            ) : null}
            {onToggleThreadFollow && currentUserId ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleThreadFollow(post.id);
                    }}
                    className={`${FORUM_ICON_BTN} ${
                        isThreadFollowing
                            ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}`
                            : ''
                    }`}
                    title={isThreadFollowing ? 'إلغاء متابعة النقاش' : 'متابعة النقاش — تنبيهات التعليقات'}
                >
                    <BellRing size={15} />
                </button>
            ) : null}
            {!isOwner && !isAnonymous && onMuteUser ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onMuteUser(authorId);
                    }}
                    className={FORUM_ICON_BTN}
                    title="كتم منشورات هذا المستخدم"
                >
                    <VolumeX size={15} />
                </button>
            ) : null}
            {isAdmin ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onTogglePin(post.id);
                    }}
                    className={`${FORUM_ICON_BTN} ${
                        isPinned
                            ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/60'
                            : ''
                    }`}
                    title={isPinned ? 'إلغاء التثبيت' : 'تثبيت المنشور'}
                >
                    <Pin size={16} />
                </button>
            ) : null}
            {isOwner ? (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onEdit(post.id);
                        }}
                        className={FORUM_ICON_BTN}
                        title="تعديل"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete(post.id);
                        }}
                        className={`${FORUM_ICON_BTN} bg-white/5 hover:bg-rose-500/15 text-white/40 hover:text-rose-300`}
                        title="حذف"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ) : isAdmin ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete(post.id);
                    }}
                    className={`${FORUM_ICON_BTN} bg-white/5 hover:bg-rose-500/15 text-white/40 hover:text-rose-300`}
                    title="حذف (إدارة)"
                >
                    <Trash2 size={16} />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onReport(post.id);
                    }}
                    className={`${FORUM_ICON_BTN} bg-white/5 hover:bg-rose-500/15 text-white/40 hover:text-rose-200`}
                    title="إبلاغ"
                >
                    <Flag size={16} />
                </button>
            )}
        </>
    );
}
