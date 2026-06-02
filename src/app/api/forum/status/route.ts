import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { requireForumAuth, jsonResponse } from '../_auth.ts';

export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) {
            return auth.response;
        }

        const banned = await ForumRepository.isBanned(auth.userId);
        return jsonResponse(200, {
            ok: true,
            banned: Boolean(banned),
            ban: banned,
        });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
