import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
import { resolveForumAuthorDisplayName } from '../../../services/forum/forumAuthorResolver.ts';
import type { CommunityComment } from '../../../services/lawyer-cloud.ts';
import { UserRole } from '../../../types/admin-types.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

function normalizeComment(raw: unknown, postId: string, authorName: string): CommunityComment | null {
    if (!isRecord(raw)) return null;
    const id = typeof raw.id === 'string' ? raw.id : null;
    const authorId = typeof raw.authorId === 'string' ? raw.authorId : null;
    const content = typeof raw.content === 'string' ? raw.content.trim() : null;
    const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : null;
    if (!id || !authorId || !content || !createdAt) return null;
    if (content.length < 2) return null;
    // حماية ضد DoS: حد أعلى لطول التعليق (5K حرف)
    if (content.length > 5_000) return null;
    const parentId = typeof raw.parentId === 'string' ? raw.parentId : undefined;
    return { id, postId, authorId, authorName, content, createdAt, parentId };
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

        if (payload.action === 'add') {
            if (!(await checkForumActionRateLimit(auth.userId, 'comment'))) {
                return jsonResponse(429, { ok: false, error: 'تجاوزت حد التعليقات، انتظر قليلاً' });
            }
            const comment = normalizeComment(
                payload.comment,
                payload.postId,
                await resolveForumAuthorDisplayName(auth.userId),
            );
            if (!comment) {
                return jsonResponse(400, { ok: false, error: 'بيانات التعليق غير صالحة' });
            }
            if (comment.authorId !== auth.userId) {
                return jsonResponse(403, { ok: false, error: 'معرّف الكاتب لا يطابق الجلسة' });
            }
            const updated = await ForumRepository.addComment(payload.postId, comment);
            return jsonResponse(200, {
                ok: true,
                action: 'comment_add',
                post: redactAnonymousAuthor(updated, auth.userId, auth.isAdmin),
            });
        }

        if (payload.action === 'delete') {
            if (typeof payload.commentId !== 'string' || !payload.commentId.trim()) {
                return jsonResponse(400, { ok: false, error: 'commentId مطلوب' });
            }
            const updated = await ForumRepository.deleteComment(
                payload.postId,
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
            if (typeof payload.commentId !== 'string' || typeof payload.content !== 'string') {
                return jsonResponse(400, { ok: false, error: 'commentId و content مطلوبان' });
            }
            const updated = await ForumRepository.editComment(
                payload.postId,
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
        // مطابقة لرسائل المنطق المعروفة الصادرة من ForumRepository
        const status = (() => {
            if (message.includes('صلاحية')) return 403;
            if (message.includes('أفضل إجابة')) return 409;
            if (message.includes('مقفل')) return 423; // Locked
            if (message.includes('قصير') || message.includes('طويل')) return 400;
            if (message.includes('غير موجود')) return 404;
            return 500;
        })();
        return jsonResponse(status, { ok: false, error: message });
    }
}
