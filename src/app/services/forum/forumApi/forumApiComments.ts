import { SecureFetchError } from '@/app/services/SecureAPIClient';
import {
    forumApiPostJson,
    getForumSessionUserId,
    hasForumRemoteSession,
    parseForumApiError,
    persistForumPostLocally,
    withForumMutationFallback,
    type ForumApiOk,
} from '@/app/services/forum/forumApi/forumApiClientCore';
import {
    deleteCommunityComment,
    editCommunityComment,
} from '@/app/services/cloud/lawyerCommunityCloud';
import type { CommunityComment, CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';

type ApiOk<T> = ForumApiOk<T>;

export async function addForumComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
    if (!(await hasForumRemoteSession())) {
        throw new SecureFetchError(
            'يجب تسجيل الدخول بحساب حقيقي للمشاركة في المنتدى',
            401,
            '',
            '/api/forum/comment',
        );
    }

    const res = await forumApiPostJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
        action: 'add',
        postId,
        comment,
    }).catch((err: unknown) => {
        throw new Error('[forumApi:comments:opcode] ' + (parseForumApiError(err)) || 'تعذّر نشر التعليق');
    });
    if (!res.post) throw new Error('[forumApi:comments:opcode] استجابة غير صالحة');
    await persistForumPostLocally(res.post);

    try {
        const { AuditLog } = await import('@/app/services/auditLogPublisher');
        AuditLog.forum.replyPosted({
            questionId: postId,
            questionTitle: String(res.post.content?.slice(0, 80) ?? 'سؤال'),
        });
    } catch {
        /* silent */
    }
    return res.post;
}

export async function deleteForumComment(
    postId: string,
    commentId: string,
    _isAdmin: boolean,
): Promise<CommunityPost> {
    const userId = await getForumSessionUserId();
    if (!userId) throw new Error('[forumApi:comments:opcode] يجب تسجيل الدخول');

    return withForumMutationFallback(
        async () => {
            const res = await forumApiPostJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                action: 'delete',
                postId,
                commentId,
            });
            if (!res.post) throw new Error('[forumApi:comments:opcode] استجابة غير صالحة');
            await persistForumPostLocally(res.post);
            return res.post;
        },
        async () => deleteCommunityComment(postId, commentId, userId, undefined),
        { userId },
    );
}

export async function editForumComment(
    postId: string,
    commentId: string,
    content: string,
): Promise<CommunityPost> {
    const userId = await getForumSessionUserId();
    if (!userId) throw new Error('[forumApi:comments:opcode] يجب تسجيل الدخول');

    return withForumMutationFallback(
        async () => {
            const res = await forumApiPostJson<ApiOk<{ post: CommunityPost }>>('/api/forum/comment', {
                action: 'edit',
                postId,
                commentId,
                content,
            });
            if (!res.post) throw new Error('[forumApi:comments:opcode] استجابة غير صالحة');
            await persistForumPostLocally(res.post);
            return res.post;
        },
        async () => editCommunityComment(postId, commentId, content, userId),
        { userId },
    );
}

export async function toggleForumCommentUpvote(
    commentId: string,
): Promise<{ upvoted: boolean; upvoterIds: string[] }> {
    const res = await forumApiPostJson<ApiOk<{ upvoted: boolean; upvoterIds: string[] }>>(
        '/api/forum/comment-upvote',
        { commentId },
    );
    return { upvoted: Boolean(res.upvoted), upvoterIds: res.upvoterIds ?? [] };
}

export async function reportForumComment(
    commentId: string,
    reason: string,
): Promise<{ ok: boolean; duplicate?: boolean }> {
    const res = await forumApiPostJson<ApiOk<{ result: { ok: boolean; duplicate?: boolean } }>>(
        '/api/forum/comment-report',
        { commentId, reason },
    );
    return res.result ?? { ok: true };
}
