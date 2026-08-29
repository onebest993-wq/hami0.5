import React from 'react';
import { User } from '@/app/components/ui/icons/User';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import {
    FORUM_COMMENT_CARD,
    FORUM_GHOST_BTN,
    FORUM_PUBLISH_BTN_SM,
    FORUM_SURFACE_INPUT,
} from '../forumPlumTheme';
import { ForumCommentRowIdentity } from './ForumCommentRowIdentity';

export function ForumCommentRowEdit({
    comment,
    post,
    indentClass,
    threadClass,
    currentUserId,
    followingIds,
    userStats,
    editContent,
    isSavingEdit,
    onOpenProfile,
    onFollow,
    onSetEditContent,
    onSetEditingCommentId,
    onEditComment,
    setIsSavingEdit,
}: {
    comment: CommunityComment;
    post: CommunityPost;
    indentClass: string;
    threadClass: string;
    currentUserId: string;
    followingIds: Set<string>;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    editContent: string;
    isSavingEdit: boolean;
    onOpenProfile?: (userId: string, displayName?: string) => void;
    onFollow: (targetUserId: string) => void;
    onSetEditContent: (value: string) => void;
    onSetEditingCommentId: (id: string | null) => void;
    onEditComment: (postId: string, commentId: string, newContent: string) => Promise<boolean> | boolean | void;
    setIsSavingEdit: (value: boolean) => void;
}) {
    const commentAuthorId = comment.authorId || comment.author_id || '';

    return (
        <div className={`${indentClass} ${threadClass} ${FORUM_COMMENT_CARD} border-[#E6C673]/30`}>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                    <User size={14} />
                </div>
                <ForumCommentRowIdentity
                    commentAuthorId={commentAuthorId}
                    currentUserId={currentUserId}
                    authorName={comment.authorName}
                    onOpenProfile={onOpenProfile}
                    onFollow={onFollow}
                    followingIds={followingIds}
                    userStats={userStats}
                />
                <span className="text-white/20 text-xs">•</span>
                <span className="text-white/30 text-xs">تعديل...</span>
            </div>
            <textarea
                value={editContent}
                onChange={(e) => onSetEditContent(e.target.value)}
                className={`w-full text-sm rounded-xl p-3 outline-none resize-none ${FORUM_SURFACE_INPUT}`}
                rows={3}
            />
            <div className="flex gap-2 mt-3">
                <button
                    type="button"
                    onClick={async (event) => {
                        event.stopPropagation();
                        const nextContent = editContent.trim();
                        if (!nextContent || isSavingEdit) {
                            return;
                        }
                        setIsSavingEdit(true);
                        try {
                            const saved = await onEditComment(post.id, comment.id, nextContent);
                            if (saved !== false) {
                                onSetEditingCommentId(null);
                                onSetEditContent('');
                            }
                        } finally {
                            setIsSavingEdit(false);
                        }
                    }}
                    disabled={!editContent.trim() || isSavingEdit}
                    className={FORUM_PUBLISH_BTN_SM}
                >
                    {isSavingEdit ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onSetEditingCommentId(null);
                        onSetEditContent('');
                    }}
                    className={`text-[11px] px-3 py-1.5 rounded-full ${FORUM_GHOST_BTN}`}
                >
                    إلغاء
                </button>
            </div>
        </div>
    );
}
