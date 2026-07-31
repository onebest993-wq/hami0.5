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
        const text = typeof payload.text === 'string' ? payload.text.trim() : '';
        if (!text) return jsonResponse(400, { ok: false, error: 'نص الملاحظة مطلوب' });

        const updated = await TaskHelpRepository.addNote(
            payload.helpRequestId.trim(),
            auth.userId,
            text,
            typeof payload.authorName === 'string' ? payload.authorName.trim() : undefined,
        );
        if (!updated) {
            return jsonResponse(403, { ok: false, error: 'تعذر إضافة الملاحظة' });
        }
        return jsonResponse(200, { ok: true, request: updated });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
