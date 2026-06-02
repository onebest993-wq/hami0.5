import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/** POST /api/forum/lock — قفل/فتح النقاش على منشور (المالك أو الأدمن) */
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
            typeof payload.postId !== 'string' ||
            !payload.postId.trim() ||
            typeof payload.locked !== 'boolean'
        ) {
            return jsonResponse(400, { ok: false, error: 'postId و locked مطلوبان' });
        }
        const updated = await ForumRepository.toggleLockDiscussion(
            payload.postId,
            payload.locked,
            auth.userId,
            auth.isAdmin,
        );
        return jsonResponse(200, {
            ok: true,
            locked: payload.locked,
            post: redactAnonymousAuthor(updated, auth.userId, auth.isAdmin),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const status = (() => {
            if (message.includes('صلاحية')) return 403;
            if (message.includes('غير موجود')) return 404;
            return 500;
        })();
        return jsonResponse(status, { ok: false, error: message });
    }
}
