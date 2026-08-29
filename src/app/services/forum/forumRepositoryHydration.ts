import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { getCommunityPosts } from '@/app/services/forum/forumCommunityRuntime';
import {
    communityPostToInsertRow,
    postRowToCommunity,
    type CommentUpvoteMap,
    type ForumCommentRow,
    type ForumPostRow,
} from './forumMapper';
import { loadForumSupabaseAdmin } from './loadForumSupabaseAdmin';
import { compareCommunityPostsForFeed } from './forumUrgentConsultation';

export function createForumRepositoryId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && 'randomUUID' in cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function sortForumRepositoryPosts(posts: CommunityPost[]): CommunityPost[] {
    return posts.sort((a, b) => compareCommunityPostsForFeed(a, b));
}

export type ForumListPostsOptions = {
    groupId?: string;
    publicOnly?: boolean;
};

export function matchesForumListScope(post: CommunityPost, options?: ForumListPostsOptions): boolean {
    if (options?.groupId) return post.groupId === options.groupId;
    if (options?.publicOnly !== false) return !post.groupId;
    return true;
}

export async function loadCommentsForPosts(postIds: string[]): Promise<Map<string, ForumCommentRow[]>> {
    const admin = await loadForumSupabaseAdmin();
    const map = new Map<string, ForumCommentRow[]>();
    if (!admin || postIds.length === 0) return map;

    const { data, error } = await admin
        .from('forum_comments')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });
    if (error || !data) return map;

    for (const row of data as ForumCommentRow[]) {
        const list = map.get(row.post_id) ?? [];
        list.push(row);
        map.set(row.post_id, list);
    }
    return map;
}

export async function loadCommentUpvotes(commentIds: string[]): Promise<CommentUpvoteMap> {
    const map: CommentUpvoteMap = new Map();
    const admin = await loadForumSupabaseAdmin();
    if (!admin || commentIds.length === 0) return map;
    const { data, error } = await admin
        .from('forum_comment_upvotes')
        .select('comment_id, user_id')
        .in('comment_id', commentIds);
    if (error || !data) return map;
    for (const row of data as Array<{ comment_id: string; user_id: string }>) {
        const list = map.get(row.comment_id) ?? [];
        list.push(row.user_id);
        map.set(row.comment_id, list);
    }
    return map;
}

export async function hydrateForumPosts(rows: ForumPostRow[]): Promise<CommunityPost[]> {
    const commentMap = await loadCommentsForPosts(rows.map((r) => r.id));
    const allCommentIds: string[] = [];
    for (const list of commentMap.values()) {
        for (const c of list) allCommentIds.push(c.id);
    }
    const upvotesMap = await loadCommentUpvotes(allCommentIds);
    const posts = rows.map((row) => postRowToCommunity(row, commentMap.get(row.id) ?? [], upvotesMap));
    const { signForumPostAttachments } = await import('./forumAttachmentSigning');
    return signForumPostAttachments(posts);
}

let migrationAttempted = false;

export async function migrateForumFromLegacyKvIfEmpty(): Promise<void> {
    if (migrationAttempted) return;
    migrationAttempted = true;
    if (typeof window === 'undefined') return;

    const admin = await loadForumSupabaseAdmin();
    if (!admin) return;

    const { count, error } = await admin.from('forum_posts').select('*', { count: 'exact', head: true });
    if (error || (count ?? 0) > 0) return;

    const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const legacy = (await getCommunityPosts()).filter(
        (post) => UUID_RE.test(post.id) && UUID_RE.test(post.authorId),
    );
    if (!legacy.length) return;

    for (const post of legacy) {
        const row = communityPostToInsertRow(post);
        await admin.from('forum_posts').upsert(row, { onConflict: 'id' });
        if (post.comments.length) {
            const commentRows = post.comments.map((c) => ({
                id: c.id,
                post_id: post.id,
                author_id: c.authorId,
                author_name: c.authorName,
                content: c.content,
                parent_id: c.parentId ?? null,
                created_at: c.createdAt,
            }));
            await admin.from('forum_comments').upsert(commentRows, { onConflict: 'id' });
        }
    }
}
