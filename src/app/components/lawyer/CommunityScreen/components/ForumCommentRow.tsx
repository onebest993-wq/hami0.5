import React, { useState } from 'react';
import { canDeleteComment, canEditComment } from '../communityPermissions';
import { FORUM_COMMENT_BEST, FORUM_COMMENT_CARD } from '../forumPlumTheme';
import {
    forumCommentRowIndentClass,
    forumCommentRowThreadClass,
} from '../forumCommentRowLayout';
import { ForumCommentRowEdit } from './ForumCommentRowEdit';
import { ForumCommentRowHeader } from './ForumCommentRowHeader';
import { ForumCommentRowFooter } from './ForumCommentRowFooter';
import type { ForumCommentRowProps } from './ForumCommentRow.types';

export type { ForumCommentRowProps } from './ForumCommentRow.types';

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
            className={`${indentClass} ${threadClass} group/comment border transition-colors ${
                isBest ? FORUM_COMMENT_BEST : FORUM_COMMENT_CARD
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
