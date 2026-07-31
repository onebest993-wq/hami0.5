import { SecureAPIClient, SecureFetchError } from '@/app/services/SecureAPIClient';
import type { ShareScope, TaskHelpRequest } from '@/app/types/taskHelpTypes';
import { TaskHelpRepository } from './taskHelpRepository';
import { assertRecipientInNetwork } from '@/app/services/caseShare/caseShareNetworkGuard';

type ApiOk<T> = { ok: true } & T;

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return SecureAPIClient.fetchSecure<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function rethrowAuthoritativeApiError(err: unknown): never | void {
    if (!(err instanceof SecureFetchError)) return;
    // لا نسمح بالسقوط المحلي بعد رفض خادم موثوق (قفل/صلاحية)
    if (err.status === 403 || err.status === 404 || err.status === 409) {
        let code = 'API_REJECTED';
        try {
            const parsed = JSON.parse(err.bodyText) as { code?: string };
            if (typeof parsed.code === 'string' && parsed.code) code = parsed.code;
        } catch {
            /* ignore */
        }
        throw Object.assign(new Error(code), { code, status: err.status });
    }
}

export class TaskHelpApiService {
    static async list(userId: string): Promise<TaskHelpRequest[]> {
        try {
            const res = await SecureAPIClient.fetchSecure<ApiOk<{ requests: TaskHelpRequest[] }>>(
                '/api/task-help/list',
                { method: 'GET' },
            );
            if (Array.isArray(res.requests)) return res.requests;
        } catch {
            /* local fallback */
        }
        return TaskHelpRepository.listForUser(userId);
    }

    static async create(params: {
        sourceTaskId: string;
        requesterId: string;
        requesterName?: string;
        shareScope: ShareScope;
        title: string;
        location?: string | null;
        dueDate?: string | null;
        instructions?: string;
        isSanitised: boolean;
        targetColleagueId?: string;
        targetColleagueName?: string;
        forumPostId?: string | null;
        note?: string;
    }): Promise<TaskHelpRequest> {
        if (params.shareScope === 'PRIVATE_DIRECT' && params.targetColleagueId) {
            const inNetwork = await assertRecipientInNetwork(
                params.requesterId,
                params.targetColleagueId,
            );
            if (!inNetwork) throw new Error('RECIPIENT_NOT_IN_NETWORK');
        }
        try {
            const res = await postJson<ApiOk<{ request: TaskHelpRequest }>>('/api/task-help/create', {
                ...params,
            });
            if (res.request) return res.request;
        } catch (err) {
            rethrowAuthoritativeApiError(err);
        }
        return TaskHelpRepository.create(params);
    }

    static async accept(
        helpRequestId: string,
        colleagueId: string,
        colleagueName?: string,
    ): Promise<TaskHelpRequest> {
        try {
            const res = await postJson<ApiOk<{ request: TaskHelpRequest }>>('/api/task-help/accept', {
                helpRequestId,
                colleagueName,
            });
            if (res.request) return res.request;
            throw new Error('ACCEPT_FAILED');
        } catch (err) {
            rethrowAuthoritativeApiError(err);
            const local = await TaskHelpRepository.accept(helpRequestId, colleagueId, colleagueName);
            if (local.ok === false) {
                const { code } = local;
                throw Object.assign(new Error(code), { code });
            }
            return local.request;
        }
    }

    static async addNote(
        helpRequestId: string,
        authorId: string,
        text: string,
        authorName?: string,
    ): Promise<TaskHelpRequest> {
        try {
            const res = await postJson<ApiOk<{ request: TaskHelpRequest }>>('/api/task-help/note', {
                helpRequestId,
                text,
                authorName,
            });
            if (res.request) return res.request;
        } catch (err) {
            rethrowAuthoritativeApiError(err);
        }
        const updated = await TaskHelpRepository.addNote(helpRequestId, authorId, text, authorName);
        if (!updated) throw new Error('NOTE_FAILED');
        return updated;
    }

    static async markHelperDone(helpRequestId: string, actorId: string): Promise<TaskHelpRequest> {
        return this.complete(helpRequestId, actorId, 'helper_done');
    }

    static async confirmOwnerReview(helpRequestId: string, actorId: string): Promise<TaskHelpRequest> {
        return this.complete(helpRequestId, actorId, 'owner_confirm');
    }

    private static async complete(
        helpRequestId: string,
        actorId: string,
        mode: 'helper_done' | 'owner_confirm',
    ): Promise<TaskHelpRequest> {
        try {
            const res = await postJson<ApiOk<{ request: TaskHelpRequest }>>(
                '/api/task-help/complete',
                { helpRequestId, mode },
            );
            if (res.request) return res.request;
        } catch (err) {
            rethrowAuthoritativeApiError(err);
        }
        const result = await TaskHelpRepository.complete(helpRequestId, actorId, mode);
        if (result.ok === false) {
            const { code } = result;
            throw Object.assign(new Error(code), { code });
        }
        return result.request;
    }

    static async attachForumPost(
        helpRequestId: string,
        requesterId: string,
        forumPostId: string,
    ): Promise<TaskHelpRequest | null> {
        return TaskHelpRepository.attachForumPost(helpRequestId, requesterId, forumPostId);
    }
}
