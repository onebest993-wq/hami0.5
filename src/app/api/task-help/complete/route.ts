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
        const mode = payload.mode === 'owner_confirm' ? 'owner_confirm' : 'helper_done';
        const result = await TaskHelpRepository.complete(
            payload.helpRequestId.trim(),
            auth.userId,
            mode,
        );
        if (result.ok === false) {
            const { code } = result;
            const status = code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : 409;
            return jsonResponse(status, {
                ok: false,
                error: 'تعذر تحديث حالة الإنجاز',
                code,
            });
        }
        return jsonResponse(200, { ok: true, request: result.request });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
