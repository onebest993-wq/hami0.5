import React, { useState } from 'react';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { canDeleteComment, canEditComment } from '../communityPermissions';
import { FORUM_COMMENT_BEST, FORUM_COMMENT_CARD } from '../forumPlumTheme';
import {
    forumCommentRowIndentClass,
    forumCommentRowThreadClass,
} from '../forumCommentRowLayout';
import { ForumCommentRowEdit } from './ForumCommentRowEdit';
import { ForumCommentRowHeader } from './ForumCommentRowHeader';
import { ForumCommentRowFooter } from './ForumCommentRowFooter';

export type ForumCommentRowProps = {
    comment: CommunityComment;
    post: CommunityPost;
    depth: number;
    forceBestStyle: boolean;
    bestCommentId: string | null;
    currentUserId: string;
    isAdmin: boolean;
    isLocked: boolean;
    canSelectBest: boolean;
    followingIds: Set<string>;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    mutedUserIds?: Set<string>;
    editingCommentId: string | null;
    editContent: string;
    confirmDeleteId: string | null;
    onSetEditingCommentId: (id: string | null) => void;
    onSetEditContent: (value: string) => void;
    onSetConfirmDeleteId: (id: string | null) => void;
    onSetReplyingToCommentId: (id: string) => void;
    onFollow: (targetUserId: string) => void;
    onToggleBestAnswer: (postId: string, commentId: string) => void;
    onEditComment: (postId: string, commentId: string, newContent: string) => Promise<boolean> | boolean | void;
    onDeleteComment: (postId: string, commentId: string) => Promise<void> | void;
    onToggleCommentUpvote?: (commentId: string) => void;
    onReportComment?: (commentId: string) => void;
    onMuteUser?: (userId: string) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
};

export function ForumCommentRow(props: ForumCommentRowProps) {
    const {
        comment: c,
        post,
        depth,
        forceBestStyle,
        bestCommentId,
        currentUserId,
        isAdmin,
        isLocked,
        canSelectBest,
        followingIds,
        userStats,
        mutedUserIds,
        editingCommentId,
        editContent,
        confirmDeleteId,
        onSetEditingCommentId,
        onSetEditContent,
        onSetConfirmDeleteId,
        onSetReplyingToCommentId,
        onFollow,
        onToggleBestAnswer,
        onEditComment,
        onDeleteComment,
        onToggleCommentUpvote,
        onReportComment,
        onMuteUser,
        onOpenProfile,
    } = props;
    void confirmDeleteId;
    const isBest = forceBestStyle || (!!bestCommentId && c.id === bestCommentId);
    const commentAuthorId = c.authorId || c.author_id || '';
    const postAuthorId = post.authorId || post.author_id || '';
    const isCommentAuthor = currentUserId === commentAuthorId;
    const showDeleteComment = canDeleteComment(post, c, currentUserId, isAdmin);
    const showEditComment = canEditComment(c, currentUserId, post);
    const indentClass = forumCommentRowIndentClass(depth);
    const threadClass = forumCommentRowThreadClass(depth);
    const isEditing = editingCommentId === c.id;
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isDeletingComment, setIsDeletingComment] = useState(false);

    if (isEditing) {
        return (
            <ForumCommentRowEdit
                comment={c}
                post={post}
                indentClass={indentClass}
                threadClass={threadClass}
                currentUserId={currentUserId}
                followingIds={followingIds}
                userStats={userStats}
                editContent={editContent}
                isSavingEdit={isSavingEdit}
                onOpenProfile={onOpenProfile}
                onFollow={onFollow}
                onSetEditContent={onSetEditContent}
                onSetEditingCommentId={onSetEditingCommentId}
                onEditComment={onEditComment}
                setIsSavingEdit={setIsSavingEdit}
            />
        );
    }

    return (
        <div
            className={`${indentClass} ${threadClass} group/comment rounded-2xl p-4 border transition-colors ${
                isBest ? FORUM_COMMENT_BEST : `${FORUM_COMMENT_CARD}`
            }`}
        >
            <ForumCommentRowHeader
                comment={c}
                post={post}
                currentUserId={currentUserId}
                followingIds={followingIds}
                userStats={userStats}
                isBest={isBest}
                canSelectBest={canSelectBest}
                showEditComment={showEditComment}
                showDeleteComment={showDeleteComment}
                isDeletingComment={isDeletingComment}
                onOpenProfile={onOpenProfile}
                onFollow={onFollow}
                onToggleBestAnswer={onToggleBestAnswer}
                onSetConfirmDeleteId={onSetConfirmDeleteId}
                onSetEditingCommentId={onSetEditingCommentId}
                onSetEditContent={onSetEditContent}
                onDeleteComment={onDeleteComment}
                setIsDeletingComment={setIsDeletingComment}
            />
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
            <ForumCommentRowFooter
                comment={c}
                currentUserId={currentUserId}
                isLocked={isLocked}
                isCommentAuthor={isCommentAuthor}
                commentAuthorId={commentAuthorId}
                postAuthorId={postAuthorId}
                mutedUserIds={mutedUserIds}
                onSetReplyingToCommentId={onSetReplyingToCommentId}
                onToggleCommentUpvote={onToggleCommentUpvote}
                onReportComment={onReportComment}
                onMuteUser={onMuteUser}
            />
        </div>
    );
}
