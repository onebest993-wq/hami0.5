import { useCommunityPostCommentAdd } from './useCommunityPostCommentAdd';
import { useCommunityPostCommentMutate } from './useCommunityPostCommentMutate';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

type CommentWriteParams = Omit<UseCommunityPostActionsParams, 'onPostDeleted' | 'commentingPostId'> & {
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityPostCommentWrite(params: CommentWriteParams) {
    const add = useCommunityPostCommentAdd(params);
    const mutate = useCommunityPostCommentMutate(params);

    return {
        handleAddComment: add.handleAddComment,
        handleDeleteComment: mutate.handleDeleteComment,
        handleEditComment: mutate.handleEditComment,
    };
}
