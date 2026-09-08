import { forumApiPostJson, parseForumApiError, type ForumApiOk } from '@/app/services/forum/forumApi/forumApiClientCore';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

type ApiOk<T> = ForumApiOk<T>;

export async function listForumRepositoryDocuments(): Promise<RepositoryDocument[]> {
    try {
        const res = await SecureAPIClient.fetchSecure<{ ok: boolean; documents?: RepositoryDocument[] }>(
            '/api/forum/repository?limit=80',
            { method: 'GET' },
        );
        if (!res.ok || !Array.isArray(res.documents)) return [];
        return res.documents;
    } catch {
        return [];
    }
}

export async function createForumRepositoryDocument(
    document: RepositoryDocument,
): Promise<RepositoryDocument> {
    const res = await forumApiPostJson<ApiOk<{ document: RepositoryDocument }>>('/api/forum/repository', {
        action: 'create',
        document,
    }).catch((err: unknown) => {
        throw new Error('[forumApi:repository:opcode] ' + (parseForumApiError(err)) || 'تعذّر فهرسة المستند');
    });
    if (!res.document) throw new Error('[forumApi:repository:opcode] استجابة غير صالحة');
    return res.document;
}

export async function updateForumRepositoryDocument(
    docId: string,
    document: RepositoryDocument,
): Promise<RepositoryDocument> {
    const res = await forumApiPostJson<ApiOk<{ document: RepositoryDocument }>>('/api/forum/repository', {
        action: 'update',
        docId,
        document,
    }).catch((err: unknown) => {
        throw new Error('[forumApi:repository:opcode] ' + (parseForumApiError(err)) || 'تعذّر تحديث فهرس المستند');
    });
    if (!res.document) throw new Error('[forumApi:repository:opcode] استجابة غير صالحة');
    return res.document;
}

/** رابط موقّع لمستند في المكتبة المشتركة — يعمل لمستندات المحامين الآخرين. */
export async function signForumRepositoryDocumentUrl(storagePath: string): Promise<string | null> {
    try {
        const res = await forumApiPostJson<ApiOk<{ downloadUrl?: string }>>(
            '/api/forum/repository/signed-url',
            { path: storagePath },
        );
        return res.downloadUrl?.trim() || null;
    } catch {
        return null;
    }
}

export async function deleteForumRepositoryDocument(docId: string): Promise<void> {
    await forumApiPostJson<ApiOk<{ action: string }>>('/api/forum/repository', {
        action: 'delete',
        docId,
    }).catch((err: unknown) => {
        throw new Error('[forumApi:repository:opcode] ' + (parseForumApiError(err)) || 'تعذّر حذف المستند من الفهرس');
    });
}
