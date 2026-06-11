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

function isAdminRole(role: string | undefined): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.MODERATOR;
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
    /** قراءة: fallback عند أخطاء الشبكة فقط — 401/403 تُمرَّر كما هي (حظر/مصادقة). */
    private static async withFallback<T>(apiCall: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
        try {
            return await apiCall();
        } catch (err) {
            if (err instanceof SecureFetchError && (err.status === 401 || err.status === 403)) {
                throw err;
            }
            return await fallback();
        }
    }

    /** كتابة: عند فشل API (403 توقيع/صلاحيات في التطوير) نُكمل محلياً ما أمكن. */
    private static shouldRethrowMutationError(err: unknown): boolean {
        if (!(err instanceof SecureFetchError)) return false;
        if (err.status === 401) return true;
        if (err.status === 403) {
            try {
                const body = JSON.parse(err.bodyText) as { error?: string };
                const msg = body.error ?? '';
                if (msg.includes('محظور')) return true;
            } catch {
                /* ignore */
            }
        }
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
    ): Promise<{ posts: CommunityPost[]; total: number }> {
        const {
            CommunityDB,
            mergeCommunityPostsById,
            sortCommunityPosts,
            filterDeletedCommunityPosts,
            getDeletedCommunityPostIds,
        } = await import('@/app/services/lawyer-cloud');
        const localAll = sortCommunityPosts(await CommunityDB.listPosts());
        const deletedIds = await getDeletedCommunityPostIds();

        try {
            const res = await SecureAPIClient.fetchSecure<PostsListResponse>(
                `/api/forum/posts?limit=${limit}&offset=${offset}`,
                { method: 'GET' },
            );
            if (!res.ok) throw new Error('تعذّر جلب المنشورات');
            const merged = sortCommunityPosts(
                filterDeletedCommunityPosts(mergeCommunityPostsById(localAll, res.posts), deletedIds),
            );
            await CommunityDB.persistPostsBatch(merged);
            return this.slicePostsPage(merged, limit, offset);
        } catch (err) {
            if (err instanceof SecureFetchError && err.status === 401) {
                throw err;
            }
            if (err instanceof SecureFetchError && err.status === 403 && isBannedForumError(err)) {
                throw err;
            }
            return this.slicePostsPage(localAll, limit, offset);
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
        } catch {
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
        } catch {
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

    static async isCurrentUserAdmin(): Promise<boolean> {
        const userId = await getSessionUserId();
        if (!userId) return false;
        const { data } = await supabase.auth.getUser();
        const meta = data.user?.app_metadata as Record<string, unknown> | undefined;
        const userMeta = data.user?.user_metadata as Record<string, unknown> | undefined;
        const role =
            (typeof meta?.role === 'string' ? meta.role : undefined) ??
            (typeof userMeta?.role === 'string' ? userMeta.role : undefined);
        return isAdminRole(role);
    }
}
