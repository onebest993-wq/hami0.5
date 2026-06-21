import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumFollowRepository } from '../../../services/forum/forumFollowRepository.ts';
import { dispatchNewFollowerNotification } from '../../../services/forum/forumNotificationDispatch.ts';
import { requireForumAuth, assertForumWriteAllowed, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

function parsePrefs(payload: Record<string, unknown>) {
    return {
        notifyPosts: payload.notifyPosts !== false,
        notifyComments: payload.notifyComments !== false,
        notifyReplies: payload.notifyReplies !== false,
    };
}

/** GET /api/forum/follow — قائمة المتابَعين أو المتابعين */
export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        const url = new URL(request.url);
        const mode = url.searchParams.get('mode') ?? 'following';
        const targetUserId = url.searchParams.get('userId')?.trim() || auth.userId;

        if (mode === 'followers') {
            const rows = await ForumFollowRepository.getFollowers(targetUserId);
            return jsonResponse(200, { ok: true, follows: rows, count: rows.length });
        }

        const rows = await ForumFollowRepository.getFollowing(auth.userId);
        return jsonResponse(200, { ok: true, follows: rows, count: rows.length });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

/** POST /api/forum/follow — متابعة / إلغاء / تفضيلات */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        const writeOk = assertForumWriteAllowed(auth.userId, request);
        if (writeOk.ok === false) return writeOk.response;

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.action !== 'string') {
            return jsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        if (payload.action === 'follow') {
            const followingId = typeof payload.followingId === 'string' ? payload.followingId.trim() : '';
            if (!followingId) return jsonResponse(400, { ok: false, error: 'followingId مطلوب' });
            const prefs = parsePrefs(payload);
            const record = await ForumFollowRepository.follow(auth.userId, followingId, prefs);
            const followerName =
                typeof payload.followerName === 'string' && payload.followerName.trim()
                    ? payload.followerName.trim()
                    : 'محامٍ';
            void dispatchNewFollowerNotification({
                followerId: auth.userId,
                followerName,
                followingId,
            });
            return jsonResponse(200, { ok: true, action: 'follow', follow: record });
        }

        if (payload.action === 'unfollow') {
            const followingId = typeof payload.followingId === 'string' ? payload.followingId.trim() : '';
            if (!followingId) return jsonResponse(400, { ok: false, error: 'followingId مطلوب' });
            await ForumFollowRepository.unfollow(auth.userId, followingId);
            return jsonResponse(200, { ok: true, action: 'unfollow' });
        }

        if (payload.action === 'update_prefs') {
            const followingId = typeof payload.followingId === 'string' ? payload.followingId.trim() : '';
            if (!followingId) return jsonResponse(400, { ok: false, error: 'followingId مطلوب' });
            const record = await ForumFollowRepository.updatePreferences(
                auth.userId,
                followingId,
                parsePrefs(payload),
            );
            return jsonResponse(200, { ok: true, action: 'update_prefs', follow: record });
        }

        if (payload.action === 'status') {
            const followingId = typeof payload.followingId === 'string' ? payload.followingId.trim() : '';
            if (!followingId) return jsonResponse(400, { ok: false, error: 'followingId مطلوب' });
            const following = await ForumFollowRepository.isFollowing(auth.userId, followingId);
            return jsonResponse(200, { ok: true, following });
        }

        return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return jsonResponse(500, { ok: false, error: message });
    }
}
