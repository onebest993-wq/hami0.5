/**
 * شواهد قبر وثائق الخزنة — ذاكرة فقط أمام حارس المسح.
 * التشفير عبر جسر SecureStore بعد الربط، بلا دائرة استيراد.
 */
import { createDeletedIdsLiteStore } from '@/app/services/storage/deletedIdsLiteStore';

export const VAULT_DELETED_IDS_KEY = 'hami:smartvault:deleted:v1';

const store = createDeletedIdsLiteStore(VAULT_DELETED_IDS_KEY, (k) => k.includes(':'));

function vaultDocTombstoneKey(authorId: string, docId: string): string {
    return `${authorId.trim()}:${docId.trim()}`;
}

/** يُسجّل حذفاً محلياً — يمنع إعادة دمج الملف من KV/القرص */
export function markVaultDocDeleted(authorId: string, docId: string): void {
    const author = authorId.trim();
    const id = docId.trim();
    if (!author || !id) return;
    store.add([vaultDocTombstoneKey(author, id)]);
}

export function isVaultDocDeleted(authorId: string, docId: string): boolean {
    const author = authorId.trim();
    const id = docId.trim();
    if (!author || !id) return false;
    return store.has(vaultDocTombstoneKey(author, id));
}

export function filterDeletedVaultDocs<T extends { id: string; authorId: string }>(docs: T[]): T[] {
    const keys = store.read();
    if (keys.size === 0) return docs;
    return docs.filter((d) => !keys.has(vaultDocTombstoneKey(d.authorId, d.id)));
}

/** هل كل وثائق القرص عليها tombstone؟ — يسمح بمسح `[]` عبر wipe-guard */
export function areAllStoredVaultDocsTombstoned(existingRaw: string | null | undefined): boolean {
    if (!existingRaw?.trim()) return true;
    try {
        const parsed: unknown = JSON.parse(existingRaw);
        if (!Array.isArray(parsed) || parsed.length === 0) return true;
        return parsed.every((item) => {
            if (!item || typeof item !== 'object') return false;
            const id = (item as { id?: unknown }).id;
            const authorId = (item as { authorId?: unknown }).authorId;
            if (id == null || typeof authorId !== 'string' || !authorId.trim()) return false;
            return isVaultDocDeleted(authorId, String(id));
        });
    } catch {
        return false;
    }
}

/** للاختبارات فقط */
export function resetVaultDocsTombstonesForTests(): void {
    store.resetForTests();
}
