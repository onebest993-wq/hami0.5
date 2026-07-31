import { TaskHelpRepository } from '../../../services/taskHelp/taskHelpRepository.ts';
import { jsonResponse, readJsonBody, requireTaskHelpAuth } from '../_auth.ts';

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireTaskHelpAuth(request);
        if (auth instanceof Response) return auth;
        const payload = await readJsonBody(request);
        if (!payload || typeof payload.helpRequestId !== 'string' || !payload.helpRequestId.trim()) {
            return jsonResponse(400, { ok: false, error: 'helpRequestId مطلوب' });
        }

        const result = await TaskHelpRepository.accept(
            payload.helpRequestId.trim(),
            auth.userId,
            typeof payload.colleagueName === 'string' ? payload.colleagueName.trim() : undefined,
        );

        if (result.ok === false) {
            const { code } = result;
            if (code === 'NOT_FOUND') {
                return jsonResponse(404, { ok: false, error: 'الطلب غير موجود', code });
            }
            if (code === 'ALREADY_ACCEPTED') {
                return jsonResponse(409, {
                    ok: false,
                    error: 'تم قبول الطلب مسبقاً من زميل آخر',
                    code,
                });
            }
            return jsonResponse(403, { ok: false, error: 'غير مسموح', code });
        }

        return jsonResponse(200, { ok: true, request: result.request });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
