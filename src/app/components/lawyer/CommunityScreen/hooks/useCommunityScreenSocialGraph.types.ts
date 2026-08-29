import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';

export type UseCommunityScreenSocialGraphParams = {
    currentUserId: string | null;
    authUser: { user_metadata?: { fullName?: string }; email?: string | null } | null;
    posts: CommunityPost[];
    showFollowingPanel: boolean;
    bumpFollowerCount: (userId: string, delta: number) => void;
    toggleMute: (userId: string) => void;
    isMuted: (userId: string) => boolean;
    surfaceOpen?: boolean;
};

export type SocialFollowerRow = { followerId: string; createdAt: string };

export type SocialGraphRecords = {
    followingRecords: ForumFollowRecord[];
    followerRecords: SocialFollowerRow[];
};
