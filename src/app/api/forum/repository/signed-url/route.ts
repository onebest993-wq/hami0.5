import { requireForumAuth, jsonResponse, forumCatchJsonResponse } from '../../_auth.ts';
import { checkForumActionRateLimit } from '../../../../services/forum/forumRateLimitServer.ts';
import { signForumRepositoryDocPath } from '../../../../services/forum/forumRepositoryDocs.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/**
 * رابط موقّع لمستند مفهرس في المستودع العام.
 * `/api/upload/signed-url` يشترط ملكية المسار، فلا يصلح لمكتبة مشتركة.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        if (!(await checkForumActionRateLimit(auth.userId, 'repository_read'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد فتح المستندات' });
        }

        const payload = (await request.json().catch(() => null)) as unknown;
        const path = isRecord(payload) && typeof payload.path === 'string' ? payload.path.trim() : '';
        if (!path) return jsonResponse(400, { ok: false, error: 'path مطلوب' });

        const downloadUrl = await signForumRepositoryDocPath(path);
        if (!downloadUrl) {
            return jsonResponse(404, { ok: false, error: 'المستند غير موجود في فهرس المستودع' });
        }

        return jsonResponse(200, { ok: true, downloadUrl, path });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
