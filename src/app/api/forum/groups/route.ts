import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumGroupRepository } from '../../../services/forum/forumGroupRepository.ts';
import type { CreateForumGroupInput } from '../../../services/forum/forumGroupTypes.ts';
import { requireForumAuthAndUnbanned, jsonResponse, requireForumAuth, forumCatchJsonResponse } from '../_auth.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { sanitizeForumCoverImage } from '../../../services/forum/forumUrlSafety.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        const url = new URL(request.url);
        const query = url.searchParams.get('q') ?? '';
        const groups = await ForumGroupRepository.listGroups(auth.userId, query);
        return jsonResponse(200, { ok: true, groups });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
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

        const name = typeof payload.name === 'string' ? payload.name.trim() : '';
        const description = typeof payload.description === 'string' ? payload.description.trim() : '';
        const coverImage =
            typeof payload.coverImage === 'string'
                ? payload.coverImage.trim()
                : typeof payload.cover_image === 'string'
                  ? payload.cover_image.trim()
                  : null;
        const wantsOfficial = payload.isOfficial === true || payload.is_official === true;

        if (name.length < 3) {
            return jsonResponse(400, { ok: false, error: 'اسم المجموعة قصير جداً (3 أحرف على الأقل)' });
        }
        if (description.length < 8) {
            return jsonResponse(400, { ok: false, error: 'الوصف قصير جداً (8 أحرف على الأقل)' });
        }
        if (wantsOfficial && !auth.isAdmin) {
            return jsonResponse(403, {
                ok: false,
                error: 'المجموعات الرسمية لا ينشئها إلا المشرف.',
            });
        }

        if (!(await checkForumActionRateLimit(auth.userId, 'group_create'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد إنشاء المجموعات، انتظر قليلاً' });
        }

        const input: CreateForumGroupInput = {
            name,
            description,
            coverImage: sanitizeForumCoverImage(coverImage),
            isOfficial: wantsOfficial,
        };
        const group = await ForumGroupRepository.createGroup(auth.userId, input, auth.isAdmin);
        return jsonResponse(200, { ok: true, group });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
