import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
import { assertForumPostGroupAccess } from '../../../services/forum/forumGroupMutationGate.ts';
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

        if (!auth.isAdmin) {
            return jsonResponse(403, { ok: false, error: 'غير مصرح لك' });
        }

        const payload = sanitizePayload(await request.json());
        if (!isRecord(payload) || typeof payload.postId !== 'string' || typeof payload.pinned !== 'boolean') {
            return jsonResponse(400, { ok: false, error: 'postId و pinned مطلوبان' });
        }

        const postId = payload.postId.trim();
        if (!postId) {
            return jsonResponse(400, { ok: false, error: 'postId و pinned مطلوبان' });
        }

        const existing = await ForumRepository.getPostById(postId);
        if (!existing) {
            return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        await assertForumPostGroupAccess(existing, auth.userId, auth.isAdmin);

        const updated = await ForumRepository.togglePin(postId, payload.pinned);

        return jsonResponse(200, {
            ok: true,
            action: 'toggle_pin',
            postId,
            pinned: payload.pinned,
            post: redactAnonymousAuthor(updated, auth.userId, auth.isAdmin),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const status = message.includes('الانضمام للمجموعة') ? 403 : message.includes('غير موجود') ? 404 : 500;
        return jsonResponse(status, { ok: false, error: message });
    }
}
