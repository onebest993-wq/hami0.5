import React from 'react';
import { User } from '@/app/components/ui/icons/User';
import { BadgeCheck } from '@/app/components/ui/icons/BadgeCheck';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Edit2 } from '@/app/components/ui/icons/Edit2';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import {
    FORUM_ACCENT_CHIP,
    FORUM_GHOST_BTN,
    FORUM_TEXT_APRICOT,
} from '../forumPlumTheme';
import { COMMENT_ACTION_HIT_AREA } from '../forumCommentRowLayout';
import { ForumCommentRowIdentity } from './ForumCommentRowIdentity';

export function ForumCommentRowHeader({
    comment,
    post,
    currentUserId,
    followingIds,
    userStats,
    isBest,
    canSelectBest,
    showEditComment,
    showDeleteComment,
    isDeletingComment,
    onOpenProfile,
    onFollow,
    onToggleBestAnswer,
    onSetConfirmDeleteId,
    onSetEditingCommentId,
    onSetEditContent,
    onDeleteComment,
    setIsDeletingComment,
}: {
    comment: CommunityComment;
    post: CommunityPost;
    currentUserId: string;
    followingIds: Set<string>;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    isBest: boolean;
    canSelectBest: boolean;
    showEditComment: boolean;
    showDeleteComment: boolean;
    isDeletingComment: boolean;
    onOpenProfile?: (userId: string, displayName?: string) => void;
    onFollow: (targetUserId: string) => void;
    onToggleBestAnswer: (postId: string, commentId: string) => void;
    onSetConfirmDeleteId: (id: string | null) => void;
    onSetEditingCommentId: (id: string | null) => void;
    onSetEditContent: (value: string) => void;
    onDeleteComment: (postId: string, commentId: string) => Promise<void> | void;
    setIsDeletingComment: (value: boolean) => void;
}) {
    const commentAuthorId = comment.authorId || comment.author_id || '';

    return (
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
            <span className="text-white/30 text-xs">{formatRelativeTime(comment.createdAt)}</span>
            <div className="flex-1" />
            {isBest && (
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${FORUM_ACCENT_CHIP}`}>
                    <BadgeCheck size={12} />
                    أفضل إجابة
                </span>
            )}
            {canSelectBest && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleBestAnswer(post.id, comment.id);
                    }}
                    className={`${COMMENT_ACTION_HIT_AREA} text-[10px] px-2 py-1 rounded-full border ${
                        isBest ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}` : `${FORUM_GHOST_BTN} text-[11px] px-2.5 py-1`
                    }`}
                    title="تمييز أفضل إجابة"
                >
                    {isBest ? 'إلغاء' : 'أفضل'}
                </button>
            )}
            {(showEditComment || showDeleteComment) && (
                <div className="flex gap-1">
                    {showEditComment && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onSetConfirmDeleteId(null);
                                onSetEditingCommentId(comment.id);
                                onSetEditContent(comment.content);
                            }}
                            disabled={isDeletingComment}
                            className={`${COMMENT_ACTION_HIT_AREA} text-[10px] px-2 py-1 rounded-full ${FORUM_GHOST_BTN} ${
                                isDeletingComment ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title="تعديل التعليق"
                        >
                            <Edit2 size={10} />
                        </button>
                    )}
                    {showDeleteComment && (
                        <button
                            type="button"
                            onClick={async (event) => {
                                event.stopPropagation();
                                if (isDeletingComment) return;
                                onSetConfirmDeleteId(null);
                                setIsDeletingComment(true);
                                try {
                                    await onDeleteComment(post.id, comment.id);
                                } finally {
                                    setIsDeletingComment(false);
                                }
                            }}
                            disabled={isDeletingComment}
                            className={`${COMMENT_ACTION_HIT_AREA} text-[10px] px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors ${
                                isDeletingComment ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title="حذف التعليق"
                        >
                            {isDeletingComment ? 'جاري الحذف...' : <Trash2 size={10} />}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
