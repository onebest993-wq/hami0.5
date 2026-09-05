import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { assertForumCommentGroupAccess } from '../../../services/forum/forumCommentAccess.ts';
import { sanitizeForumReportReason } from '../../../services/forum/forumInputSecurity.ts';
import { requireForumAuthAndUnbanned, jsonResponse, forumCatchJsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
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
        const reason = sanitizeForumReportReason(payload.reason);
        if (reason.length < 2) {
            return jsonResponse(400, { ok: false, error: 'commentId و reason مطلوبان' });
        }

        await assertForumCommentGroupAccess(commentId, auth.userId, auth.isAdmin);

        if (!(await checkForumActionRateLimit(auth.userId, 'report', { postId: `c:${commentId}` }))) {
            return jsonResponse(429, { ok: false, error: 'لقد أبلغت عن هذا التعليق مسبقاً' });
        }
        const result = await ForumRepository.reportComment(commentId, reason, auth.userId);
        if (result.ok) {
            void import('../../../services/forum/forumReportModeratorNotify.server').then(
                ({ dispatchForumReportSubmitted }) =>
                    dispatchForumReportSubmitted({
                        postId: commentId,
                        reporterId: auth.userId,
                        reason,
                        targetLabel: 'تعليق',
                    }),
            );
        }
        return jsonResponse(200, { ok: true, result });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
