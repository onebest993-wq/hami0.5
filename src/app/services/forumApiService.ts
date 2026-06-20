// @ts-nocheck
import { SecureAPIClient, SecureFetchError } from '@/app/services/SecureAPIClient';
import {
    addCommunityComment,
    deleteCommunityComment,
    editCommunityComment,
    deleteCommunityPost,
    reportCommunityPost,
    togglePinCommunityPost,
    updateCommunityPost,
    type CommunityComment,
    type CommunityPost,
} from '@/app/services/lawyer-cloud';
import { UserRole } from '@/app/types/admin-types';
import { supabase } from '@/app/lib/supabase-client';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };

async function postJson<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const res = await SecureAPIClient.fetchSecure<T & ApiErr>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (res && typeof res === 'object' && (res as ApiErr).ok === false) {
        const message = (res as ApiErr).error?.trim() || 'تعذّر تنفيذ العملية';
        throw new SecureFetchError(message, 400, JSON.stringify(res), endpoint);
    }
    return res as T;
}

async function persistPostLocally(post: CommunityPost): Promise<void> {
    const { CommunityDB } = await import('@/app/services/lawyer-cloud');
    await CommunityDB.savePost(post);
}

async function removePostLocally(postId: string): Promise<void> {
    const { CommunityDB } = await import('@/app/services/lawyer-cloud');
    await CommunityDB.deletePost(postId);
}

async function getSessionUserId(explicitUserId?: string | null): Promise<string | null> {
    if (explicitUserId) return explicitUserId;
    const { data } = await supabase.auth.getSession();
    const fromSession = data.session?.user?.id ?? null;
    if (fromSession) return fromSession;
    return readPersistedSupabaseAuth().user?.id ?? null;
}

type PostsListResponse = { ok: boolean; posts: CommunityPost[]; total: number };

function isBannedForumError(err: SecureFetchError): boolean {
    try {
        const body = JSON.parse(err.bodyText) as { error?: string };
        return (body.error ?? '').includes('محظور');
    } catch {
        return false;
    }
}

function parseForumApiError(err: unknown): string {
    if (err instanceof SecureFetchError) {
        try {
            const body = JSON.parse(err.bodyText) as { error?: string };
            if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
        } catch {
            /* ignore */
        }
        if (err.status === 403) return 'تعذّر تنفيذ العملية — تحقق من الصلاحيات أو أعد المحاولة';
        if (err.status === 401) return 'يجب تسجيل الدخول';
    }
    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return 'تعذّر تنفيذ العملية';
}

export class ForumApiService {
    /** قراءة: fallback عند أخطاء الشبكة أو غياب الجلسة — 403 تُمرَّر (حظر/صلاحيات). */
    private static async withFallback<T>(apiCall: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
        try {
            return await apiCall();
        } catch (err) {
            if (err instanceof SecureFetchError && err.status === 401) {
                return await fallback();
            }
            if (err instanceof SecureFetchError && err.status === 403) {
                throw err;
            }
            return await fallback();
        }
    }

    /** كتابة: عند فشل API نُكمل محلياً فقط لأخطاء الشبكة — لا نتجاوز 403 WIFE/صلاحيات. */
    private static shouldRethrowMutationError(err: unknown): boolean {
        if (!(err instanceof SecureFetchError)) return false;
        if (err.status === 401) return true;
        if (err.status === 403) return true;
        if (err.status === 429) return true;
        return false;
    }

    private static slicePostsPage(
        posts: CommunityPost[],
        limit: number,
        offset: number,
    ): { posts: CommunityPost[]; total: number } {
        return { posts: posts.slice(offset, offset + limit), total: posts.length };
    }

    private static async withMutationFallback<T>(
        apiCall: () => Promise<T>,
        fallback: () => Promise<T>,
    ): Promise<T> {
        try {
            return await apiCall();
        } catch (err) {
            if (this.shouldRethrowMutationError(err)) throw err;
            try {
                return await fallback();
            } catch {
                throw new Error(parseForumApiError(err));
            }
        }
    }

