import { sanitizePayload } from '../../../security/sanitizer.ts';
import { ForumGroupRepository } from '../../../../services/forum/forumGroupRepository.ts';
import { requireForumAuthAndUnbanned, jsonResponse } from '../../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

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

        await ForumGroupRepository.leaveGroup(groupId, auth.userId);
        return jsonResponse(200, { ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return jsonResponse(500, { ok: false, error: message });
    }
}
