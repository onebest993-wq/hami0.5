import { sanitizePayload } from '../../security/sanitizer.ts';
import {
    requireForumAuth,
    requireForumAuthAndUnbanned,
    jsonResponse,
    forumCatchJsonResponse,
} from '../_auth.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { resolveForumAuthorDisplayName } from '../../../services/forum/forumAuthorResolver.ts';
import {
    createForumRepositoryDocOnServer,
    deleteForumRepositoryDocOnServer,
    listForumRepositoryDocsOnServer,
    updateForumRepositoryDocOnServer,
} from '../../../services/forum/forumRepositoryDocs.ts';
import {
    sanitizeForumRepositoryDocument,
    sanitizeForumRepositoryDocumentPatch,
} from '../../../services/forum/forumRepositoryDocsSanitize.ts';
import type { RepositoryDocument } from '../../../services/lawyer-cloud.ts';
import { sweepForumRepositoryOrphansForUser } from '../../../services/forum/forumRepositoryOrphanSweep.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) return auth.response;

        const url = new URL(request.url);
        const limit = Math.min(80, Math.max(1, Number(url.searchParams.get('limit') ?? '80') || 80));
        const documents = await listForumRepositoryDocsOnServer(limit, auth.userId, auth.isAdmin);
        await sweepForumRepositoryOrphansForUser(auth.userId).catch(() => undefined);
        return jsonResponse(200, { ok: true, documents });
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
        if (!isRecord(payload) || typeof payload.action !== 'string') {
            return jsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        // الرفع وحده يستحق حدّاً متشدداً — التعديل والحذف لا يُخنقان به.
        const rateAction = payload.action === 'create' ? 'repository' : 'repository_mutate';
        if (!(await checkForumActionRateLimit(auth.userId, rateAction))) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المستودع' });
        }

        if (payload.action === 'create') {
            const raw = payload.document as Partial<RepositoryDocument> | undefined;
            if (!raw || typeof raw !== 'object') {
                return jsonResponse(400, { ok: false, error: 'المستند مطلوب' });
            }
            const authorName = await resolveForumAuthorDisplayName(auth.userId);
            const doc = sanitizeForumRepositoryDocument(raw, auth.userId, authorName);
            const saved = await createForumRepositoryDocOnServer(doc);
            return jsonResponse(200, { ok: true, action: 'create', document: saved });
        }

        if (payload.action === 'update') {
            const raw = payload.document as Partial<RepositoryDocument> | undefined;
            const docId = typeof payload.docId === 'string' ? payload.docId.trim() : '';
            if (!docId || !raw || typeof raw !== 'object') {
                return jsonResponse(400, { ok: false, error: 'معرّف المستند والمحتوى مطلوبان' });
            }
            const patch = sanitizeForumRepositoryDocumentPatch(raw, auth.userId);
            const saved = await updateForumRepositoryDocOnServer(docId, patch, auth.userId, auth.isAdmin);
            return jsonResponse(200, { ok: true, action: 'update', document: saved });
        }

        if (payload.action === 'delete') {
            const docId = typeof payload.docId === 'string' ? payload.docId.trim() : '';
            if (!docId) return jsonResponse(400, { ok: false, error: 'معرّف المستند مطلوب' });
            await deleteForumRepositoryDocOnServer(docId, auth.userId, auth.isAdmin);
            return jsonResponse(200, { ok: true, action: 'delete' });
        }

        return jsonResponse(400, { ok: false, error: 'action غير معروف' });
    } catch (err) {
        return forumCatchJsonResponse(err);
    }
}
