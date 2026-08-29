import type { Dispatch, SetStateAction } from 'react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

export type UseCommunityScreenPostModerationParams = {
    currentUserId: string | null;
    isAdmin: boolean;
    authUser: { user_metadata?: { fullName?: string }; email?: string | null; id?: string } | null;
    persistedUser: { id?: string | null; email?: string | null } | null;
    findPostById: (postId: string) => CommunityPost | undefined;
    updatePostList: (postId: string, updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
    bookmarkedIds: Set<string>;
    setBookmarkedIds: Dispatch<SetStateAction<Set<string>>>;
};
