import { useForumInflightGuard } from './useForumInflightGuard';
import { useCommunityPostCommentSignals } from './useCommunityPostCommentSignals';
import { useCommunityPostCommentWrite } from './useCommunityPostCommentWrite';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

export function useCommunityPostCommentActions(
    params: Omit<UseCommunityPostActionsParams, 'onPostDeleted'>,
) {
    const { runInflight } = useForumInflightGuard();
    const write = useCommunityPostCommentWrite({ ...params, runInflight });
    const signals = useCommunityPostCommentSignals({ ...params, runInflight });

    return {
        handleAddComment: write.handleAddComment,
        handleDeleteComment: write.handleDeleteComment,
        handleEditComment: write.handleEditComment,
        handleToggleBestAnswer: signals.handleToggleBestAnswer,
        handleToggleCommentUpvote: signals.handleToggleCommentUpvote,
        handleReportComment: signals.handleReportComment,
    };
}
