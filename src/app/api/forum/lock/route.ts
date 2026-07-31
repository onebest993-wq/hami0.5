import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
import { assertForumPostGroupAccess } from '../../../services/forum/forumGroupMutationGate.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/** POST /api/forum/lock — قفل/فتح النقاش على منشور (المالك أو الأدمن) */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuthAndUnbanned(request);
        if ('response' in auth) return auth.response;

        if (!(await checkForumActionRateLimit(auth.userId, 'lock'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد القفل، انتظر قليلاً' });
        }

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

        const postId = payload.postId.trim();
        const existing = await ForumRepository.getPostById(postId);
        if (!existing) {
            return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        await assertForumPostGroupAccess(existing, auth.userId, auth.isAdmin);

        const updated = await ForumRepository.toggleLockDiscussion(
            postId,
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
            if (message.includes('صلاحية') || message.includes('الانضمام للمجموعة')) return 403;
            if (message.includes('غير موجود')) return 404;
            return 500;
        })();
        return jsonResponse(status, { ok: false, error: message });
    }
}
