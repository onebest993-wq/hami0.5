import type { CommunityPost, RepositoryDocument } from '@/app/services/lawyer-cloud';
import { compareCommunityPostsForFeed } from '@/app/services/forum/forumUrgentConsultation';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import { getRepositoryMediaKind } from '@/app/services/forum/repositoryMediaKind';
import {
    communityTagMatchesFilter,
    resolveCommunityPostTags,
    resolveRepositoryDocTags,
    repositoryDocMatchesSearch,
    repositoryDocMatchesTag,
} from './repositoryTagUtils';

export type ForumCommunitySearchFilters = {
    q: string;
    hasPdf: boolean;
    hasImage: boolean;
    tag: string | null;
};

export function hasForumCommunitySearchFilters(filters: ForumCommunitySearchFilters): boolean {
    return Boolean(filters.q.trim() || filters.hasPdf || filters.hasImage || filters.tag);
}

export function filterLocalForumPostsForSearch(
    posts: CommunityPost[],
    filters: ForumCommunitySearchFilters,
): CommunityPost[] {
    const q = clampGlobalSearchQuery(filters.q);
    return posts
        .filter((p) => {
            const hay = [p.content, p.authorName, ...(p.tags ?? [])].join(' ');
            const matchesSearch = !q.trim() || archiveTextMatchesQuery(hay, q);
            const matchesPdf = !filters.hasPdf || p.attachment?.type === 'document';
            const matchesImage = !filters.hasImage || p.attachment?.type === 'image';
            const matchesTag = communityTagMatchesFilter(
                resolveCommunityPostTags(p.content, p.tags),
                filters.tag,
            );
            return !p.groupId && matchesSearch && matchesPdf && matchesImage && matchesTag;
        })
        .sort(compareCommunityPostsForFeed);
}

export function filterLocalRepositoryDocsForSearch(
    docs: RepositoryDocument[],
    filters: ForumCommunitySearchFilters,
): RepositoryDocument[] {
    return docs.filter((doc) => {
        const matchesSearch = repositoryDocMatchesSearch(doc, filters.q);
        const docTags = resolveRepositoryDocTags(doc.title, doc.description, doc.tags);
        const matchesTag = repositoryDocMatchesTag(docTags, filters.tag);
        const mediaKind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
        const matchesPdf = !filters.hasPdf || mediaKind === 'pdf';
        const matchesImage = !filters.hasImage || mediaKind === 'image';
        return matchesSearch && matchesTag && matchesPdf && matchesImage;
    });
}

export function mergeSearchHitsById<T extends { id: string }>(primary: T[], extra: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of extra) map.set(item.id, item);
    for (const item of primary) map.set(item.id, item);
    return Array.from(map.values());
}
