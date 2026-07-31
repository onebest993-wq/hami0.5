import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { assertForumPostGroupAccess } from '../../../services/forum/forumGroupMutationGate.ts';
import { loadForumSupabaseAdmin } from '../../../services/forum/loadForumSupabaseAdmin.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

async function resolveCommentPostId(commentId: string): Promise<string | null> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) return null;
    const { data } = await admin.from('forum_comments').select('post_id').eq('id', commentId).maybeSingle();
    const postId = data && typeof (data as { post_id?: unknown }).post_id === 'string'
        ? (data as { post_id: string }).post_id
        : null;
    return postId?.trim() || null;
}

/** POST /api/forum/comment-report — الإبلاغ عن تعليق */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuthAndUnbanned(request);
        if ('response' in auth) return auth.response;

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (
            !isRecord(payload) ||
            typeof payload.commentId !== 'string' ||
            !payload.commentId.trim() ||
            typeof payload.reason !== 'string' ||
            !payload.reason.trim()
        ) {
            return jsonResponse(400, { ok: false, error: 'commentId و reason مطلوبان' });
        }

        const commentId = payload.commentId.trim();
        const postId = await resolveCommentPostId(commentId);
        if (postId) {
            const existing = await ForumRepository.getPostById(postId);
            if (!existing) {
                return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
            }
            await assertForumPostGroupAccess(existing, auth.userId, auth.isAdmin);
        }

        if (!(await checkForumActionRateLimit(auth.userId, 'report', { postId: `c:${commentId}` }))) {
            return jsonResponse(429, { ok: false, error: 'لقد أبلغت عن هذا التعليق مسبقاً' });
        }
        const result = await ForumRepository.reportComment(commentId, payload.reason, auth.userId);
        if (result.ok) {
            void import('../../../services/forum/forumReportModeratorNotify.server').then(({ dispatchForumReportSubmitted }) =>
                dispatchForumReportSubmitted({
                    postId: commentId,
                    reporterId: auth.userId,
                    reason: payload.reason as string,
                    targetLabel: 'تعليق',
                }),
            );
        }
        return jsonResponse(200, { ok: true, result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const status = message.includes('الانضمام للمجموعة') ? 403 : 500;
        return jsonResponse(status, { ok: false, error: message });
    }
}
