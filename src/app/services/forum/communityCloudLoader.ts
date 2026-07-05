import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import { CommunityDB } from '@/app/services/forum/forumCommunityRuntime';

/** قائمة منشورات المنتدى من التخزين المحلي الجاري. */
export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
    return CommunityDB.listPosts();
}

export function prefetchCommunityCloudModule(): void {
    /* no-op: المسار صار مستورداً مباشرة */
}

export function resetCommunityCloudLoaderForTests(): void {
    /* no-op */
}
