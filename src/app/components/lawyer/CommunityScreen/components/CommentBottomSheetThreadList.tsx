import React, { type RefObject } from 'react';
import { MessageSquare } from '@/app/components/ui/icons/MessageSquare';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { ForumCommentRow } from './ForumCommentRow';

type CommentBottomSheetThreadListProps = {
    post: CommunityPost;
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
    bestComment: CommunityComment | null;
    bestCommentId: string | null;
    excludedTopIds: Set<string>;
    windowedTopThreads: CommunityComment[];
    hiddenThreadCount: number;
    commentSentinelRef: RefObject<HTMLDivElement | null>;
    childrenByParentId: Map<string | null, CommunityComment[]>;
    onSetEditingCommentId: (id: string | null) => void;
    onSetEditContent: (value: string) => void;
    onSetConfirmDeleteId: (id: string | null) => void;
    onSetReplyingToCommentId: (id: string | null) => void;
    onFollow: (targetUserId: string) => void;
    onToggleBestAnswer: (postId: string, commentId: string) => void;
    onEditComment: (postId: string, commentId: string, newContent: string) => Promise<boolean> | boolean | void;
    onDeleteComment: (postId: string, commentId: string) => Promise<void> | void;
    onToggleCommentUpvote?: (commentId: string) => void;
    onReportComment?: (commentId: string) => void;
    onMuteUser?: (userId: string) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
};

export function CommentBottomSheetThreadList(props: CommentBottomSheetThreadListProps) {
    const {
        post,
        bestComment,
        excludedTopIds,
        windowedTopThreads,
        hiddenThreadCount,
        commentSentinelRef,
        childrenByParentId,
    } = props;

    const renderComment = (c: CommunityComment, depth: number, forceBestStyle: boolean) => (
        <ForumCommentRow
            key={c.id}
            comment={c}
            post={post}
            depth={depth}
            forceBestStyle={forceBestStyle}
            bestCommentId={props.bestCommentId}
            currentUserId={props.currentUserId}
            isAdmin={props.isAdmin}
            isLocked={props.isLocked}
            canSelectBest={props.canSelectBest}
            followingIds={props.followingIds}
            userStats={props.userStats}
            mutedUserIds={props.mutedUserIds}
            editingCommentId={props.editingCommentId}
            editContent={props.editContent}
            confirmDeleteId={props.confirmDeleteId}
            onSetEditingCommentId={props.onSetEditingCommentId}
            onSetEditContent={props.onSetEditContent}
            onSetConfirmDeleteId={props.onSetConfirmDeleteId}
            onSetReplyingToCommentId={props.onSetReplyingToCommentId}
            onFollow={props.onFollow}
            onToggleBestAnswer={props.onToggleBestAnswer}
            onEditComment={props.onEditComment}
            onDeleteComment={props.onDeleteComment}
            onToggleCommentUpvote={props.onToggleCommentUpvote}
            onReportComment={props.onReportComment}
            onMuteUser={props.onMuteUser}
            onOpenProfile={props.onOpenProfile}
        />
    );

    const renderThread = (parentId: string | null, depth: number, excluded: Set<string>) => {
        const kids = childrenByParentId.get(parentId) ?? [];
        return kids
            .filter((c) => !excluded.has(c.id))
            .map((c) => (
                <React.Fragment key={c.id}>
                    {renderComment(c, depth, false)}
                    {renderThread(c.id, Math.min(depth + 1, 3), excluded)}
                </React.Fragment>
            ));
    };

    return (
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-3">
            {post.comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-80">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <MessageSquare size={32} className="text-white/20" />
                    </div>
                    <div>
                        <p className="text-white font-bold mb-1">لا توجد تعليقات بعد</p>
                        <p className="text-white/40 text-sm">ابدأ النقاش بشكل مهني وآمن</p>
                    </div>
                </div>
            ) : (
                <>
                    {bestComment ? (
                        <>
                            {renderComment(bestComment, 0, true)}
                            {renderThread(bestComment.id, 1, new Set())}
                        </>
                    ) : null}

                    {windowedTopThreads.map((c) => (
                        <React.Fragment key={c.id}>
                            {renderComment(c, 0, false)}
                            {renderThread(c.id, 1, excludedTopIds)}
                        </React.Fragment>
                    ))}

                    {hiddenThreadCount > 0 ? (
                        <div
                            ref={commentSentinelRef}
                            className="h-1"
                            aria-hidden
                            data-testid="forum-comment-window-sentinel"
                        />
                    ) : null}
                </>
            )}
        </div>
    );
}
