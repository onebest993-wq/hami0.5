import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/** POST /api/forum/comment-upvote — تبديل التصويت على تعليق */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuthAndUnbanned(request);
        if ('response' in auth) return auth.response;

        if (!checkForumActionRateLimit(auth.userId, 'upvote')) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد التصويت' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.commentId !== 'string' || !payload.commentId.trim()) {
            return jsonResponse(400, { ok: false, error: 'commentId مطلوب' });
        }
        const result = await ForumRepository.toggleCommentUpvote(payload.commentId, auth.userId);
        return jsonResponse(200, { ok: true, ...result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const status = message.includes('تعليقك') ? 400 : 500;
        return jsonResponse(status, { ok: false, error: message });
    }
}
