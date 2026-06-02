import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { requireForumAuth, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) {
            return auth.response;
        }

        if (!auth.isAdmin) {
            return jsonResponse(403, { ok: false, error: 'غير مصرح لك' });
        }

        const payload = sanitizePayload(await request.json());
        if (!isRecord(payload) || typeof payload.postId !== 'string' || typeof payload.pinned !== 'boolean') {
            return jsonResponse(400, { ok: false, error: 'postId و pinned مطلوبان' });
        }

        const updated = await ForumRepository.togglePin(payload.postId, payload.pinned);

        return jsonResponse(200, {
            ok: true,
            action: 'toggle_pin',
            postId: payload.postId,
            pinned: payload.pinned,
            post: updated,
        });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
