import { clampForumText, sanitizeForumTagsInput } from '@/app/services/forum/forumInputSecurity';
import { mintForumEntityId, isCloudForumStoragePath } from '@/app/services/forum/forumPostCreateGuard';
import { isStoragePathOwnedByUser } from '@/app/api/upload/uploadStorageUtils';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

const DOC_TYPES = new Set(['عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى']);
const MAX_TAGS = 12;
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ForumRepositoryDocPatch = {
    title: string;
    description: string;
    doc_type: RepositoryDocument['type'];
    tags: string[];
    updated_at: string;
    file_name?: string;
    mime_type?: string;
    storage_path?: string;
    file_size?: number;
};

export function assertPublishableRepositoryStoragePath(storagePath: string, authorId: string): void {
    if (!isCloudForumStoragePath(storagePath)) {
        throw new Error('يجب رفع الملف إلى الخادم قبل النشر');
    }
    if (!isStoragePathOwnedByUser(storagePath, authorId)) {
        throw new Error('مسار الملف لا يخص الناشر');
    }
}

function cleanTags(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((tag) => sanitizeForumTagsInput(String(tag)))
        .filter(Boolean)
        .slice(0, MAX_TAGS);
}

function cleanFileSize(raw: unknown): number {
    return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

function requireTitleAndDescription(raw: Partial<RepositoryDocument>): {
    title: string;
    description: string;
} {
    const title = clampForumText(String(raw.title ?? '').trim(), 200);
    const description = clampForumText(String(raw.description ?? '').trim(), 4000);
    if (!title || title.length < 2 || !description || description.length < 2) {
        throw new Error('العنوان والوصف مطلوبان');
    }
    return { title, description };
}

function requireDocType(raw: Partial<RepositoryDocument>): RepositoryDocument['type'] {
    if (!raw.type || !DOC_TYPES.has(raw.type)) {
        throw new Error('نوع المستند غير صالح');
    }
    return raw.type;
}

export function sanitizeForumRepositoryDocument(
    raw: Partial<RepositoryDocument>,
    authorId: string,
    authorName: string,
): RepositoryDocument {
    const { title, description } = requireTitleAndDescription(raw);
    const type = requireDocType(raw);
    const fileName = clampForumText(String(raw.fileName ?? '').trim(), 200);
    if (!fileName) throw new Error('اسم الملف مطلوب');

    const storagePath = typeof raw.storagePath === 'string' ? raw.storagePath.trim() : '';
    assertPublishableRepositoryStoragePath(storagePath, authorId);

    const now = new Date().toISOString();
    const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
    return {
        id: UUID_RE.test(rawId) ? rawId : mintForumEntityId(),
        title,
        description,
        type,
        authorId,
        authorName: clampForumText(authorName.trim() || 'محامٍ', 80),
        uploadDate: now.slice(0, 10),
        updatedAt: now,
        fileName,
        mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : '',
        storagePath,
        fileSize: cleanFileSize(raw.fileSize),
        tags: cleanTags(raw.tags),
    };
}

/** الحقول القابلة للتعديل فقط — لا يُسمح بتغيير المالك أو تاريخ الإنشاء. */
export function sanitizeForumRepositoryDocumentPatch(
    raw: Partial<RepositoryDocument>,
    authorId: string,
): ForumRepositoryDocPatch {
    const { title, description } = requireTitleAndDescription(raw);
    const patch: ForumRepositoryDocPatch = {
        title,
        description,
        doc_type: requireDocType(raw),
        tags: cleanTags(raw.tags),
        updated_at: new Date().toISOString(),
    };

    const storagePath = typeof raw.storagePath === 'string' ? raw.storagePath.trim() : '';
    if (storagePath) {
        assertPublishableRepositoryStoragePath(storagePath, authorId);
        patch.storage_path = storagePath;
        patch.file_name = clampForumText(String(raw.fileName ?? '').trim(), 200) || 'ملف';
        patch.mime_type = typeof raw.mimeType === 'string' ? raw.mimeType : '';
        patch.file_size = cleanFileSize(raw.fileSize);
    }
    return patch;
}
