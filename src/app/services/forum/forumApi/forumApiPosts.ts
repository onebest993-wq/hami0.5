import { SecureAPIClient, getCurrentAccessToken } from '@/app/services/SecureAPIClient';
import {
    forumApiPostJson,
    getForumSessionUserId,
    persistForumPostLocally,
    removeForumPostLocally,
    shouldRethrowForumMutationError,
    withForumMutationFallback,
    withForumReadFallback,
    type ForumApiOk,
} from '@/app/services/forum/forumApi/forumApiClientCore';
import {
    deleteCommunityPost,
    reportCommunityPost,
    updateCommunityPost,
} from '@/app/services/cloud/lawyerCommunityCloud';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import {
    addCommunityPost,
    BanDB,
    CommunityDB,
    ForumBookmarkDB,
    toggleLockCommunityPost,
} from '@/app/services/forum/forumCommunityRuntime';

type ApiOk<T> = ForumApiOk<T>;

export async function syncForumPost(post: CommunityPost): Promise<CommunityPost> {
    await addCommunityPost(post);

    void (async () => {
        try {
            const res = await forumApiPostJson<ApiOk<{ post: CommunityPost }>>('/api/forum/posts', {
                action: 'sync',
                post,
            });
            if (!res.post) return;
            const reconciled = {
                ...res.post,
                upvoterIds: res.post.upvoterIds ?? post.upvoterIds ?? [],
                comments: res.post.comments?.length ? res.post.comments : post.comments,
                attachment: res.post.attachment ?? post.attachment ?? null,
            };
            await persistForumPostLocally(reconciled);
        } catch (err) {
            if (shouldRethrowForumMutationError(err)) {
                /* المحلي محدّث */
            }
        }
    })();

    return post;
}

export async function getForumPostById(postId: string): Promise<CommunityPost | null> {
    return withForumReadFallback(
        async () => {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; post?: CommunityPost }>(
                `/api/forum/posts?postId=${encodeURIComponent(postId)}`,
                { method: 'GET' },
            );
            if (!res.ok || !res.post) return null;
            return res.post;
        },
        async () => {
            const all = await CommunityDB.listPosts();
            return all.find((p) => p.id === postId) ?? null;
        },
    );
}

export async function deleteForumPost(
    postId: string,
    authorId: string,
    isAdmin: boolean,
    requesterId?: string | null,
): Promise<void> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) throw new Error('[forumApi:posts:opcode] يجب تسجيل الدخول');

    const isOwner = userId === authorId;

    if (isOwner) {
        await deleteCommunityPost(postId, userId, undefined, authorId);
        void forumApiPostJson<ApiOk<{ action: string }>>('/api/forum/delete', { postId }).catch(() => undefined);
    } else if (isAdmin) {
        void forumApiPostJson<ApiOk<{ action: string }>>('/api/forum/delete', { postId }).catch(() => undefined);
        await removeForumPostLocally(postId);
    } else {
        throw new Error('[forumApi:posts:opcode] ليس لديك صلاحية لحذف هذا المنشور');
    }

    try {
        const { AuditLog } = await import('@/app/services/auditLogPublisher');
        AuditLog.forum.questionDeleted({ questionId: postId });
    } catch {
        /* silent */
    }
}

export async function toggleForumPin(postId: string, pinned: boolean): Promise<CommunityPost> {
    const res = await forumApiPostJson<ApiOk<{ post: CommunityPost }>>('/api/forum/pin', {
        postId,
        pinned,
    });
    if (!res.post) throw new Error('[forumApi:posts:opcode] المنشور غير موجود بعد التثبيت');
    await persistForumPostLocally(res.post);
    return res.post;
}

export async function reportForumPost(
    postId: string,
    reason: string,
): Promise<{ ok: boolean; duplicate?: boolean }> {
    const userId = await getForumSessionUserId();
    return withForumMutationFallback(
        async () => {
            const res = await forumApiPostJson<ApiOk<{ result: { ok: boolean; duplicate?: boolean } }>>(
                '/api/forum/report',
                { postId, reason },
            );
            return res.result ?? { ok: true };
        },
        async () => reportCommunityPost(postId, reason, userId ?? undefined),
        { userId },
    );
}

