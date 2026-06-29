import {
    ArrowUp, MessageCircle, Link2,
} from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import {
    FORUM_INTERACT_BTN,
    FORUM_INTERACT_ICON,
    FORUM_INTERACT_ICON_ACTIVE,
    FORUM_INTERACT_LABEL,
    FORUM_INTERACT_LABEL_ACTIVE,
} from '../forumPlumTheme';

export type QuestionCardFooterProps = {
    post: CommunityPost;
    currentUserId: string | null;
    isUpvoted: boolean;
    upvoteCount: number;
    onToggleUpvote: (postId: string) => void;
    onCommentClick: (postId: string) => void;
    onShare: (postId: string) => void;
};

export function QuestionCardFooter({
    post,
    currentUserId,
    isUpvoted,
    upvoteCount,
    onToggleUpvote,
    onCommentClick,
    onShare,
}: QuestionCardFooterProps) {
    return (
        <div className="flex items-center gap-4 mt-2">
            <button
                type="button"
                onClick={() => onToggleUpvote(post.id)}
                className={`group/up ${FORUM_INTERACT_BTN}`}
                disabled={!currentUserId}
                title={!currentUserId ? 'سجّل الدخول للتصويت' : 'تصويت'}
            >
                <ArrowUp
                    size={20}
                    className={`transition-colors duration-300 ${isUpvoted ? FORUM_INTERACT_ICON_ACTIVE : FORUM_INTERACT_ICON}`}
                />
                <span className={isUpvoted ? FORUM_INTERACT_LABEL_ACTIVE : FORUM_INTERACT_LABEL}>{upvoteCount}</span>
            </button>

            <button type="button" onClick={() => onCommentClick(post.id)} className={`group/c ${FORUM_INTERACT_BTN}`}>
                <MessageCircle size={20} className={`${FORUM_INTERACT_ICON} group-hover/c:text-[#F0B896]`} />
                <span className={`${FORUM_INTERACT_LABEL} group-hover/c:text-[#E6E0E4]`}>
                    {post.comments.length} تعليقات زملاء
                </span>
            </button>

            <button type="button" onClick={() => onShare(post.id)} className={`group/s ${FORUM_INTERACT_BTN}`} title="مشاركة">
                <Link2 size={20} className={`${FORUM_INTERACT_ICON} group-hover/s:text-[#F0B896]`} />
                <span className={`${FORUM_INTERACT_LABEL} group-hover/s:text-[#E6E0E4]`}>مشاركة 🔗</span>
            </button>
        </div>
    );
}
