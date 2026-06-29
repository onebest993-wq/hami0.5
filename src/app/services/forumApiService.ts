import { SecureAPIClient, SecureFetchError } from '@/app/services/SecureAPIClient';
import { sanitizeForumPostContent, sanitizeForumTagsInput } from '@/app/services/forum/forumInputSecurity';
import { sanitizeCommunityPostForCreate } from '@/app/services/forum/forumPostCreateGuard';
import {
    forumApiPostJson,
    getForumSessionUserId,
    persistForumPostLocally,
    removeForumPostLocally,
    shouldRethrowForumMutationError,
    sliceForumPostsPage,
    withForumMutationFallback,
    withForumReadFallback,
    type ForumApiOk,
} from '@/app/services/forum/forumApi/forumApiClientCore';
import {
    addCommunityComment,
    deleteCommunityComment,
    editCommunityComment,
    deleteCommunityPost,
    reportCommunityPost,
    updateCommunityPost,
} from '@/app/services/cloud/lawyerCommunityCloud';
import type { CommunityComment, CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

type ApiOk<T> = ForumApiOk<T>;
type PostsListResponse = { ok: boolean; posts: CommunityPost[]; total: number };

const postJson = forumApiPostJson;
const persistPostLocally = persistForumPostLocally;
const removePostLocally = removeForumPostLocally;
const getSessionUserId = getForumSessionUserId;

export class ForumApiService {
    /** قراءة: fallback عند أخطاء الشبكة أو غياب الجلسة — 403 تُمرَّر (حظر/صلاحيات). */
    private static async withFallback<T>(apiCall: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
        return withForumReadFallback(apiCall, fallback);
    }

    /** كتابة: عند فشل API نُكمل محلياً فقط لأخطاء الشبكة — لا نتجاوز 403 WIFE/صلاحيات. */
    private static shouldRethrowMutationError(err: unknown): boolean {
        return shouldRethrowForumMutationError(err);
    }

    private static slicePostsPage(
        posts: CommunityPost[],
        limit: number,
        offset: number,
    ): { posts: CommunityPost[]; total: number } {
        return sliceForumPostsPage(posts, limit, offset);
    }

    private static async withMutationFallback<T>(
        apiCall: () => Promise<T>,
        fallback: () => Promise<T>,
        options?: { userId?: string | null },
    ): Promise<T> {
        return withForumMutationFallback(apiCall, fallback, options);
    }

    static async listPostsPaginated(
        limit: number,
        offset: number,
        options?: { groupId?: string },
    ): Promise<{ posts: CommunityPost[]; total: number }> {
        const {
            mergeCommunityPostsById,
            sortCommunityPosts,
            filterDeletedCommunityPosts,
            getDeletedCommunityPostIds,
        } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
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
        const safePost = sanitizeCommunityPostForCreate(
            {
                ...post,
                content: sanitizeForumPostContent(String(post.content ?? '')),
                tags: Array.isArray(post.tags)
                    ? post.tags.map((tag) => sanitizeForumTagsInput(String(tag))).filter(Boolean)
                    : [],
            },
            post.authorId,
        );
        const result = await this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/posts', {
                    action: 'create',
                    post: safePost,
                });
                if (!res.post) throw new Error('استجابة غير صالحة');
                await persistPostLocally(res.post);
                return res.post;
            },
            async () => {
                const { addCommunityPost } = await import('@/app/services/cloud/lawyerCommunityCloud');
                await addCommunityPost(safePost);
                return safePost;
            },
            { userId: post.authorId },
        );
        try {
            const { AuditLog } = await import('@/app/services/auditLogPublisher');
            AuditLog.forum.questionPosted({
                questionId: String(result.id ?? safePost.id ?? ''),
                title: String(safePost.content.slice(0, 80) || 'سؤال'),
            });
        } catch { /* silent */ }
        return result;
    }

    static async syncPost(post: CommunityPost): Promise<CommunityPost> {
        const userId = await getSessionUserId();
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
                const { addCommunityPost } = await import('@/app/services/cloud/lawyerCommunityCloud');
                await addCommunityPost(post);
                return post;
            },
            { userId },
        );
    }

    static async getPostById(postId: string): Promise<CommunityPost | null> {
        return this.withFallback(
            async () => {
                const res = await SecureAPIClient.fetchSecure<{ ok: boolean; post?: CommunityPost }>(
                    `/api/forum/posts?postId=${encodeURIComponent(postId)}`,
                    { method: 'GET' },
                );
                if (!res.ok || !res.post) return null;
                return res.post;
            },
            async () => {
                const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
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

        const isOwner = userId === authorId;

        if (isOwner) {
            await deleteCommunityPost(postId, userId, undefined, authorId);
            try {
                await postJson<ApiOk<{ action: string }>>('/api/forum/delete', { postId });
            } catch {
                /* المحلي محذوف — مزامنة الخادم اختيارية */
            }
        } else if (isAdmin) {
            await postJson<ApiOk<{ action: string }>>('/api/forum/delete', { postId });
            await removePostLocally(postId);
        } else {
            throw new Error('ليس لديك صلاحية لحذف هذا المنشور');
        }

        try {
            const { AuditLog } = await import('@/app/services/auditLogPublisher');
            AuditLog.forum.questionDeleted({ questionId: postId });
        } catch { /* silent */ }
    }

    static async togglePin(postId: string, pinned: boolean): Promise<CommunityPost> {
        const res = await postJson<ApiOk<{ post: CommunityPost }>>('/api/forum/pin', {
            postId,
            pinned,
        });
        if (!res.post) throw new Error('المنشور غير موجود بعد التثبيت');
        await persistPostLocally(res.post);
        return res.post;
    }

    static async reportPost(postId: string, reason: string): Promise<{ ok: boolean; duplicate?: boolean }> {
        const userId = await getSessionUserId();
        return this.withMutationFallback(
            async () => {
                const res = await postJson<ApiOk<{ result: { ok: boolean; duplicate?: boolean } }>>(
                    '/api/forum/report',
                    { postId, reason },
                );
                return res.result ?? { ok: true };
            },
            async () => reportCommunityPost(postId, reason, userId ?? undefined),
            { userId },
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
        const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
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
            const parentComment = comment.parentId
                ? result.comments.find((c) => c.id === comment.parentId) ?? null
                : null;
            try {
                const {
                    autoSubscribeCommenterToThread,
                    dispatchCommentNotifications,
                } = await import('@/app/services/forum/forumNotificationDispatch');
                await autoSubscribeCommenterToThread(comment.authorId, postId);
                await dispatchCommentNotifications({ post: result, comment, parentComment });
            } catch {
                /* offline dispatch optional */
            }
        }

        try {
            const { AuditLog } = await import('@/app/services/auditLogPublisher');
            AuditLog.forum.replyPosted({
                questionId: postId,
                questionTitle: String(result.content?.slice(0, 80) ?? 'سؤال'),
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
            async () => deleteCommunityComment(postId, commentId, userId, undefined),
            { userId },
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
            { userId },
        );
    }

    static async isUserBanned(userId: string): Promise<boolean> {
        const { getCurrentAccessToken } = await import('./SecureAPIClient');
        if (!(await getCurrentAccessToken())) {
            const { BanDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
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
                const { BanDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
                const record = await BanDB.isBanned(userId);
                return Boolean(record);
            },
        );
    }

    // ============== الميزات الجديدة (Bookmarks / Comment Upvotes / Lock / Comment Report) ==============

    static async listBookmarks(requesterId?: string | null): Promise<string[]> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return [];

        const { ForumBookmarkDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
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

        const { ForumBookmarkDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
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

        const ownerId = authorHint?.trim() || '';
        const isOwner = ownerId !== '' && userId === ownerId;

        if (isOwner) {
            const { toggleLockCommunityPost } = await import('@/app/services/cloud/lawyerCommunityCloud');
            const localSaved = await toggleLockCommunityPost(
                postId,
                locked,
                userId,
                false,
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

        if (requesterIsAdmin) {
            const res = await postJson<ApiOk<{ post: CommunityPost; locked: boolean }>>(
                '/api/forum/lock',
                { postId, locked },
            );
            if (!res.post) throw new Error('تعذّر تحديث حالة القفل');
            await persistPostLocally(res.post);
            return res.post;
        }

        throw new Error('ليس لديك صلاحية لقفل النقاش');
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
        const { getCurrentAccessToken } = await import('./SecureAPIClient');
        if (!(await getCurrentAccessToken())) {
            return this.listGroupsLocal(q);
        }

        const url = q ? `/api/forum/groups?q=${encodeURIComponent(q)}` : '/api/forum/groups';
        return this.withFallback(
            async () => {
                const res = await SecureAPIClient.fetchSecure<{
                    ok: boolean;
                    groups?: import('@/app/services/forum/forumGroupTypes').ForumGroup[];
                }>(url, { method: 'GET' });
                if (!res.ok || !Array.isArray(res.groups)) {
                    return this.listGroupsLocal(q);
                }
                return res.groups;
            },
            async () => this.listGroupsLocal(q),
        );
    }

    private static async listGroupsLocal(
        query = '',
    ): Promise<import('@/app/services/forum/forumGroupTypes').ForumGroup[]> {
        const { ForumGroupLocalStore } = await import('@/app/services/forum/forumGroupLocalStore');
        const viewerId = readPersistedSupabaseAuth().user?.id ?? null;
        return ForumGroupLocalStore.listGroups(viewerId, query.trim());
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

    // ============== المتابعة والتنبيهات ==============

    static async listFollowing(requesterId?: string | null) {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return [];

        const { FollowDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const localRecords = await FollowDB.getFollowing(userId);

        const { getCurrentAccessToken } = await import('./SecureAPIClient');
        if (!(await getCurrentAccessToken())) {
            return localRecords.map((r) => ({
                ...r,
                notifyPosts: true,
                notifyComments: true,
                notifyReplies: true,
            }));
        }

        try {
            const res = await SecureAPIClient.fetchSecure<{
                ok: boolean;
                follows: Array<{
                    followerId: string;
                    followingId: string;
                    createdAt: string;
                    notifyPosts: boolean;
                    notifyComments: boolean;
                    notifyReplies: boolean;
                }>;
            }>('/api/forum/follow?mode=following', { method: 'GET' });
            return Array.isArray(res.follows) ? res.follows : [];
        } catch {
            return localRecords.map((r) => ({
                ...r,
                notifyPosts: true,
                notifyComments: true,
                notifyReplies: true,
            }));
        }
    }

    static async followUser(
        followingId: string,
        options?: {
            requesterId?: string | null;
            followerName?: string;
            notifyPosts?: boolean;
            notifyComments?: boolean;
            notifyReplies?: boolean;
        },
    ): Promise<boolean> {
        const userId = await getSessionUserId(options?.requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');

        const { FollowDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        await FollowDB.follow(userId, followingId);

        try {
            await postJson<ApiOk<{ follow: unknown }>>('/api/forum/follow', {
                action: 'follow',
                followingId,
                followerName: options?.followerName,
                notifyPosts: options?.notifyPosts !== false,
                notifyComments: options?.notifyComments !== false,
                notifyReplies: options?.notifyReplies !== false,
            });
            return true;
        } catch {
            return true;
        }
    }

    static async unfollowUser(followingId: string, requesterId?: string | null): Promise<void> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');

        const { FollowDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        await FollowDB.unfollow(userId, followingId);

        try {
            await postJson<ApiOk<Record<string, never>>>('/api/forum/follow', {
                action: 'unfollow',
                followingId,
            });
        } catch {
            /* local fallback ok */
        }
    }

    static async updateFollowPreferences(
        followingId: string,
        prefs: { notifyPosts?: boolean; notifyComments?: boolean; notifyReplies?: boolean },
        requesterId?: string | null,
    ): Promise<void> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');
        await postJson<ApiOk<{ follow: unknown }>>('/api/forum/follow', {
            action: 'update_prefs',
            followingId,
            ...prefs,
        });
    }

    static async getFollowerCount(userId: string): Promise<number> {
        const { FollowDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        try {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; count: number }>(
                `/api/forum/follow?mode=followers&userId=${encodeURIComponent(userId)}`,
                { method: 'GET' },
            );
            if (typeof res.count === 'number') return res.count;
        } catch {
            /* fallback */
        }
        return FollowDB.getFollowerCount(userId);
    }

    static async listFollowers(targetUserId: string, requesterId?: string | null) {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return [];

        try {
            const res = await SecureAPIClient.fetchSecure<{
                ok: boolean;
                follows: Array<{
                    followerId: string;
                    followingId: string;
                    createdAt: string;
                }>;
            }>(`/api/forum/follow?mode=followers&userId=${encodeURIComponent(targetUserId)}`, {
                method: 'GET',
            });
            return Array.isArray(res.follows) ? res.follows : [];
        } catch {
            return [];
        }
    }

    static async listPostSubscriptions(requesterId?: string | null): Promise<string[]> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return [];

        const { getCurrentAccessToken } = await import('./SecureAPIClient');
        if (!(await getCurrentAccessToken())) {
            const { ForumPostFollowRepository } = await import('@/app/services/forum/forumPostFollowRepository');
            return ForumPostFollowRepository.listPostIdsForUser(userId);
        }

        try {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; postIds: string[] }>(
                '/api/forum/post-follow',
                { method: 'GET' },
            );
            return Array.isArray(res.postIds) ? res.postIds : [];
        } catch {
            const { ForumPostFollowRepository } = await import('@/app/services/forum/forumPostFollowRepository');
            return ForumPostFollowRepository.listPostIdsForUser(userId);
        }
    }

    static async togglePostSubscription(postId: string, requesterId?: string | null): Promise<boolean> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) throw new Error('يجب تسجيل الدخول');

        try {
            const res = await postJson<ApiOk<{ subscribed: boolean }>>('/api/forum/post-follow', {
                postId,
                action: 'toggle',
            });
            return Boolean(res.subscribed);
        } catch {
            const { ForumPostFollowRepository } = await import('@/app/services/forum/forumPostFollowRepository');
            const sub = await ForumPostFollowRepository.isSubscribed(userId, postId);
            if (sub) {
                await ForumPostFollowRepository.unsubscribe(userId, postId);
                return false;
            }
            await ForumPostFollowRepository.subscribe(userId, postId);
            return true;
        }
    }

    static async listForumNotifications(requesterId?: string | null): Promise<{
        notifications: import('@/app/services/cloud/lawyerCommunityTypes').ForumNotification[];
        unreadCount: number;
    }> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return { notifications: [], unreadCount: 0 };

        const { NotificationDB } = await import('@/app/services/notifications/notificationForumStorage');
        const local = await NotificationDB.getNotifications(userId);

        const { getCurrentAccessToken } = await import('./SecureAPIClient');
        if (!(await getCurrentAccessToken())) {
            return {
                notifications: local,
                unreadCount: local.filter((n) => !n.read).length,
            };
        }

        try {
            const res = await SecureAPIClient.fetchSecure<{
                ok: boolean;
                notifications: import('@/app/services/cloud/lawyerCommunityTypes').ForumNotification[];
                unreadCount: number;
            }>('/api/forum/notifications', { method: 'GET' });
            const notifications = Array.isArray(res.notifications) ? res.notifications : local;
            const unreadCount =
                typeof res.unreadCount === 'number'
                    ? res.unreadCount
                    : notifications.filter((n) => !n.read).length;

            if (typeof window !== 'undefined') {
                const { syncForumNotificationsToAppStore, emitForumUnreadCount } = await import(
                    '@/app/services/forum/forumNotificationBridge'
                );
                syncForumNotificationsToAppStore(userId, notifications);
                emitForumUnreadCount(unreadCount, { refresh: true });
            }

            return { notifications, unreadCount };
        } catch {
            const unreadCount = local.filter((n) => !n.read).length;
            if (typeof window !== 'undefined') {
                const { emitForumUnreadCount } = await import('@/app/services/forum/forumNotificationBridge');
                emitForumUnreadCount(unreadCount, { refresh: true });
            }
            return {
                notifications: local,
                unreadCount,
            };
        }
    }

    static async markForumNotificationRead(notificationId: string, requesterId?: string | null): Promise<void> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return;

        const { persistForumNotificationRead, countForumUnread } = await import(
            '@/app/services/notifications/forumNotificationRead'
        );
        await persistForumNotificationRead(userId, notificationId);

        if (typeof window !== 'undefined') {
            const { syncForumReadToShell } = await import(
                '@/app/services/notifications/notificationReadSync'
            );
            await syncForumReadToShell(userId, notificationId);
            const remaining = await countForumUnread(userId);
            const { emitForumUnreadCount } = await import('@/app/services/forum/forumNotificationBridge');
            emitForumUnreadCount(remaining);
        }
    }

    static async markAllForumNotificationsRead(requesterId?: string | null): Promise<void> {
        const userId = await getSessionUserId(requesterId);
        if (!userId) return;

        const { persistForumMarkAllRead } = await import(
            '@/app/services/notifications/forumNotificationRead'
        );
        await persistForumMarkAllRead(userId);

        if (typeof window !== 'undefined') {
            const { syncForumMarkAllReadToShell } = await import(
                '@/app/services/notifications/notificationReadSync'
            );
            await syncForumMarkAllReadToShell(userId);
            const { emitForumUnreadCount } = await import('@/app/services/forum/forumNotificationBridge');
            emitForumUnreadCount(0);
        }
    }
}