    static async listPostsPaginated(
        limit: number,
        offset: number,
        options?: { groupId?: string },
    ): Promise<{ posts: CommunityPost[]; total: number }> {
        const {
            CommunityDB,
            mergeCommunityPostsById,
            sortCommunityPosts,
            filterDeletedCommunityPosts,
            getDeletedCommunityPostIds,
        } = await import('@/app/services/lawyer-cloud');
        const localAll = sortCommunityPosts(await CommunityDB.listPosts());
        const scopedLocal = options?.groupId
            ? localAll.filter((p) => p.groupId === options.groupId)
            : localAll.filter((p) => !p.groupId);
        const deletedIds = await getDeletedCommunityPostIds();

        const { getCurrentAccessToken } = await import('./SecureAPIClient');
        if (!(await getCurrentAccessToken())) {
            return this.slicePostsPage(scopedLocal, limit, offset);
        }

        const groupQuery = options?.groupId
            ? `&groupId=${encodeURIComponent(options.groupId)}`
            : '';
        try {
            const res = await SecureAPIClient.fetchSecure<PostsListResponse>(
                `/api/forum/posts?limit=${limit}&offset=${offset}${groupQuery}`,
                { method: 'GET' },
            );
            if (!res.ok) throw new Error('تعذّر جلب المنشورات');
            const merged = sortCommunityPosts(
                filterDeletedCommunityPosts(mergeCommunityPostsById(localAll, res.posts), deletedIds),
            );
            await CommunityDB.persistPostsBatch(merged);
            const scopedMerged = options?.groupId
                ? merged.filter((p) => p.groupId === options.groupId)
                : merged.filter((p) => !p.groupId);
            return this.slicePostsPage(scopedMerged, limit, offset);
        } catch (err) {
            if (err instanceof SecureFetchError && err.status === 401) {
                return this.slicePostsPage(scopedLocal, limit, offset);
            }
            if (err instanceof SecureFetchError && err.status === 403) {
                throw err;
            }
            return this.slicePostsPage(scopedLocal, limit, offset);
        }
    }

