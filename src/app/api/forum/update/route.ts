import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
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

        if (!(await checkForumActionRateLimit(auth.userId, 'update'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد التعديل، انتظر قليلاً' });
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
            typeof payload.content !== 'string'
        ) {
            return jsonResponse(400, { ok: false, error: 'postId و content مطلوبان' });
        }

        const postId = payload.postId.trim();
        const content = payload.content.trim();
        if (content.length < 5) {
            return jsonResponse(400, { ok: false, error: 'المحتوى قصير جداً' });
        }
        if (content.length > 10_000) {
            return jsonResponse(413, { ok: false, error: 'المحتوى طويل جداً (الحد 10000 حرف)' });
        }

        const existing = await ForumRepository.getPostById(postId);
        if (!existing) {
            return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        await assertForumPostGroupAccess(existing, auth.userId, auth.isAdmin);

        const updated = await ForumRepository.updatePostContent(
            postId,
            content,
            auth.userId,
            auth.isAdmin,
        );

        return jsonResponse(200, {
            ok: true,
            action: 'forum_update',
            post: redactAnonymousAuthor(updated, auth.userId, auth.isAdmin),
        });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
