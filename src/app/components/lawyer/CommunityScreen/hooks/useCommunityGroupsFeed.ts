import { useCommunityGroupsCatalog } from './useCommunityGroupsCatalog';
import { useCommunityGroupPostsFeed } from './useCommunityGroupPostsFeed';
import type { CommunitySection } from '../communitySectionState';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';

export type UseCommunityGroupsFeedParams = {
    lists: Pick<CommunityDualPostLists, 'groupPosts' | 'setGroupPosts' | 'groupPostsRef'>;
    mutedIds: Set<string>;
    currentUserId: string | null;
    authIsLoading: boolean;
    activeSection: CommunitySection;
    surfaceOpen?: boolean;
};

/** واجهة عامة مستقرة — كتالوج المجموعات + نافذة منشورات المجموعة */
export function useCommunityGroupsFeed({
    lists,
    mutedIds,
    currentUserId,
    authIsLoading,
    activeSection,
    surfaceOpen = true,
}: UseCommunityGroupsFeedParams) {
    const catalog = useCommunityGroupsCatalog({
        currentUserId,
        authIsLoading,
        activeSection,
        surfaceOpen,
    });
    const postsFeed = useCommunityGroupPostsFeed({
        lists,
        mutedIds,
        currentUserId,
        activeGroupId: catalog.activeGroupId,
        surfaceOpen,
    });

    return {
        ...catalog,
        ...postsFeed,
    };
}
