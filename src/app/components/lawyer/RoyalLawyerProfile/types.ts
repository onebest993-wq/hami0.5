import type { LawyerProfileHeader, ProfileAction } from '@/app/services/lawyer-cloud';

export type ForumProfileFollowState = {
    isFollowing: boolean;
    followerCount?: number;
    postCount?: number;
    onToggle: () => void;
    busy?: boolean;
};

export type RoyalLawyerProfileProps = {
    isScreenMode?: boolean;
    onBack?: () => void;
    /** دورة فتح التبويب — لإعادة قياس الأداء عند كل دخول */
    perfOpenEpoch?: number;
    /** false عند keep-alive مخفي — يوقف الحركات الثقيلة */
    screenActive?: boolean;
    /** عرض ملف محامٍ آخر (من المنتدى) */
    targetUserId?: string | null;
    displayNameHint?: string;
    forumFollow?: ForumProfileFollowState;
};

export type EditDraft = {
    header: LawyerProfileHeader;
    actions: ProfileAction[];
    gallery: string[];
};
