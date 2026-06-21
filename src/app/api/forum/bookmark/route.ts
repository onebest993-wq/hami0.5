import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
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

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.postId !== 'string' || !payload.postId.trim()) {
            return jsonResponse(400, { ok: false, error: 'postId مطلوب' });
        }
        const result = await ForumRepository.toggleBookmark(payload.postId, auth.userId);
        return jsonResponse(200, { ok: true, ...result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return jsonResponse(500, { ok: false, error: message });
    }
}
