import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumPostFollowRepository } from '../../../services/forum/forumPostFollowRepository.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { assertForumPostGroupAccess } from '../../../services/forum/forumGroupMutationGate.ts';
import { requireForumAuth, assertForumWriteAllowed, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;
        const postIds = await ForumPostFollowRepository.listPostIdsForUser(auth.userId);
        return jsonResponse(200, { ok: true, postIds });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;
        const writeOk = assertForumWriteAllowed(auth.userId, request);
        if (writeOk.ok === false) return writeOk.response;

        if (!(await checkForumActionRateLimit(auth.userId, 'bookmark'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد الاشتراك، انتظر قليلاً' });
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

        const action = typeof payload.action === 'string' ? payload.action : 'toggle';

        if (action === 'subscribe') {
            await ForumPostFollowRepository.subscribe(auth.userId, postId);
            return jsonResponse(200, { ok: true, subscribed: true });
        }
        if (action === 'unsubscribe') {
            await ForumPostFollowRepository.unsubscribe(auth.userId, postId);
            return jsonResponse(200, { ok: true, subscribed: false });
        }

        const subscribed = await ForumPostFollowRepository.isSubscribed(auth.userId, postId);
        if (subscribed) {
            await ForumPostFollowRepository.unsubscribe(auth.userId, postId);
            return jsonResponse(200, { ok: true, subscribed: false });
        }
        await ForumPostFollowRepository.subscribe(auth.userId, postId);
        return jsonResponse(200, { ok: true, subscribed: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const status = message.includes('الانضمام للمجموعة') ? 403 : message.includes('غير موجود') ? 404 : 500;
        return jsonResponse(status, { ok: false, error: message });
    }
}
