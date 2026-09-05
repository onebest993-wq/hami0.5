import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind } from '@/app/services/forum/repositoryMediaKind';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';

export type ForumRepositorySearchFilters = {
    q: string;
    hasPdf: boolean;
    hasImage: boolean;
    tag: string | null;
    limit: number;
};

/** مرجع عام — يخفي مسار التخزين الذي يبدأ بمعرّف الناشر. */
export const FORUM_REPOSITORY_REF_PREFIX = 'forum-repo:';

export type ForumRepositoryDocRow = {
    id: string;
    author_id: string;
    author_name: string;
    title: string;
    description: string;
    doc_type: RepositoryDocument['type'];
    tags: string[] | null;
    file_name: string;
    mime_type: string;
    storage_path: string;
    file_size: number;
    created_at: string;
    updated_at?: string | null;
};

export function parseForumRepositoryRef(path: string): string | null {
    const trimmed = path.trim();
    if (!trimmed.startsWith(FORUM_REPOSITORY_REF_PREFIX)) return null;
    const id = trimmed.slice(FORUM_REPOSITORY_REF_PREFIX.length).trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        ? id
        : null;
}

export function rowToDocument(row: ForumRepositoryDocRow): RepositoryDocument {
    const createdAt = row.created_at ?? '';
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.doc_type,
        authorId: row.author_id,
        authorName: row.author_name,
        uploadDate: createdAt.slice(0, 10),
        updatedAt: (row.updated_at ?? createdAt) || undefined,
        fileName: row.file_name,
        mimeType: row.mime_type ?? '',
        storagePath: row.storage_path,
        fileSize: row.file_size ?? 0,
        tags: Array.isArray(row.tags) ? row.tags : [],
    };
}

/**
 * يخفي UUID الناشر ومسار التخزين عن غير المالك/المشرف.
 * الاسم المعروض يبقى — المكتبة مشتركة بالاسم لا بالمعرّف.
 */
export function redactForumRepositoryDocument(
    doc: RepositoryDocument,
    viewerId: string,
    isAdmin: boolean,
): RepositoryDocument {
    if (isAdmin || doc.authorId === viewerId) return doc;
    return {
        ...doc,
        authorId: '',
        storagePath: `${FORUM_REPOSITORY_REF_PREFIX}${doc.id}`,
    };
}

export function matchesDocFilters(doc: RepositoryDocument, filters: ForumRepositorySearchFilters): boolean {
    const kind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
    if (filters.hasPdf && kind !== 'pdf') return false;
    if (filters.hasImage && kind !== 'image') return false;
    if (filters.tag?.trim()) {
        const needle = filters.tag.trim().replace(/^#/, '');
        if (!(doc.tags ?? []).some((t) => t.replace(/^#/, '') === needle)) return false;
    }
    const q = filters.q.trim();
    if (!q) return true;
    const hay = [doc.title, doc.description, doc.type, doc.authorName, ...(doc.tags ?? [])].join(' ');
    return archiveTextMatchesQuery(hay, q);
}

export function isMissingTableError(message: string): boolean {
    return /forum_repository_docs|does not exist|schema cache/i.test(message);
}
