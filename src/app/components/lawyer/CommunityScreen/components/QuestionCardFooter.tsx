import {
    ArrowUp, MessageCircle, Link2, Bookmark,
} from '@/app/components/ui/lucideIcons';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { canUpvotePost } from '../communityPermissions';
import {
    FORUM_ACCENT_CHIP,
    FORUM_INTERACT_BTN,
    FORUM_INTERACT_ICON,
    FORUM_INTERACT_ICON_ACTIVE,
    FORUM_INTERACT_LABEL,
    FORUM_INTERACT_LABEL_ACTIVE,
    FORUM_TEXT_APRICOT,
} from '../forumPlumTheme';

export type QuestionCardFooterProps = {
    post: CommunityPost;
    currentUserId: string | null;
    isUpvoted: boolean;
    upvoteCount: number;
    isBookmarked?: boolean;
    onToggleBookmark?: (postId: string) => void;
    onToggleUpvote: (postId: string) => void;
    onCommentClick: (postId: string) => void;
    onShare: (postId: string) => void;
};

export function QuestionCardFooter({
    post,
    currentUserId,
    isUpvoted,
    upvoteCount,
    isBookmarked = false,
    onToggleBookmark,
    onToggleUpvote,
    onCommentClick,
    onShare,
}: QuestionCardFooterProps) {
    const canUpvote = Boolean(currentUserId && canUpvotePost(post, currentUserId));
    const commentCount = post.comments.length;

    return (
        <div className="mt-2 flex items-center gap-1 sm:gap-2 min-w-0">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onToggleUpvote(post.id);
                }}
                aria-disabled={!canUpvote}
                className={`group/up ${FORUM_INTERACT_BTN} px-2.5 sm:px-3 shrink-0 ${!canUpvote ? 'opacity-50' : ''}`}
                title={
                    !currentUserId
                        ? 'سجّل الدخول للتصويت'
                        : !canUpvote
                          ? 'لا يمكنك التصويت على منشورك'
                          : 'تصويت'
                }
            >
                <ArrowUp
                    size={20}
                    className={`transition-colors duration-300 ${isUpvoted ? FORUM_INTERACT_ICON_ACTIVE : FORUM_INTERACT_ICON}`}
                />
                <span className={isUpvoted ? FORUM_INTERACT_LABEL_ACTIVE : FORUM_INTERACT_LABEL}>
                    {upvoteCount}
                </span>
            </button>

            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onCommentClick(post.id);
                }}
                className={`group/c ${FORUM_INTERACT_BTN} px-2.5 sm:px-3 min-w-0 shrink-0`}
                title="التعليقات"
            >
                <MessageCircle size={20} className={`${FORUM_INTERACT_ICON} group-hover/c:text-[#8A4D5C] shrink-0`} />
                <span className={`${FORUM_INTERACT_LABEL} group-hover/c:text-[#E6E0E4] truncate`}>
                    <span className="tabular-nums">{commentCount}</span>
                    <span className="hidden sm:inline"> تعليق</span>
                </span>
            </button>

            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onShare(post.id);
                }}
                className={`group/s ${FORUM_INTERACT_BTN} px-2.5 sm:px-3 shrink-0`}
                title="مشاركة"
                aria-label="مشاركة"
            >
                <Link2 size={20} className={`${FORUM_INTERACT_ICON} group-hover/s:text-[#8A4D5C]`} />
                <span className={`${FORUM_INTERACT_LABEL} group-hover/s:text-[#E6E0E4]`}>مشاركة</span>
            </button>

            {onToggleBookmark && currentUserId ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleBookmark(post.id);
                    }}
                    className={`${FORUM_INTERACT_BTN} px-2.5 sm:px-3 shrink-0 ms-auto ${
                        isBookmarked ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}` : ''
                    }`}
                    title={isBookmarked ? 'إلغاء الحفظ' : 'حفظ للقراءة لاحقاً'}
                    aria-label={isBookmarked ? 'إلغاء الحفظ' : 'حفظ للقراءة لاحقاً'}
                >
                    <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                    <span className={isBookmarked ? FORUM_INTERACT_LABEL_ACTIVE : FORUM_INTERACT_LABEL}>
                        {isBookmarked ? 'محفوظ' : 'حفظ'}
                    </span>
                </button>
            ) : null}
        </div>
    );
}