    static async createPost(post: CommunityPost): Promise<CommunityPost> {
        const result = await this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/posts', {
                    action: 'create',
                    post,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
                await persistPostLocally(res.post);
                return res.post;
            },
            async () => {
                const { addCommunityPost } = await import('@/app/services/lawyer-cloud');
                await addCommunityPost(post);
                return post;
            },
        );
        try {
            const { AuditLog } = await import('@/app/services/auditLogPublisher');
            AuditLog.forum.questionPosted({
                questionId: String(result.id ?? post.id ?? ''),
                title: String(result.title ?? post.title ?? 'سؤال'),
            });
        } catch { /* silent */ }
        return result;
    }

    static async syncPost(post: CommunityPost): Promise<CommunityPost> {
        return this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/posts', {
                    action: 'sync',
                    post,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
                await persistPostLocally(res.post);
                return res.post;
            },
            async () => {
                const { addCommunityPost } = await import('@/app/services/lawyer-cloud');
                await addCommunityPost(post);
                return post;
            },
        );
    }

    static async getPostById(postId: string): Promise<CommunityPost | null> {
        return this.withFallback(
            async () => {
                const { posts } = await this.listPostsPaginated(500, 0);
                return posts.find((p) => p.id === postId) ?? null;
            },
            async () => {
                const { CommunityDB } = await import('@/app/services/lawyer-cloud');
                const all = await CommunityDB.listPosts();
                return all.find((p) => p.id === postId) ?? null;
            },
        );
    }

    static async deletePost(
        postId: string,
        authorId: string,
        isAdmin: boolean,
        requesterId?: string | null,
    ): Promise<void> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');

        await deleteCommunityPost(
            postId,
            userId,
            isAdmin ? UserRole.SUPER_ADMIN : undefined,
            authorId,
        );

        try {
            await postJson<ApiOk<{ action: string }>>('/api/forum/delete', { postId });
        } catch {
            /* المحلي محذوف — مزامنة الخادم اختيارية */
        }

        try {
            const { AuditLog } = await import('@/app/services/auditLogPublisher');
            AuditLog.forum.questionDeleted({ questionId: postId });
        } catch { /* silent */ }
    }

    static async togglePin(postId: string, pinned: boolean): Promise<CommunityPost> {
        return this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/pin', {
                    postId,
                    pinned,
                });
                if (!res.post) throw new Error('المنشور غير موجود بعد التثبيت');
                await persistPostLocally(res.post);
                return res.post;
            },
            async () => togglePinCommunityPost(postId, pinned, UserRole.SUPER_ADMIN),
        );
    }

    static async reportPost(postId: string, reason: string): Promise<{ ok: boolean; duplicate?: boolean }> {
        return this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ result: { ok: boolean; duplicate?: boolean } }>>(
                    '/api/forum/report',
                    { postId, reason },
                );
                return res.result ?? { ok: true };
            },
            async () => {
                const userId = await getSessionUserId();
                return reportCommunityPost(postId, reason, userId ?? undefined);
            },
        );
    }

    static async updatePost(
        postId: string,
        content: string,
        requesterId?: string | null,
    ): Promise<CommunityPost> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');

        const localSaved = await updateCommunityPost(postId, content, userId);

        try {
            const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/update', {
                postId,
                content,
            });
            if (!res.post) return localSaved;
            const reconciled =
                res.post.content.trim() === content.trim()
                    ? res.post
                    : { ...res.post, content, isEdited: true, updatedAt: localSaved.updatedAt };
            await persistPostLocally(reconciled);
            return reconciled;
        } catch (err) {
            if (this.shouldRethrowMutationError(err)) throw err;
            return localSaved;
        }
    }

    static async addComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
        await addCommunityComment(postId, comment);
        const { CommunityDB } = await import('@/app/services/lawyer-cloud');
        const localPosts = await CommunityDB.listPosts();
        const localPost = localPosts.find((p) => p.id === postId);
        if (!localPost) throw new Error('المنشور غير موجود');

        let result = localPost;
        try {
            const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                action: 'add',
                postId,
                comment,
            });
            if (res.post) {
                await persistPostLocally(res.post);
                result = res.post;
            }
        } catch (err) {
            if (this.shouldRethrowMutationError(err)) throw err;
            /* التعليق محفوظ محلياً */
        }

        try {
            const { AuditLog } = await import('@/app/services/auditLogPublisher');
            AuditLog.forum.replyPosted({
                questionId: postId,
                questionTitle: String(result.title ?? 'سؤال'),
            });
        } catch { /* silent */ }
        return result;
    }

    static async deleteComment(postId: string, commentId: string, isAdmin: boolean): Promise<CommunityPost> {
        const userId = await getSessionUserId();
        if (!userId) throw new Error('يجب تسجيل الدخول');

        return this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                    action: 'delete',
                    postId,
                    commentId,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
                await persistPostLocally(res.post);
                return res.post;
            },
            async () =>
                deleteCommunityComment(
                    postId,
                    commentId,
                    userId,
                    isAdmin ? UserRole.SUPER_ADMIN : undefined,
                ),
        );
    }

    static async editComment(postId: string, commentId: string, content: string): Promise<CommunityPost> {
        const userId = await getSessionUserId();
        if (!userId) throw new Error('يجب تسجيل الدخول');

        return this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                    action: 'edit',
                    postId,
                    commentId,
                    content,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
                await persistPostLocally(res.post);
                return res.post;
            },
            async () => editCommunityComment(postId, commentId, content, userId),
        );
    }

    static async isUserBanned(userId: string): Promise<boolean> {
        const { getCurrentAccessToken } = await import('./SecureAPIClient');
        if (!(await getCurrentAccessToken())) {
            const { BanDB } = await import('@/app/services/lawyer-cloud');
            const record = await BanDB.isBanned(userId);
            return Boolean(record);
        }

        return this.withFallback(
            async () => {
                const res = await SecureAPIClient.fetchSecure<{ ok: boolean; banned: boolean }>(
                    '/api/forum/status',
                    { method: 'GET' },
                );
                return Boolean(res.banned);
            },
            async () => {
                const { BanDB } = await import('@/app/services/lawyer-cloud');
                const record = await BanDB.isBanned(userId);
                return Boolean(record);
            },
        );
    }

    // ============== الميزات الجديدة (Bookmarks / Comment Upvotes / Lock / Comment Report) ==============

    static async listBookmarks(requesterId?: string | null): Promise<string[]> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return [];

        const { ForumBookmarkDB } = await import('@/app/services/lawyer-cloud');
        const localIds = await ForumBookmarkDB.listPostIds(userId);

        const { getCurrentAccessToken } = await import('@/app/services/SecureAPIClient');
        if (!(await getCurrentAccessToken())) return localIds;

        try {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; postIds: string[] }>(
                '/api/forum/bookmark',
                { method: 'GET' },
            );
            const remoteIds = Array.isArray(res.postIds) ? res.postIds : [];
            return [...new Set([...localIds, ...remoteIds])];
        } catch {
            return localIds;
        }
    }

    static async toggleBookmark(postId: string, requesterId?: string | null): Promise<boolean> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');

        const { ForumBookmarkDB } = await import('@/app/services/lawyer-cloud');
        const bookmarked = await ForumBookmarkDB.toggle(userId, postId);

        try {
            const res = await postJson<ApiOk<{ bookmarked: boolean }>>('/api/forum/bookmark', { postId });
            return Boolean(res.bookmarked);
        } catch {
            return bookmarked;
        }
    }

    static async toggleCommentUpvote(
        commentId: string,
    ): Promise<{ upvoted: boolean; upvoterIds: string[] }> {
        const res = await postJson<ApiOk<{ upvoted: boolean; upvoterIds: string[] }>>(
            '/api/forum/comment-upvote',
            { commentId },
        );
        return { upvoted: Boolean(res.upvoted), upvoterIds: res.upvoterIds ?? [] };
    }

    static async toggleLockDiscussion(
        postId: string,
        locked: boolean,
        requesterId?: string | null,
        requesterIsAdmin = false,
        authorHint?: string,
    ): Promise<CommunityPost> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');

        const { toggleLockCommunityPost } = await import('@/app/services/lawyer-cloud');
        const localSaved = await toggleLockCommunityPost(
            postId,
            locked,
            userId,
            requesterIsAdmin,
            authorHint,
        );

        try {
            const res = await postJson<ApiOk<{ post: CommunityPost; locked: boolean }>>(
                '/api/forum/lock',
                { postId, locked },
            );
            if (!res.post) return localSaved;
            const reconciled =
                Boolean(res.post.isLocked) === locked
                    ? res.post
                    : { ...res.post, isLocked: locked || undefined, updatedAt: localSaved.updatedAt };
            await persistPostLocally(reconciled);
            return reconciled;
        } catch {
            return localSaved;
        }
    }

    static async reportComment(
        commentId: string,
        reason: string,
    ): Promise<{ ok: boolean; duplicate?: boolean }> {
        const res = await postJson<ApiOk<{ result: { ok: boolean; duplicate?: boolean } }>>(
            '/api/forum/comment-report',
            { commentId, reason },
        );
        return res.result ?? { ok: true };
    }

    static async listGroups(query = ''): Promise<import('@/app/services/forum/forumGroupTypes').ForumGroup[]> {
        const q = query.trim();
        const url = q ? `/api/forum/groups?q=${encodeURIComponent(q)}` : '/api/forum/groups';
        const res = await SecureAPIClient.fetchSecure<{
            ok: boolean;
            groups?: import('@/app/services/forum/forumGroupTypes').ForumGroup[];
            error?: string;
        }>(url, { method: 'GET' });
        if (!res.ok || !Array.isArray(res.groups)) {
            const { ForumGroupLocalStore } = await import('@/app/services/forum/forumGroupLocalStore');
            const { readPersistedSupabaseAuth } = await import('@/app/utils/authStorage');
            const viewerId = readPersistedSupabaseAuth().user?.id ?? null;
            return ForumGroupLocalStore.listGroups(viewerId, q);
        }
        return res.groups;
    }

    static async createGroup(input: {
        name: string;
        description: string;
        coverImage?: string | null;
        isOfficial?: boolean;
    }): Promise<import('@/app/services/forum/forumGroupTypes').ForumGroup> {
        return this.withMutationFallback(
            async () => {
                const res = await postJson<
                    ApiOk<{ group: import('@/app/services/forum/forumGroupTypes').ForumGroup }>
                >('/api/forum/groups', input);
                if (!res.group) throw new Error('استجابة غير صالحة');
                return res.group;
            },
            async () => {
                const { ForumGroupLocalStore } = await import('@/app/services/forum/forumGroupLocalStore');
                const { readPersistedSupabaseAuth } = await import('@/app/utils/authStorage');
                const creatorId = readPersistedSupabaseAuth().user?.id;
                if (!creatorId) throw new Error('يجب تسجيل الدخول');
                return ForumGroupLocalStore.createGroup(creatorId, input);
            },
        );
    }

    static async joinGroup(
        groupId: string,
    ): Promise<import('@/app/services/forum/forumGroupTypes').ForumGroup> {
        return this.withMutationFallback(
            async () => {
                const res = await postJson<
                    ApiOk<{ group: import('@/app/services/forum/forumGroupTypes').ForumGroup }>
                >('/api/forum/groups/join', { groupId });
                if (!res.group) throw new Error('استجابة غير صالحة');
                return res.group;
            },
            async () => {
                const { ForumGroupLocalStore } = await import('@/app/services/forum/forumGroupLocalStore');
                const { readPersistedSupabaseAuth } = await import('@/app/utils/authStorage');
                const lawyerId = readPersistedSupabaseAuth().user?.id;
                if (!lawyerId) throw new Error('يجب تسجيل الدخول');
                ForumGroupLocalStore.joinGroup(groupId, lawyerId);
                const group = ForumGroupLocalStore.getGroup(groupId, lawyerId);
                if (!group) throw new Error('المجموعة غير موجودة');
                return group;
            },
        );
    }

    static async leaveGroup(groupId: string): Promise<void> {
        await this.withMutationFallback(
            async () => {
                await postJson<ApiOk<Record<string, never>>>('/api/forum/groups/leave', { groupId });
            },
            async () => {
                const { ForumGroupLocalStore } = await import('@/app/services/forum/forumGroupLocalStore');
                const { readPersistedSupabaseAuth } = await import('@/app/utils/authStorage');
                const lawyerId = readPersistedSupabaseAuth().user?.id;
                if (!lawyerId) throw new Error('يجب تسجيل الدخول');
                ForumGroupLocalStore.leaveGroup(groupId, lawyerId);
            },
        );
    }
}
