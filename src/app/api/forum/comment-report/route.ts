import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';

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
        // إعادة استخدام نفس rate limit للبلاغات (بمفتاح مختلف لكي لا يتداخل مع تقرير المنشورات)
        if (!checkForumActionRateLimit(auth.userId, 'report', { postId: `c:${payload.commentId}` })) {
            return jsonResponse(429, { ok: false, error: 'لقد أبلغت عن هذا التعليق مسبقاً' });
        }
        const result = await ForumRepository.reportComment(
            payload.commentId,
            payload.reason,
            auth.userId,
        );
        if (result.ok) {
            void import('../../../services/forum/forumNotificationDispatch').then(({ dispatchForumReportSubmitted }) =>
                dispatchForumReportSubmitted({
                    postId: payload.commentId as string,
                    reporterId: auth.userId,
                    reason: payload.reason as string,
                    targetLabel: 'تعليق',
                }),
            );
        }
        return jsonResponse(200, { ok: true, result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return jsonResponse(500, { ok: false, error: message });
    }
}
