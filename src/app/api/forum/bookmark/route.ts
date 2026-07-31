import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { assertForumPostGroupAccess } from '../../../services/forum/forumGroupMutationGate.ts';
// ملاحظة: الحفظ الشخصي (Bookmark) لا يحتاج فحص الحظر —
// المحظور يستطيع القراءة فمن المنطقي أن يحتفظ بقائمة شخصية.
import { requireForumAuth, assertForumWriteAllowed, jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/** GET /api/forum/bookmark — يُعيد قائمة معرّفات المنشورات المحفوظة للمستخدم الحالي */
export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;
        const ids = await ForumRepository.listBookmarkedPostIds(auth.userId);
        return jsonResponse(200, { ok: true, postIds: ids });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

/** POST /api/forum/bookmark — تبديل حفظ/إلغاء حفظ منشور */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        const writeOk = assertForumWriteAllowed(auth.userId, request);
        if (writeOk.ok === false) return writeOk.response;

        if (!(await checkForumActionRateLimit(auth.userId, 'bookmark'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد الحفظ، انتظر قليلاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.postId !== 'string' || !payload.postId.trim()) {
            return jsonResponse(400, { ok: false, error: 'postId مطلوب' });
        }
        const postId = payload.postId.trim();
        const existing = await ForumRepository.getPostById(postId);
        if (!existing) {
            return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        await assertForumPostGroupAccess(existing, auth.userId, auth.isAdmin);

        const result = await ForumRepository.toggleBookmark(postId, auth.userId);
        return jsonResponse(200, { ok: true, ...result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        const status = message.includes('الانضمام للمجموعة') ? 403 : message.includes('غير موجود') ? 404 : 500;
        return jsonResponse(status, { ok: false, error: message });
    }
}
