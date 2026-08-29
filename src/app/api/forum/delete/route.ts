import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { assertForumPostGroupAccess } from '../../../services/forum/forumGroupMutationGate.ts';
import { requireForumAuthAndUnbanned, jsonResponse, forumCatchJsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuthAndUnbanned(request);
        if ('response' in auth) {
            return auth.response;
        }

        if (!(await checkForumActionRateLimit(auth.userId, 'delete'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد الحذف، انتظر قليلاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }

        if (!isRecord(payload) || typeof payload.postId !== 'string' || !payload.postId.trim()) {
            return jsonResponse(400, { ok: false, error: 'postId مطلوب' });
        }

        const postId = payload.postId.trim();
        const existing = await ForumRepository.getPostById(postId);
        if (!existing) {
            return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        await assertForumPostGroupAccess(existing, auth.userId, auth.isAdmin);

        await ForumRepository.deletePostAuthorized(postId, auth.userId, auth.isAdmin);

        return jsonResponse(200, { ok: true, action: 'forum_delete', postId });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
