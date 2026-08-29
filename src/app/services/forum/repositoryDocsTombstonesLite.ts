/**
 * شواهد قبر مستندات المستودع — ذاكرة أمام حارس المسح، بلا SecureStore في هذه الوحدة.
 */
import { createDeletedIdsLiteStore } from '@/app/services/storage/deletedIdsLiteStore';

export const REPOSITORY_DELETED_IDS_KEY = 'hami:repository:deleted:v1';

const store = createDeletedIdsLiteStore(REPOSITORY_DELETED_IDS_KEY, (k) => k.includes(':'));

function repositoryDocTombstoneKey(authorId: string, docId: string): string {
    return `${authorId.trim()}:${docId.trim()}`;
}

/** يُسجّل حذفاً محلياً — يمنع إعادة دمج المستند من KV أو من القرص */
export function markRepositoryDocDeleted(authorId: string, docId: string): void {
    const author = authorId.trim();
    const id = docId.trim();
    if (!author || !id) return;
    store.add([repositoryDocTombstoneKey(author, id)]);
}

export function isRepositoryDocDeleted(authorId: string, docId: string): boolean {
    const author = authorId.trim();
    const id = docId.trim();
    if (!author || !id) return false;
    return store.has(repositoryDocTombstoneKey(author, id));
}

export function filterDeletedRepositoryDocs<T extends { id: string; authorId: string }>(docs: T[]): T[] {
    const keys = store.read();
    if (keys.size === 0) return docs;
    return docs.filter((d) => !keys.has(repositoryDocTombstoneKey(d.authorId, d.id)));
}

/** هل كل مستندات القرص عليها شاهد قبر؟ — يسمح بمرور `[]` عبر حارس المسح */
export function areAllStoredRepositoryDocsTombstoned(existingRaw: string | null | undefined): boolean {
    if (!existingRaw?.trim()) return true;
    try {
        const parsed: unknown = JSON.parse(existingRaw);
        if (!Array.isArray(parsed) || parsed.length === 0) return true;
        return parsed.every((item) => {
            if (!item || typeof item !== 'object') return false;
            const id = (item as { id?: unknown }).id;
            const authorId = (item as { authorId?: unknown }).authorId;
            if (id == null || typeof authorId !== 'string' || !authorId.trim()) return false;
            return isRepositoryDocDeleted(authorId, String(id));
        });
    } catch {
        return false;
    }
}

/** للاختبارات فقط */
export function resetRepositoryDocsTombstonesForTests(): void {
    store.resetForTests();
}
