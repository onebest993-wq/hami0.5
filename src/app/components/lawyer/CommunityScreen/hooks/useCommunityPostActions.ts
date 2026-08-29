import { useCommunityPostCommentActions } from './useCommunityPostCommentActions';
import { useCommunityPostEngagement } from './useCommunityPostEngagement';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

export type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

export function useCommunityPostActions(params: UseCommunityPostActionsParams) {
    const engagement = useCommunityPostEngagement(params);
    const comments = useCommunityPostCommentActions(params);

    return {
        handleToggleUpvote: engagement.handleToggleUpvote,
        handleAddComment: comments.handleAddComment,
        handleDeleteComment: comments.handleDeleteComment,
        handleEditComment: comments.handleEditComment,
        handleDeletePost: engagement.handleDeletePost,
        requestDeletePost: engagement.requestDeletePost,
        confirmDeletePost: engagement.confirmDeletePost,
        pendingDeletePostId: engagement.pendingDeletePostId,
        pendingDeletePost: engagement.pendingDeletePost,
        deletingPost: engagement.deletingPost,
        cancelDeletePostRequest: engagement.cancelDeletePostRequest,
        handleSharePost: engagement.handleSharePost,
        handleToggleBestAnswer: comments.handleToggleBestAnswer,
        handleToggleCommentUpvote: comments.handleToggleCommentUpvote,
        handleReportComment: comments.handleReportComment,
    };
}
