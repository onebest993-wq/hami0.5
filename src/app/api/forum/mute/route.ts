import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumMuteRepository } from '../../../services/forum/forumMuteRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { requireForumAuth, assertForumWriteAllowed, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/** GET /api/forum/mute — قائمة المكتومين للمستخدم الحالي */
export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;
        const mutedIds = await ForumMuteRepository.listMuted(auth.userId);
        return jsonResponse(200, { ok: true, mutedIds });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

/** POST /api/forum/mute — كتم/إلغاء كتم مستخدم */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        const writeOk = assertForumWriteAllowed(auth.userId, request);
        if (writeOk.ok === false) return writeOk.response;

        if (!(await checkForumActionRateLimit(auth.userId, 'mute'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد الكتم، انتظر قليلاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.targetUserId !== 'string' || !payload.targetUserId.trim()) {
            return jsonResponse(400, { ok: false, error: 'targetUserId مطلوب' });
        }
        const targetUserId = payload.targetUserId.trim();
        if (targetUserId === auth.userId) {
            return jsonResponse(400, { ok: false, error: 'لا يمكنك كتم نفسك' });
        }

        const action = payload.action === 'unmute' ? 'unmute' : payload.action === 'mute' ? 'mute' : 'toggle';
        let muted: boolean;
        if (action === 'mute') {
            await ForumMuteRepository.mute(auth.userId, targetUserId);
            muted = true;
        } else if (action === 'unmute') {
            await ForumMuteRepository.unmute(auth.userId, targetUserId);
            muted = false;
        } else {
            const already = await ForumMuteRepository.isMutedBy(auth.userId, targetUserId);
            if (already) {
                await ForumMuteRepository.unmute(auth.userId, targetUserId);
                muted = false;
            } else {
                await ForumMuteRepository.mute(auth.userId, targetUserId);
                muted = true;
            }
        }

        return jsonResponse(200, { ok: true, muted, targetUserId });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return jsonResponse(500, { ok: false, error: message });
    }
}
