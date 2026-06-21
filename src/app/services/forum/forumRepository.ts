import { UserRole } from '@/app/types/admin-types';
import type { BanRecord, CommunityComment, CommunityPost, CommunityReport } from '@/app/services/lawyer-cloud';
import {
    communityPostToInsertRow,
    postRowToCommunity,
    type CommentUpvoteMap,
    type ForumCommentRow,
    type ForumPostRow,
} from './forumMapper';
import { getForumSupabaseAdmin, isForumSupabaseConfigured } from './supabaseAdmin';
import { buildForumEditPatch } from './forumEditUtils';
import { compareCommunityPostsForFeed } from './forumUrgentConsultation';

function createId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && 'randomUUID' in cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function sortPosts(posts: CommunityPost[]): CommunityPost[] {
    return posts.sort((a, b) => compareCommunityPostsForFeed(a, b));
}

export type ForumListPostsOptions = {
    /** عند التحديد: منشورات المجموعة فقط */
    groupId?: string;
    /** الساحة العامة فقط (group_id = null) — الافتراضي عند غياب groupId */
    publicOnly?: boolean;
};

function matchesListScope(post: CommunityPost, options?: ForumListPostsOptions): boolean {
    if (options?.groupId) return post.groupId === options.groupId;
    if (options?.publicOnly !== false) return !post.groupId;
    return true;
}

