import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { communityPostToInsertRow, type ForumPostRow } from './forumMapper';
import { getForumSupabaseAdmin, isForumSupabaseConfigured } from './supabaseAdmin';
import { buildForumEditPatch } from './forumEditUtils';
import {
    hydrateForumPosts,
    matchesForumListScope,
    migrateForumFromLegacyKvIfEmpty,
    sortForumRepositoryPosts,
    type ForumListPostsOptions,
} from './forumRepositoryHydration';
import { createForumCommentRepository } from './forumRepositoryComments';
import { forumRepositoryModeration } from './forumRepositoryModeration';

export type { ForumListPostsOptions };

const postRepository = {
    async listPosts(
        limit = 500,
        offset = 0,
        options?: ForumListPostsOptions,
    ): Promise<{ posts: CommunityPost[]; total: number }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { CommunityDB } = await import('@/app/services/lawyer-cloud');
            const all = (await CommunityDB.listPosts()).filter((p) => matchesForumListScope(p, options));
            const sorted = sortForumRepositoryPosts(all);
            return { posts: sorted.slice(offset, offset + limit), total: sorted.length };
        }

        await migrateForumFromLegacyKvIfEmpty();

        let countQuery = admin.from('forum_posts').select('*', { count: 'exact', head: true });
        let dataQuery = admin.from('forum_posts').select('*');
        if (options?.groupId) {
            countQuery = countQuery.eq('group_id', options.groupId);
            dataQuery = dataQuery.eq('group_id', options.groupId);
        } else {
            countQuery = countQuery.is('group_id', null);
            dataQuery = dataQuery.is('group_id', null);
        }

        const { count } = await countQuery;
        const { data, error } = await dataQuery
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error || !data) {
            const { CommunityDB } = await import('@/app/services/lawyer-cloud');
            const all = (await CommunityDB.listPosts()).filter((p) => matchesForumListScope(p, options));
            const sorted = sortForumRepositoryPosts(all);
            return { posts: sorted.slice(offset, offset + limit), total: sorted.length };
        }

        const posts = sortForumRepositoryPosts(await hydrateForumPosts(data as ForumPostRow[]));
        return { posts, total: count ?? posts.length };
    },

    async getPostById(postId: string): Promise<CommunityPost | null> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { getCommunityPostById } = await import('@/app/services/cloud/lawyerCommunityCloud');
            return getCommunityPostById(postId);
        }

        await migrateForumFromLegacyKvIfEmpty();

        const { data, error } = await admin.from('forum_posts').select('*').eq('id', postId).maybeSingle();
        if (error || !data) return null;
        const [post] = await hydrateForumPosts([data as ForumPostRow]);
        return post ?? null;
    },

    async savePost(post: CommunityPost): Promise<CommunityPost> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { CommunityDB } = await import('@/app/services/lawyer-cloud');
            await CommunityDB.savePost(post);
            return post;
        }

        const row = communityPostToInsertRow(post);
        const { error } = await admin.from('forum_posts').upsert(row, { onConflict: 'id' });
        if (error) throw new Error(error.message);

        const saved = await postRepository.getPostById(post.id);
        return saved ?? post;
    },

    async deletePost(postId: string): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { CommunityDB } = await import('@/app/services/lawyer-cloud');
            await CommunityDB.deletePost(postId);
            return;
        }
        const { error } = await admin.from('forum_posts').delete().eq('id', postId);
        if (error) throw new Error(error.message);
    },

    async updatePostContent(
        postId: string,
        content: string,
        requesterId: string,
        requesterIsAdmin = false,
    ): Promise<CommunityPost> {
        const post = await postRepository.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        if (post.authorId !== requesterId && !requesterIsAdmin) {
            throw new Error('ليس لديك صلاحية لتعديل هذا المنشور');
        }
        const updated: CommunityPost = {
            ...post,
            ...buildForumEditPatch(post, content),
        };
        return postRepository.savePost(updated);
    },

    async togglePin(postId: string, pinned: boolean): Promise<CommunityPost> {
        const post = await postRepository.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        const updated: CommunityPost = {
            ...post,
            isPinned: pinned || undefined,
            updatedAt: new Date().toISOString(),
        };
        return postRepository.savePost(updated);
    },

    async deletePostAuthorized(
        postId: string,
        requesterId: string,
        isAdmin: boolean,
    ): Promise<void> {
        const post = await postRepository.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        if (!isAdmin && post.authorId !== requesterId) {
            throw new Error('ليس لديك صلاحية لحذف هذا المنشور');
        }
        await postRepository.deletePost(postId);
    },

    async toggleLockDiscussion(
        postId: string,
        locked: boolean,
        requesterId: string,
        requesterIsAdmin: boolean,
    ): Promise<CommunityPost> {
        const post = await postRepository.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        if (!requesterIsAdmin && post.authorId !== requesterId) {
            throw new Error('ليس لديك صلاحية لقفل النقاش');
        }
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const updated: CommunityPost = {
                ...post,
                isLocked: locked || undefined,
                updatedAt: new Date().toISOString(),
            };
            const { CommunityDB } = await import('@/app/services/lawyer-cloud');
            await CommunityDB.savePost(updated);
            return updated;
        }
        const { error } = await admin
            .from('forum_posts')
            .update({ is_locked: locked, updated_at: new Date().toISOString() })
            .eq('id', postId);
        if (error) throw new Error(error.message);
        const refreshed = await postRepository.getPostById(postId);
        return refreshed ?? { ...post, isLocked: locked || undefined };
    },
};

const commentRepository = createForumCommentRepository(postRepository);

export const ForumRepository = {
    isConfigured: isForumSupabaseConfigured,
    ...postRepository,
    ...commentRepository,
    ...forumRepositoryModeration,
};
