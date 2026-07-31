import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
import { resolveForumAuthorDisplayName } from '../../../services/forum/forumAuthorResolver.ts';
import { sanitizeCommunityCommentForCreate } from '../../../services/forum/forumPostCreateGuard.ts';
import { assertForumPostGroupAccess } from '../../../services/forum/forumGroupMutationGate.ts';
import { UserRole } from '../../../types/admin-types.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuthAndUnbanned(request);
        if ('response' in auth) {
            return auth.response;
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }

        if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.postId !== 'string') {
            return jsonResponse(400, { ok: false, error: 'action و postId مطلوبان' });
        }

        const postId = payload.postId.trim();
        if (!postId) {
            return jsonResponse(400, { ok: false, error: 'action و postId مطلوبان' });
        }

        const existingPost = await ForumRepository.getPostById(postId);
        if (!existingPost) {
            return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        await assertForumPostGroupAccess(existingPost, auth.userId, auth.isAdmin);

        if (payload.action === 'add') {
            if (!(await checkForumActionRateLimit(auth.userId, 'comment'))) {
                return jsonResponse(429, { ok: false, error: 'تجاوزت حد التعليقات، انتظر قليلاً' });
            }
            if (!isRecord(payload.comment)) {
                return jsonResponse(400, { ok: false, error: 'بيانات التعليق غير صالحة' });
            }
            const rawAuthorId = typeof payload.comment.authorId === 'string' ? payload.comment.authorId : '';
            if (rawAuthorId !== auth.userId) {
                return jsonResponse(403, { ok: false, error: 'معرّف الكاتب لا يطابق الجلسة' });
            }
            const rawContent = typeof payload.comment.content === 'string' ? payload.comment.content.trim() : '';
            if (rawContent.length < 2) {
                return jsonResponse(400, { ok: false, error: 'بيانات التعليق غير صالحة' });
            }
            if (rawContent.length > 5_000) {
                return jsonResponse(400, { ok: false, error: 'بيانات التعليق غير صالحة' });
            }
            const parentId =
                typeof payload.comment.parentId === 'string' && payload.comment.parentId.trim()
                    ? payload.comment.parentId.trim()
                    : undefined;
            const comment = sanitizeCommunityCommentForCreate({
                postId,
                authorId: auth.userId,
                authorName: await resolveForumAuthorDisplayName(auth.userId),
                content: rawContent,
                parentId,
            });
            const updated = await ForumRepository.addComment(postId, comment);
            return jsonResponse(200, {
                ok: true,
                action: 'comment_add',
                post: redactAnonymousAuthor(updated, auth.userId, auth.isAdmin),
            });
        }

        if (payload.action === 'delete') {
            if (!(await checkForumActionRateLimit(auth.userId, 'comment_mutate'))) {
                return jsonResponse(429, { ok: false, error: 'تجاوزت حد تعديل التعليقات' });
            }
            if (typeof payload.commentId !== 'string' || !payload.commentId.trim()) {
                return jsonResponse(400, { ok: false, error: 'commentId مطلوب' });
            }
            const updated = await ForumRepository.deleteComment(
                postId,
                payload.commentId,
                auth.userId,
                auth.isAdmin ? UserRole.SUPER_ADMIN : undefined,
            );
            return jsonResponse(200, {
                ok: true,
                action: 'comment_delete',
                post: redactAnonymousAuthor(updated, auth.userId, auth.isAdmin),
            });
        }

        if (payload.action === 'edit') {
            if (!(await checkForumActionRateLimit(auth.userId, 'comment_mutate'))) {
                return jsonResponse(429, { ok: false, error: 'تجاوزت حد تعديل التعليقات' });
            }
            if (typeof payload.commentId !== 'string' || typeof payload.content !== 'string') {
                return jsonResponse(400, { ok: false, error: 'commentId و content مطلوبان' });
            }
            const updated = await ForumRepository.editComment(
                postId,
                payload.commentId,
                payload.content,
                auth.userId,
            );
            return jsonResponse(200, {
                ok: true,
                action: 'comment_edit',
                post: redactAnonymousAuthor(updated, auth.userId, auth.isAdmin),
            });
        }

        return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const status = (() => {
            if (message.includes('صلاحية') || message.includes('الانضمام للمجموعة')) return 403;
            if (message.includes('أفضل إجابة')) return 409;
            if (message.includes('مقفل')) return 423;
            if (message.includes('قصير') || message.includes('طويل')) return 400;
            if (message.includes('غير موجود')) return 404;
            return 500;
        })();
        return jsonResponse(status, { ok: false, error: message });
    }
}