async function loadCommentsForPosts(postIds: string[]): Promise<Map<string, ForumCommentRow[]>> {
    const admin = getForumSupabaseAdmin();
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

async function loadCommentUpvotes(commentIds: string[]): Promise<CommentUpvoteMap> {
    const map: CommentUpvoteMap = new Map();
    const admin = getForumSupabaseAdmin();
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

async function hydratePosts(rows: ForumPostRow[]): Promise<CommunityPost[]> {
    const commentMap = await loadCommentsForPosts(rows.map((r) => r.id));
    const allCommentIds: string[] = [];
    for (const list of commentMap.values()) {
        for (const c of list) allCommentIds.push(c.id);
    }
    const upvotesMap = await loadCommentUpvotes(allCommentIds);
    return rows.map((row) => postRowToCommunity(row, commentMap.get(row.id) ?? [], upvotesMap));
}

let migrationAttempted = false;

async function migrateFromLegacyKvIfEmpty(): Promise<void> {
    if (migrationAttempted) return;
    migrationAttempted = true;
    const admin = getForumSupabaseAdmin();
    if (!admin) return;

    const { count, error } = await admin
        .from('forum_posts')
        .select('*', { count: 'exact', head: true });
    if (error || (count ?? 0) > 0) return;

    const { getCommunityPosts } = await import('@/app/services/lawyer-cloud');
    const legacy = await getCommunityPosts();
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

export const ForumRepository = {
    isConfigured: isForumSupabaseConfigured,

    async listPosts(
        limit = 500,
        offset = 0,
        options?: ForumListPostsOptions,
    ): Promise<{ posts: CommunityPost[]; total: number }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { CommunityDB } = await import('@/app/services/lawyer-cloud');
            const all = (await CommunityDB.listPosts()).filter((p) => matchesListScope(p, options));
            const sorted = sortPosts(all);
            return { posts: sorted.slice(offset, offset + limit), total: sorted.length };
        }

        await migrateFromLegacyKvIfEmpty();

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
            const all = (await CommunityDB.listPosts()).filter((p) => matchesListScope(p, options));
            const sorted = sortPosts(all);
            return { posts: sorted.slice(offset, offset + limit), total: sorted.length };
        }

        const posts = sortPosts(await hydratePosts(data as ForumPostRow[]));
        return { posts, total: count ?? posts.length };
    },

    async getPostById(postId: string): Promise<CommunityPost | null> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { getCommunityPostById } = await import('@/app/services/lawyer-cloud');
            return getCommunityPostById(postId);
        }

        await migrateFromLegacyKvIfEmpty();

        const { data, error } = await admin.from('forum_posts').select('*').eq('id', postId).maybeSingle();
        if (error || !data) return null;
        const [post] = await hydratePosts([data as ForumPostRow]);
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

        const saved = await this.getPostById(post.id);
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
        const post = await this.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        if (post.authorId !== requesterId && !requesterIsAdmin) {
            throw new Error('ليس لديك صلاحية لتعديل هذا المنشور');
        }
        const updated: CommunityPost = {
            ...post,
            ...buildForumEditPatch(post, content),
        };
        return this.savePost(updated);
    },

    async togglePin(postId: string, pinned: boolean): Promise<CommunityPost> {
        const post = await this.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        const updated: CommunityPost = {
            ...post,
            isPinned: pinned || undefined,
            updatedAt: new Date().toISOString(),
        };
        return this.savePost(updated);
    },

    async addComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { addCommunityComment } = await import('@/app/services/lawyer-cloud');
            await addCommunityComment(postId, comment);
            const post = await this.getPostById(postId);
            if (!post) throw new Error('المنشور غير موجود');
            const parentComment = comment.parentId
                ? post.comments.find((c) => c.id === comment.parentId) ?? null
                : null;
            const {
                autoSubscribeCommenterToThread,
                dispatchCommentNotifications,
            } = await import('./forumNotificationDispatch');
            await autoSubscribeCommenterToThread(comment.authorId, postId);
            await dispatchCommentNotifications({ post, comment, parentComment });
            return post;
        }

        // منع التعليق لو النقاش مقفل
        const existingPost = await this.getPostById(postId);
        if (!existingPost) throw new Error('المنشور غير موجود');
        if (existingPost.isLocked) throw new Error('النقاش على هذا المنشور مقفل');

        const { error } = await admin.from('forum_comments').insert({
            id: comment.id,
            post_id: postId,
            author_id: comment.authorId,
            author_name: comment.authorName,
            content: comment.content,
            parent_id: comment.parentId ?? null,
            created_at: comment.createdAt,
        });
        if (error) throw new Error(error.message);

        const post = await this.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');

        const parentComment = comment.parentId
            ? post.comments.find((c) => c.id === comment.parentId) ?? null
            : null;
        const { dispatchCommentNotifications, autoSubscribeCommenterToThread } = await import('./forumNotificationDispatch');
        await autoSubscribeCommenterToThread(comment.authorId, postId);
        await dispatchCommentNotifications({ post, comment, parentComment });

        return post;
    },

    async deleteComment(
        postId: string,
        commentId: string,
        requesterId: string,
        requesterRole?: UserRole,
    ): Promise<CommunityPost> {
        const post = await this.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        const comment = post.comments.find((c) => c.id === commentId);
        if (!comment) throw new Error('التعليق غير موجود');
        const isAdmin =
            requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
        if (comment.authorId !== requesterId && post.authorId !== requesterId && !isAdmin) {
            throw new Error('ليس لديك صلاحية لحذف هذا التعليق');
        }

        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { deleteCommunityComment } = await import('@/app/services/lawyer-cloud');
            return deleteCommunityComment(postId, commentId, requesterId, requesterRole);
        }

        const toRemove = new Set<string>([commentId]);
        const stack = [commentId];
        while (stack.length) {
            const id = stack.pop()!;
            for (const c of post.comments) {
                if (c.parentId === id && !toRemove.has(c.id)) {
                    toRemove.add(c.id);
                    stack.push(c.id);
                }
            }
        }

        const { error } = await admin.from('forum_comments').delete().in('id', [...toRemove]);
        if (error) throw new Error(error.message);

        if (post.bestCommentId && toRemove.has(post.bestCommentId)) {
            await admin.from('forum_posts').update({ best_comment_id: null }).eq('id', postId);
        }

        const refreshed = await this.getPostById(postId);
        if (!refreshed) throw new Error('المنشور غير موجود');
        return refreshed;
    },

    async editComment(
        postId: string,
        commentId: string,
        content: string,
        requesterId: string,
    ): Promise<CommunityPost> {
        const post = await this.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        const comment = post.comments.find((c) => c.id === commentId);
        if (!comment) throw new Error('التعليق غير موجود');
        if (comment.authorId !== requesterId) {
            throw new Error('ليس لديك صلاحية لتعديل هذا التعليق');
        }
        // قفل التعديل لو هذا التعليق مُميّز كأفضل إجابة (حماية لمالك المنشور)
        if (post.bestCommentId === commentId) {
            throw new Error('لا يمكن تعديل تعليق مميّز كأفضل إجابة');
        }
        const trimmed = content.trim();
        if (trimmed.length < 2) throw new Error('نص التعليق قصير جداً');
        // حماية ضد DoS: حد أعلى لطول التعليق
        if (trimmed.length > 5_000) throw new Error('نص التعليق طويل جداً');

        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { editCommunityComment } = await import('@/app/services/lawyer-cloud');
            return editCommunityComment(postId, commentId, trimmed, requesterId);
        }

        const { error } = await admin
            .from('forum_comments')
            .update({ content: trimmed })
            .eq('id', commentId);
        if (error) throw new Error(error.message);

        const refreshed = await this.getPostById(postId);
        if (!refreshed) throw new Error('المنشور غير موجود');
        return refreshed;
    },

    async deletePostAuthorized(
        postId: string,
        requesterId: string,
        isAdmin: boolean,
    ): Promise<void> {
        const post = await this.getPostById(postId);
        if (!post) throw new Error('المنشور غير موجود');
        if (!isAdmin && post.authorId !== requesterId) {
            throw new Error('ليس لديك صلاحية لحذف هذا المنشور');
        }
        await this.deletePost(postId);
    },

    async reportPost(
        postId: string,
        reason: string,
        reporterId: string,
    ): Promise<{ ok: boolean; duplicate?: boolean }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { reportCommunityPost } = await import('@/app/services/lawyer-cloud');
            return reportCommunityPost(postId, reason, reporterId);
        }

        const { data: existing } = await admin
            .from('forum_reports')
            .select('id')
            .eq('post_id', postId)
            .eq('reporter_id', reporterId)
            .eq('status', 'pending')
            .maybeSingle();
        if (existing) return { ok: false, duplicate: true };

        const { error } = await admin.from('forum_reports').insert({
            id: createId(),
            post_id: postId,
            reporter_id: reporterId,
            reason,
            status: 'pending',
        });
        if (error) {
            if (error.code === '23505') return { ok: false, duplicate: true };
            throw new Error(error.message);
        }
        return { ok: true };
    },

    async listReports(): Promise<CommunityReport[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { getCommunityReports } = await import('@/app/services/lawyer-cloud');
            return getCommunityReports();
        }
        const { data, error } = await admin
            .from('forum_reports')
            .select('*')
            .order('created_at', { ascending: false });
        if (error || !data) return [];
        return (data as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            postId: String(r.post_id),
            reporterId: String(r.reporter_id),
            reason: String(r.reason),
            status: r.status as CommunityReport['status'],
            createdAt: String(r.created_at),
            reviewedById: typeof r.reviewed_by_id === 'string' ? r.reviewed_by_id : undefined,
            reviewedAt: typeof r.reviewed_at === 'string' ? r.reviewed_at : undefined,
        }));
    },

    async dismissReport(
        reportId: string,
        reviewerId: string,
        notifyOutcome: 'dismissed' | 'removed' | false = 'dismissed',
    ): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { dismissCommunityReport } = await import('@/app/services/lawyer-cloud');
            await dismissCommunityReport(reportId, reviewerId);
            return;
        }
        const { data: reportRow } = await admin
            .from('forum_reports')
            .select('reporter_id, post_id')
            .eq('id', reportId)
            .maybeSingle();
        await admin
            .from('forum_reports')
            .update({
                status: 'dismissed',
                reviewed_by_id: reviewerId,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', reportId);
        if (notifyOutcome && reportRow) {
            const row = reportRow as { reporter_id: string; post_id: string };
            void import('./forumNotificationDispatch').then(({ dispatchReportOutcomeNotification }) =>
                dispatchReportOutcomeNotification({
                    reporterId: row.reporter_id,
                    postId: row.post_id,
                    outcome: notifyOutcome,
                }),
            );
        }
    },

    async isBanned(userId: string): Promise<BanRecord | null> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { BanDB } = await import('@/app/services/lawyer-cloud');
            return BanDB.isBanned(userId);
        }
        const { data } = await admin.from('forum_bans').select('*').eq('user_id', userId).maybeSingle();
        if (!data) return null;
        const row = data as Record<string, unknown>;
        if (row.expires_at && Date.parse(String(row.expires_at)) < Date.now()) {
            await admin.from('forum_bans').delete().eq('user_id', userId);
            return null;
        }
        return {
            userId: String(row.user_id),
            userName: String(row.user_name ?? ''),
            reason: String(row.reason ?? ''),
            bannedBy: String(row.banned_by ?? ''),
            bannedAt: String(row.banned_at),
            expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
        };
    },

    async banUser(record: BanRecord): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { BanDB } = await import('@/app/services/lawyer-cloud');
            await BanDB.banUser(record);
            return;
        }
        await admin.from('forum_bans').upsert({
            user_id: record.userId,
            user_name: record.userName,
            reason: record.reason,
            banned_by: record.bannedBy,
            banned_at: record.bannedAt,
            expires_at: record.expiresAt ?? null,
        });
    },

    async unbanUser(userId: string): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { BanDB } = await import('@/app/services/lawyer-cloud');
            await BanDB.unbanUser(userId);
            return;
        }
        await admin.from('forum_bans').delete().eq('user_id', userId);
    },

    async listBannedUsers(): Promise<BanRecord[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { BanDB } = await import('@/app/services/lawyer-cloud');
            return BanDB.listBannedUsers();
        }
        const { data } = await admin.from('forum_bans').select('*');
        if (!data) return [];
        return (data as Array<Record<string, unknown>>).map((row) => ({
            userId: String(row.user_id),
            userName: String(row.user_name ?? ''),
            reason: String(row.reason ?? ''),
            bannedBy: String(row.banned_by ?? ''),
            bannedAt: String(row.banned_at),
            expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
        }));
    },

    // ====================== Bookmarks ======================
    async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { ForumBookmarkDB } = await import('@/app/services/lawyer-cloud');
            const bookmarked = await ForumBookmarkDB.toggle(userId, postId);
            return { bookmarked };
        }
        const { data: existing } = await admin
            .from('forum_bookmarks')
            .select('post_id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle();
        if (existing) {
            await admin.from('forum_bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
            return { bookmarked: false };
        }
        const { error } = await admin
            .from('forum_bookmarks')
            .insert({ user_id: userId, post_id: postId });
        if (error) throw new Error(error.message);
        return { bookmarked: true };
    },

    async listBookmarkedPostIds(userId: string): Promise<string[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const { ForumBookmarkDB } = await import('@/app/services/lawyer-cloud');
            return ForumBookmarkDB.listPostIds(userId);
        }
        const { data } = await admin
            .from('forum_bookmarks')
            .select('post_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (!data) return [];
        return (data as Array<{ post_id: string }>).map((r) => r.post_id);
    },

    // ====================== Comment upvotes ======================
    async toggleCommentUpvote(
        commentId: string,
        userId: string,
    ): Promise<{ upvoted: boolean; upvoterIds: string[] }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) return { upvoted: false, upvoterIds: [] };
        // منع التصويت على تعليق الشخص لنفسه
        const { data: comment } = await admin
            .from('forum_comments')
            .select('author_id')
            .eq('id', commentId)
            .maybeSingle();
        if (!comment) throw new Error('التعليق غير موجود');
        if ((comment as { author_id: string }).author_id === userId) {
            throw new Error('لا يمكنك التصويت على تعليقك');
        }
        const { data: existing } = await admin
            .from('forum_comment_upvotes')
            .select('comment_id')
            .eq('user_id', userId)
            .eq('comment_id', commentId)
            .maybeSingle();
        if (existing) {
            await admin
                .from('forum_comment_upvotes')
                .delete()
                .eq('user_id', userId)
                .eq('comment_id', commentId);
        } else {
            const { error } = await admin
                .from('forum_comment_upvotes')
                .insert({ user_id: userId, comment_id: commentId });
            if (error) throw new Error(error.message);
        }
        const map = await loadCommentUpvotes([commentId]);
        const upvoterIds = map.get(commentId) ?? [];
        return { upvoted: upvoterIds.includes(userId), upvoterIds };
    },

    // ====================== Lock discussion ======================
    async toggleLockDiscussion(
        postId: string,
        locked: boolean,
        requesterId: string,
        requesterIsAdmin: boolean,
    ): Promise<CommunityPost> {
        const post = await this.getPostById(postId);
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
        const refreshed = await this.getPostById(postId);
        return refreshed ?? { ...post, isLocked: locked || undefined };
    },

    // ====================== Comment reports ======================
    async reportComment(
        commentId: string,
        reason: string,
        reporterId: string,
    ): Promise<{ ok: boolean; duplicate?: boolean }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) return { ok: false };

        const { data: existing } = await admin
            .from('forum_comment_reports')
            .select('id')
            .eq('comment_id', commentId)
            .eq('reporter_id', reporterId)
            .eq('status', 'pending')
            .maybeSingle();
        if (existing) return { ok: false, duplicate: true };

        const { error } = await admin.from('forum_comment_reports').insert({
            id: createId(),
            comment_id: commentId,
            reporter_id: reporterId,
            reason,
            status: 'pending',
        });
        if (error) {
            if (error.code === '23505') return { ok: false, duplicate: true };
            throw new Error(error.message);
        }
        return { ok: true };
    },
};
