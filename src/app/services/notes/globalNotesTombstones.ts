/**
 * Tombstones لملاحظات المستودع/المفكرة.
 * ذاكرة أمام حارس المسح — التشفير عبر جسر SecureStore.
 * لا تستورد SecureStore هنا: dossierWipeGuard → هذه الوحدة → SecureStore = دورة.
 */
import { createDeletedIdsLiteStore } from '@/app/services/storage/deletedIdsLiteStore';
import { isDeletedIdsStorageUnreadSync } from '@/app/services/storage/deletedIdsPersistBridge';

export const NOTES_DELETED_IDS_KEY = 'hami:lawyer-notes:deleted:v1';
const LOCAL_SCOPE = '_local_';

const store = createDeletedIdsLiteStore(NOTES_DELETED_IDS_KEY, (k) => k.includes(':'));

/** أصل مشفّر لم يُفكّ ≠ لا حذف — دمج السحابة عندها يُعيد المحذوف. */
export function areNotesDeletedIdsUnreadSync(): boolean {
    return isDeletedIdsStorageUnreadSync(NOTES_DELETED_IDS_KEY);
}

/** يفكّ شواهد حذف الملاحظات. false = لا تدمج السحابة. */
export async function ensureNotesDeletedIdsReadable(): Promise<boolean> {
    if (!areNotesDeletedIdsUnreadSync()) return true;
    try {
        const { default: SecureStoreService } = await import('@/app/services/SecureStoreService');
        await SecureStoreService.getItem(NOTES_DELETED_IDS_KEY);
    } catch {
        /* يبقى unread */
    }
    return !areNotesDeletedIdsUnreadSync();
}

function noteTombstoneKey(userId: string | null | undefined, noteId: string): string {
    const scope = userId?.trim() || LOCAL_SCOPE;
    return `${scope}:${String(noteId).trim()}`;
}

/** يُسجّل حذفاً محلياً — يمنع إعادة الدمج من القرص/السحابة/NotesVault */
export function markGlobalNoteDeleted(
    userId: string | null | undefined,
    noteId: string | number,
): void {
    const id = String(noteId).trim();
    if (!id) return;
    store.add([noteTombstoneKey(userId, id), noteTombstoneKey(LOCAL_SCOPE, id)]);
}

export function isGlobalNoteDeleted(
    userId: string | null | undefined,
    noteId: string | number,
): boolean {
    const id = String(noteId).trim();
    if (!id) return false;
    return store.has(noteTombstoneKey(userId, id)) || store.has(noteTombstoneKey(LOCAL_SCOPE, id));
}

export function filterDeletedGlobalNotes<T extends { id?: string | number | null }>(
    notes: T[],
    userId?: string | null,
): T[] {
    const keys = store.read();
    if (keys.size === 0) return notes;
    return notes.filter((n) => {
        const id = n?.id != null ? String(n.id).trim() : '';
        if (!id) return true;
        return !(keys.has(noteTombstoneKey(userId, id)) || keys.has(noteTombstoneKey(LOCAL_SCOPE, id)));
    });
}

/**
 * ترشيح صفوف المزامنة (سحابة/محلي) — نفس عقد الدعاوى/التنفيذ.
 * mark يزرع `_local_:` دائماً فيمرّ الترشيح بلا userId.
 */
export function filterTombstonedNotesSyncRows(rows: unknown, userId?: string | null): unknown[] {
    if (!Array.isArray(rows)) return [];
    return filterDeletedGlobalNotes(
        rows.filter((row): row is { id?: string | number | null } => Boolean(row) && typeof row === 'object'),
        userId,
    );
}

/** هل كل ملاحظات القرص الحالية عليها tombstone؟ — يسمح بمسح `[]` عبر wipe-guard */
export function areAllStoredNotesTombstoned(
    existingRaw: string | null | undefined,
    userId?: string | null,
): boolean {
    if (!existingRaw?.trim()) return true;
    try {
        const parsed: unknown = JSON.parse(existingRaw);
        if (!Array.isArray(parsed) || parsed.length === 0) return true;
        return parsed.every((item) => {
            if (!item || typeof item !== 'object') return true;
            const id = (item as { id?: unknown }).id;
            if (id == null) return true;
            return isGlobalNoteDeleted(userId, String(id));
        });
    } catch {
        return false;
    }
}

/** للاختبارات */
export function resetGlobalNotesTombstonesForTests(): void {
    store.resetForTests();
}