export async function updateForumPost(
    postId: string,
    content: string,
    requesterId?: string | null,
): Promise<CommunityPost> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) throw new Error('[forumApi:posts:opcode] يجب تسجيل الدخول');

    const localSaved = await updateCommunityPost(postId, content, userId);

    try {
        const res = await forumApiPostJson<ApiOk<{ post: CommunityPost }>>('/api/forum/update', {
            postId,
            content,
        });
        if (!res.post) return localSaved;
        const reconciled =
            res.post.content.trim() === content.trim()
                ? { ...res.post, attachment: res.post.attachment ?? localSaved.attachment ?? null }
                : {
                      ...res.post,
                      content,
                      isEdited: true,
                      updatedAt: localSaved.updatedAt,
                      attachment: res.post.attachment ?? localSaved.attachment ?? null,
                  };
        await persistForumPostLocally(reconciled);
        return reconciled;
    } catch (err) {
        if (shouldRethrowForumMutationError(err)) throw err;
        return localSaved;
    }
}

export async function isForumUserBanned(userId: string): Promise<boolean> {
    if (!(await getCurrentAccessToken())) {
        const record = await BanDB.isBanned(userId);
        return Boolean(record);
    }

    return withForumReadFallback(
        async () => {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; banned: boolean }>(
                '/api/forum/status',
                { method: 'GET' },
            );
            return Boolean(res.banned);
        },
        async () => {
            const record = await BanDB.isBanned(userId);
            return Boolean(record);
        },
    );
}

export async function listForumBookmarks(requesterId?: string | null): Promise<string[]> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return [];

    const localIds = await ForumBookmarkDB.listPostIds(userId);

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

export async function toggleForumBookmark(postId: string, requesterId?: string | null): Promise<boolean> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) throw new Error('[forumApi:posts:opcode] يجب تسجيل الدخول');

    const bookmarked = await ForumBookmarkDB.toggle(userId, postId);

    void forumApiPostJson<ApiOk<{ bookmarked: boolean }>>('/api/forum/bookmark', { postId }).catch(
        () => undefined,
    );

    return bookmarked;
}

export async function toggleForumLockDiscussion(
    postId: string,
    locked: boolean,
    requesterId?: string | null,
    requesterIsAdmin = false,
    authorHint?: string,
): Promise<CommunityPost> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) throw new Error('[forumApi:posts:opcode] يجب تسجيل الدخول');

    const ownerId = authorHint?.trim() || '';
    const isOwner = ownerId !== '' && userId === ownerId;

    if (isOwner) {
        const localSaved = await toggleLockCommunityPost(
            postId,
            locked,
            userId,
            false,
            authorHint,
        );

        void (async () => {
            try {
                const res = await forumApiPostJson<ApiOk<{ post: CommunityPost; locked: boolean }>>(
                    '/api/forum/lock',
                    { postId, locked },
                );
                if (!res.post) return;
                const reconciled =
                    Boolean(res.post.isLocked) === locked
                        ? res.post
                        : {
                              ...res.post,
                              isLocked: locked || undefined,
                              updatedAt: localSaved.updatedAt,
                          };
                await persistForumPostLocally(reconciled);
            } catch {
                /* المحلي محدّث */
            }
        })();

        return localSaved;
    }

    if (requesterIsAdmin) {
        const res = await forumApiPostJson<ApiOk<{ post: CommunityPost; locked: boolean }>>(
            '/api/forum/lock',
            { postId, locked },
        );
        if (!res.post) throw new Error('[forumApi:posts:opcode] تعذّر تحديث حالة القفل');
        await persistForumPostLocally(res.post);
        return res.post;
    }

    throw new Error('[forumApi:posts:opcode] ليس لديك صلاحية لقفل النقاش');
}
