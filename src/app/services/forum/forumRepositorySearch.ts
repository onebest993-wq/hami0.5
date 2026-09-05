import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { redactAnonymousAuthor, postRowToCommunity, type ForumPostRow } from '@/app/services/forum/forumMapper';
import { signForumPostAttachments } from '@/app/services/forum/forumAttachmentSigning';
import { loadForumSupabaseAdmin } from '@/app/services/forum/loadForumSupabaseAdmin';
import { CommunityDB } from '@/app/services/forum/forumCommunityRuntime';
import {
    FORUM_SEARCH_TEXT_COLUMN,
    forumIlikeContainsPattern,
    forumIlikeRawContainsPattern,
    forumOrIlikeContentAndAuthor,
    isMissingSearchTextColumn,
} from '@/app/services/forum/forumIlikePattern';
import { compareCommunityPostsForFeed } from '@/app/services/forum/forumUrgentConsultation';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';

export type ForumPostSearchFilters = {
    q: string;
    hasPdf: boolean;
    hasImage: boolean;
    tag: string | null;
    limit: number;
};

function matchesAttachmentFilters(post: CommunityPost, filters: ForumPostSearchFilters): boolean {
    if (filters.hasPdf && post.attachment?.type !== 'document') return false;
    if (filters.hasImage && post.attachment?.type !== 'image') return false;
    if (!filters.tag?.trim()) return true;
    const needle = filters.tag.trim().replace(/^#/, '');
    return (post.tags ?? []).some((t) => t.replace(/^#/, '') === needle);
}

function matchesLocalPostSearch(post: CommunityPost, filters: ForumPostSearchFilters): boolean {
    if (post.groupId) return false;
    if (!matchesAttachmentFilters(post, filters)) return false;
    const q = filters.q.trim();
    if (!q) return true;
    const hay = [post.content, post.authorName, ...(post.tags ?? [])].join(' ');
    return archiveTextMatchesQuery(hay, q);
}

async function searchPostsFromLocal(filters: ForumPostSearchFilters): Promise<CommunityPost[]> {
    const all = await CommunityDB.listPosts();
    return all
        .filter((p) => matchesLocalPostSearch(p, filters))
        .sort(compareCommunityPostsForFeed)
        .slice(0, filters.limit);
}

export async function searchForumPostsOnServer(
    filters: ForumPostSearchFilters,
    viewerId: string,
    viewerIsAdmin: boolean,
): Promise<CommunityPost[]> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) {
        return (await searchPostsFromLocal(filters)).map((p) =>
            redactAnonymousAuthor(p, viewerId, viewerIsAdmin),
        );
    }

    const buildQuery = (useSearchText: boolean) => {
        let query = admin
            .from('forum_posts')
            .select('*')
            .is('group_id', null)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(Math.min(80, Math.max(1, filters.limit)));

        if (filters.tag?.trim()) {
            query = query.contains('tags', [filters.tag.trim()]);
        }
        if (filters.hasImage) {
            query = query.filter('attachment->>type', 'eq', 'image');
        }
        if (filters.hasPdf) {
            query = query.filter('attachment->>type', 'eq', 'document');
        }
        if (useSearchText) {
            const pattern = forumIlikeContainsPattern(filters.q);
            if (pattern) query = query.ilike(FORUM_SEARCH_TEXT_COLUMN, pattern);
        } else {
            const legacy = forumIlikeRawContainsPattern(filters.q);
            if (legacy) query = query.or(forumOrIlikeContentAndAuthor(legacy));
        }
        return query;
    };

    let { data, error } = await buildQuery(true);
    if (error && isMissingSearchTextColumn(error.message)) {
        ({ data, error } = await buildQuery(false));
    }
    if (error || !data) {
        return (await searchPostsFromLocal(filters)).map((p) =>
            redactAnonymousAuthor(p, viewerId, viewerIsAdmin),
        );
    }

    const mapped = (data as ForumPostRow[]).map((row) => postRowToCommunity(row, []));
    const signed = await signForumPostAttachments(mapped);
    return signed
        .filter((p) => matchesLocalPostSearch(p, filters))
        .map((p) => redactAnonymousAuthor(p, viewerId, viewerIsAdmin));
}
