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

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };

async function postJson<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    return SecureAPIClient.fetchSecure<T>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function getSessionUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
}

function isAdminRole(role: string | undefined): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.MODERATOR;
}

type PostsListResponse = { ok: boolean; posts: CommunityPost[]; total: number };

export class ForumApiService {
    /** يحاول API الموقّع أولاً، ثم مسار lawyer-cloud عند الفشل (تطوير/انقطاع). */
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

    static async listPostsPaginated(
        limit: number,
        offset: number,
    ): Promise<{ posts: CommunityPost[]; total: number }> {
        return this.withFallback(
            async () => {
                const res = await SecureAPIClient.fetchSecure<PostsListResponse>(
                    `/api/forum/posts?limit=${limit}&offset=${offset}`,
                    { method: 'GET' },
                );
                if (!res.ok) throw new Error('تعذّر جلب المنشورات');
                return { posts: res.posts, total: res.total };
            },
            async () => {
                const { CommunityDB } = await import('@/app/services/lawyer-cloud');
                const all = await CommunityDB.listPosts();
                return { posts: all.slice(offset, offset + limit), total: all.length };
            },
        );
    }

    static async createPost(post: CommunityPost): Promise<CommunityPost> {
        const result = await this.withFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/posts', {
                    action: 'create',
                    post,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
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
        return this.withFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/posts', {
                    action: 'sync',
                    post,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
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

    static async deletePost(postId: string, authorId: string, isAdmin: boolean): Promise<void> {
        const userId = await getSessionUserId();
        if (!userId) throw new Error('يجب تسجيل الدخول');

        await this.withFallback(
            async () => {
                await postJson<ApiOk<{ action: string }>>('/api/forum/delete', { postId });
            },
            async () => {
                await deleteCommunityPost(
                    postId,
                    userId,
                    isAdmin ? UserRole.SUPER_ADMIN : undefined,
                    authorId,
                );
            },
        );
        try {
            const { AuditLog } = await import('@/app/services/auditLogPublisher');
            AuditLog.forum.questionDeleted({ questionId: postId });
        } catch { /* silent */ }
    }

    static async togglePin(postId: string, pinned: boolean): Promise<CommunityPost> {
        return this.withFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/pin', {
                    postId,
                    pinned,
                });
                if (!res.post) throw new Error('المنشور غير موجود بعد التثبيت');
                return res.post;
            },
            async () => togglePinCommunityPost(postId, pinned, UserRole.SUPER_ADMIN),
        );
    }

    static async reportPost(postId: string, reason: string): Promise<{ ok: boolean; duplicate?: boolean }> {
        return this.withFallback(
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

    static async updatePost(postId: string, content: string): Promise<CommunityPost> {
        return this.withFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/update', {
                    postId,
                    content,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
                return res.post;
            },
            async () => {
                const userId = await getSessionUserId();
                if (!userId) throw new Error('يجب تسجيل الدخول');
                return updateCommunityPost(postId, content, userId);
            },
        );
    }

    static async addComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
        const result = await this.withFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                    action: 'add',
                    postId,
                    comment,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
                return res.post;
            },
            async () => {
                await addCommunityComment(postId, comment);
                const { CommunityDB } = await import('@/app/services/lawyer-cloud');
                const posts = await CommunityDB.listPosts();
                const post = posts.find((p) => p.id === postId) ?? null;
                if (!post) throw new Error('المنشور غير موجود');
                return post;
            },
        );
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

        return this.withFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                    action: 'delete',
                    postId,
                    commentId,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
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

        return this.withFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                    action: 'edit',
                    postId,
                    commentId,
                    content,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
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

    static async listBookmarks(): Promise<string[]> {
        try {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; postIds: string[] }>(
                '/api/forum/bookmark',
                { method: 'GET' },
            );
            return Array.isArray(res.postIds) ? res.postIds : [];
        } catch {
            return [];
        }
    }

    static async toggleBookmark(postId: string): Promise<boolean> {
        const res = await postJson<ApiOk<{ bookmarked: boolean }>>('/api/forum/bookmark', { postId });
        return Boolean(res.bookmarked);
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

    static async toggleLockDiscussion(postId: string, locked: boolean): Promise<CommunityPost> {
        const res = await postJson<ApiOk<{ post: CommunityPost; locked: boolean }>>(
            '/api/forum/lock',
            { postId, locked },
        );
        if (!res.post) throw new Error('استجابة غير صالحة');
        return res.post;
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
