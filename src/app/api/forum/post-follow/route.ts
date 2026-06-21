import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumPostFollowRepository } from '../../../services/forum/forumPostFollowRepository.ts';
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
        return jsonResponse(500, { ok: false, error: message });
    }
}
