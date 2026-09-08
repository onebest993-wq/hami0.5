import { isCloudForumStoragePath } from '@/app/services/forum/forumPostCreateGuard';
import { loadForumSupabaseAdmin } from '@/app/services/forum/loadForumSupabaseAdmin';
import { resolveUploadBucket, SIGNED_URL_TTL_SEC } from '@/app/api/upload/uploadStorageUtils';
import type { ForumRepositoryDocPatch } from '@/app/services/forum/forumRepositoryDocsSanitize';
import {
    FORUM_SEARCH_TEXT_COLUMN,
    forumIlikeContainsPattern,
    forumIlikeRawContainsPattern,
    forumOrIlikeTitleAndDescription,
    isMissingSearchTextColumn,
} from '@/app/services/forum/forumIlikePattern';
import {
    REPOSITORY_MEDIA_KIND_COLUMN,
    isMissingMediaKindColumn,
} from '@/app/services/forum/repositoryMediaKind';
import {
    type ForumRepositoryDocRow,
    type ForumRepositorySearchFilters,
    isMissingTableError,
    matchesDocFilters,
    parseForumRepositoryRef,
    redactForumRepositoryDocument,
    rowToDocument,
} from '@/app/services/forum/forumRepositoryDocsMap';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

export type { ForumRepositorySearchFilters } from '@/app/services/forum/forumRepositoryDocsMap';

export async function listForumRepositoryDocsOnServer(
    limit = 80,
    viewerId: string,
    isAdmin: boolean,
): Promise<RepositoryDocument[]> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) return [];
    const { data, error } = await admin
        .from('forum_repository_docs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(120, Math.max(1, limit)));
    if (error || !data) return [];
    return (data as ForumRepositoryDocRow[])
        .map(rowToDocument)
        .map((doc) => redactForumRepositoryDocument(doc, viewerId, isAdmin));
}

export async function searchForumRepositoryDocsOnServer(
    filters: ForumRepositorySearchFilters,
    viewerId: string,
    isAdmin: boolean,
): Promise<RepositoryDocument[]> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) return [];

    const buildQuery = (useSearchText: boolean, useMediaKind: boolean) => {
        const wantsMedia = filters.hasPdf || filters.hasImage;
        const fetchLimit =
            wantsMedia && !useMediaKind
                ? Math.min(200, Math.max(1, filters.limit) * 4)
                : Math.min(80, Math.max(1, filters.limit));
        let query = admin
            .from('forum_repository_docs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(fetchLimit);

        if (filters.tag?.trim()) {
            query = query.contains('tags', [filters.tag.trim()]);
        }
        if (useMediaKind && filters.hasPdf) {
            query = query.eq(REPOSITORY_MEDIA_KIND_COLUMN, 'pdf');
        } else if (useMediaKind && filters.hasImage) {
            query = query.eq(REPOSITORY_MEDIA_KIND_COLUMN, 'image');
        }
        if (useSearchText) {
            const pattern = forumIlikeContainsPattern(filters.q);
            if (pattern) query = query.ilike(FORUM_SEARCH_TEXT_COLUMN, pattern);
        } else {
            const legacy = forumIlikeRawContainsPattern(filters.q);
            if (legacy) query = query.or(forumOrIlikeTitleAndDescription(legacy));
        }
        return query;
    };

    let useSearchText = true;
    let useMediaKind = true;
    let { data, error } = await buildQuery(useSearchText, useMediaKind);
    if (error && isMissingMediaKindColumn(error.message)) {
        useMediaKind = false;
        ({ data, error } = await buildQuery(useSearchText, useMediaKind));
    }
    if (error && isMissingSearchTextColumn(error.message)) {
        useSearchText = false;
        ({ data, error } = await buildQuery(useSearchText, useMediaKind));
    }
    if (error && isMissingMediaKindColumn(error.message)) {
        useMediaKind = false;
        ({ data, error } = await buildQuery(useSearchText, useMediaKind));
    }
    if (error || !data) return [];

    return (data as ForumRepositoryDocRow[])
        .map(rowToDocument)
        .filter((d) => matchesDocFilters(d, filters))
        .slice(0, filters.limit)
        .map((doc) => redactForumRepositoryDocument(doc, viewerId, isAdmin));
}

export async function createForumRepositoryDocOnServer(doc: RepositoryDocument): Promise<RepositoryDocument> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) throw new Error('[forumRepo:postgres:opcode] تعذّر حفظ المستند في الفهرس');
    const { error } = await admin.from('forum_repository_docs').insert({
        id: doc.id,
        author_id: doc.authorId,
        author_name: doc.authorName,
        title: doc.title,
        description: doc.description,
        doc_type: doc.type,
        tags: doc.tags ?? [],
        file_name: doc.fileName,
        mime_type: doc.mimeType,
        storage_path: doc.storagePath,
        file_size: doc.fileSize,
    });
    if (error) {
        if (error.code === '23505') {
            const { data } = await admin
                .from('forum_repository_docs')
                .select('*')
                .eq('id', doc.id)
                .eq('author_id', doc.authorId)
                .maybeSingle();
            if (data) return rowToDocument(data as ForumRepositoryDocRow);
        }
        if (isMissingTableError(error.message)) throw new Error('[forumRepo:postgres:opcode] فهرس المستودع غير جاهز بعد');
        throw new Error('[forumRepo:postgres:opcode] تعذّر حفظ المستند في الفهرس');
    }
    return doc;
}

export async function updateForumRepositoryDocOnServer(
    docId: string,
    patch: ForumRepositoryDocPatch,
    requesterId: string,
    isAdmin: boolean,
): Promise<RepositoryDocument | null> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) throw new Error('[forumRepo:postgres:opcode] تعذّر تحديث المستند في الفهرس');
    let query = admin.from('forum_repository_docs').update(patch).eq('id', docId);
    if (!isAdmin) query = query.eq('author_id', requesterId);
    const { data, error } = await query.select('*');
    if (error) {
        if (isMissingTableError(error.message)) throw new Error('[forumRepo:postgres:opcode] فهرس المستودع غير جاهز بعد');
        throw new Error('[forumRepo:postgres:opcode] تعذّر تحديث المستند في الفهرس');
    }
    const rows = (data ?? []) as ForumRepositoryDocRow[];
    if (rows.length === 0) throw new Error('[forumRepo:postgres:opcode] المستند غير موجود أو لا يخصّك');
    return rowToDocument(rows[0]!);
}

export async function signForumRepositoryDocPath(storagePath: string): Promise<string | null> {
    const path = storagePath.trim();
    if (!path) return null;
    const admin = await loadForumSupabaseAdmin();
    if (!admin) return null;

    const refId = parseForumRepositoryRef(path);
    const lookup = admin.from('forum_repository_docs').select('storage_path').limit(1);
    const { data: rows, error } = refId
        ? await lookup.eq('id', refId)
        : isCloudForumStoragePath(path)
          ? await lookup.eq('storage_path', path)
          : { data: null, error: null };
    const storage = (rows as { storage_path?: string }[] | null)?.[0]?.storage_path?.trim();
    if (error || !storage || !isCloudForumStoragePath(storage)) return null;

    const { data } = await admin.storage
        .from(resolveUploadBucket())
        .createSignedUrl(storage, SIGNED_URL_TTL_SEC);
    return data?.signedUrl?.trim() || null;
}

export { deleteForumRepositoryDocOnServer } from '@/app/services/forum/forumRepositoryDocsDelete';
