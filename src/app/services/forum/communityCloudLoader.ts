import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';

type CommunityCloudModule = typeof import('@/app/services/cloud/lawyerCommunityCloud');

let communityCloudModulePromise: Promise<CommunityCloudModule> | null = null;

function loadCommunityCloudModule(): Promise<CommunityCloudModule> {
    if (!communityCloudModulePromise) {
        communityCloudModulePromise = import('@/app/services/cloud/lawyerCommunityCloud');
    }
    return communityCloudModulePromise;
}

/** قائمة منشورات المنتدى — dynamic import لعدم ربط الواجهة بـ lawyer-cloud monolith. */
export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
    const mod = await loadCommunityCloudModule();
    return mod.CommunityDB.listPosts();
}

export function prefetchCommunityCloudModule(): void {
    if (typeof window === 'undefined') return;
    void loadCommunityCloudModule();
}

export function resetCommunityCloudLoaderForTests(): void {
    communityCloudModulePromise = null;
}
