import { sanitizePayload } from '../../../security/sanitizer.ts';
import { ForumGroupRepository } from '../../../../services/forum/forumGroupRepository.ts';
import { checkForumActionRateLimit } from '../../../../services/forum/forumRateLimitServer.ts';
import { requireForumAuthAndUnbanned, jsonResponse, forumCatchJsonResponse } from '../../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuthAndUnbanned(request);
        if ('response' in auth) return auth.response;

        if (!(await checkForumActionRateLimit(auth.userId, 'group_join'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد الانضمام للمجموعات' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload)) {
            return jsonResponse(400, { ok: false, error: 'بيانات غير صالحة' });
        }

        const groupId =
            typeof payload.groupId === 'string'
                ? payload.groupId.trim()
                : typeof payload.group_id === 'string'
                  ? payload.group_id.trim()
                  : '';
        if (!groupId) {
            return jsonResponse(400, { ok: false, error: 'groupId مطلوب' });
        }

        const group = await ForumGroupRepository.getGroup(groupId, auth.userId);
        if (!group) {
            return jsonResponse(404, { ok: false, error: 'المجموعة غير موجودة' });
        }

        const joined = await ForumGroupRepository.joinGroup(groupId, auth.userId);
        return jsonResponse(200, { ok: true, group: joined });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
