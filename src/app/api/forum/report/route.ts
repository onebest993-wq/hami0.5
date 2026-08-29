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
            typeof payload.reason !== 'string' ||
            !payload.reason.trim()
        ) {
            return jsonResponse(400, { ok: false, error: 'postId و reason مطلوبان' });
        }

        const postId = payload.postId.trim();
        const existing = await ForumRepository.getPostById(postId);
        if (!existing) {
            return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        await assertForumPostGroupAccess(existing, auth.userId, auth.isAdmin);

        if (!(await checkForumActionRateLimit(auth.userId, 'report', { postId }))) {
            return jsonResponse(429, { ok: false, error: 'لقد أبلغت عن هذا المنشور مسبقاً أو انتظر' });
        }

        const result = await ForumRepository.reportPost(postId, payload.reason, auth.userId);
        if (result.ok) {
            void import('../../../services/forum/forumReportModeratorNotify.server').then(({ dispatchForumReportSubmitted }) =>
                dispatchForumReportSubmitted({
                    postId,
                    reporterId: auth.userId,
                    reason: payload.reason as string,
                    targetLabel: 'منشور',
                }),
            );
        }

        return jsonResponse(200, { ok: true, action: 'forum_report', result });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
