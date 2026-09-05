import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

export type ForumCommunitySearchQuery = {
    q: string;
    hasPdf: boolean;
    hasImage: boolean;
    tag: string | null;
};

export async function searchForumCommunity(
    query: ForumCommunitySearchQuery,
): Promise<{ posts: CommunityPost[]; documents: RepositoryDocument[] }> {
    const q = clampGlobalSearchQuery(query.q);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (query.hasPdf) params.set('hasPdf', '1');
    if (query.hasImage) params.set('hasImage', '1');
    if (query.tag?.trim()) params.set('tag', query.tag.trim());
    params.set('limit', '40');
    const res = await SecureAPIClient.fetchSecure<{
        ok: boolean;
        posts?: CommunityPost[];
        documents?: RepositoryDocument[];
    }>(`/api/forum/search?${params.toString()}`, { method: 'GET' });
    if (!res.ok) return { posts: [], documents: [] };
    return {
        posts: Array.isArray(res.posts) ? res.posts : [],
        documents: Array.isArray(res.documents) ? res.documents : [],
    };
}
