import { TaskHelpRepository } from '../../../services/taskHelp/taskHelpRepository.ts';
import { jsonResponse, requireTaskHelpAuth } from '../_auth.ts';

export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireTaskHelpAuth(request);
        if (auth instanceof Response) return auth;
        const requests = await TaskHelpRepository.listForUser(auth.userId);
        return jsonResponse(200, { ok: true, requests });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
