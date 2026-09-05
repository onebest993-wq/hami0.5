import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import { requireForumAuth, jsonResponse, forumCatchJsonResponse } from '../_auth.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { searchForumPostsOnServer } from '../../../services/forum/forumRepositorySearch.ts';
import { searchForumRepositoryDocsOnServer } from '../../../services/forum/forumRepositoryDocs.ts';

function parseBool(raw: string | null): boolean {
    return raw === '1' || raw === 'true';
}

export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        if (!(await checkForumActionRateLimit(auth.userId, 'search'))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد البحث، انتظر قليلاً' });
        }

        const url = new URL(request.url);
        const q = clampGlobalSearchQuery(url.searchParams.get('q') ?? '');
        const hasPdf = parseBool(url.searchParams.get('hasPdf'));
        const hasImage = parseBool(url.searchParams.get('hasImage'));
        const tag = (url.searchParams.get('tag') ?? '').trim() || null;
        const limit = Math.min(40, Math.max(1, Number(url.searchParams.get('limit') ?? '40') || 40));
        const filters = { q, hasPdf, hasImage, tag, limit };

        const [posts, documents] = await Promise.all([
            searchForumPostsOnServer(filters, auth.userId, auth.isAdmin),
            searchForumRepositoryDocsOnServer(filters, auth.userId, auth.isAdmin),
        ]);

        return jsonResponse(200, { ok: true, posts, documents });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
