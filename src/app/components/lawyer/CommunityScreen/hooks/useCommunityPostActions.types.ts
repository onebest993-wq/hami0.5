import type { CommunityDualPostLists } from './useCommunityDualPostLists';

export type UseCommunityPostActionsParams = {
    lists: Pick<
        CommunityDualPostLists,
        | 'postsRef'
        | 'groupPostsRef'
        | 'setPosts'
        | 'setGroupPosts'
        | 'findPostById'
        | 'updatePostList'
        | 'removePostFromList'
    >;
    currentUserId: string | null;
    isAdmin: boolean;
    isBanned: boolean;
    authUser: { user_metadata?: { fullName?: string }; email?: string } | null;
    commentingPostId: string | null;
    onThreadSubscribed?: (postId: string) => void;
    onPostDeleted?: (postId: string) => void;
};
