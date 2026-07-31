/**
 * Tombstones لملاحظات المستودع/المفكرة.
 * تمنع إعادة ظهور المحذوف بعد reload (wipe-guard / cloud union-merge / NotesVault).
 */

const NOTES_DELETED_MIRROR_KEY = 'hami:lawyer-notes:deleted:v1';
const LOCAL_SCOPE = '_local_';

let memoryDeletedKeys: Set<string> | null = null;

function noteTombstoneKey(userId: string | null | undefined, noteId: string): string {
    const scope = userId?.trim() || LOCAL_SCOPE;
    return `${scope}:${String(noteId).trim()}`;
}

function readDeletedNotesMirror(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(NOTES_DELETED_MIRROR_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((k): k is string => typeof k === 'string' && k.includes(':'))
            : [];
    } catch {
        return [];
    }
}

function writeDeletedNotesMirror(keys: Set<string>): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(NOTES_DELETED_MIRROR_KEY, JSON.stringify([...keys]));
    } catch {
        /* ignore */
    }
}

function readDeletedNotesKeys(): Set<string> {
    if (memoryDeletedKeys) return memoryDeletedKeys;
    memoryDeletedKeys = new Set(readDeletedNotesMirror());
    return memoryDeletedKeys;
}

/** يُسجّل حذفاً محلياً — يمنع إعادة الدمج من القرص/السحابة/NotesVault */
export function markGlobalNoteDeleted(
    userId: string | null | undefined,
    noteId: string | number,
): void {
    const id = String(noteId).trim();
    if (!id) return;
    const keys = readDeletedNotesKeys();
    keys.add(noteTombstoneKey(userId, id));
    // أيضاً نطاق محلي عام — يغطي غياب userId عند الحذف
    keys.add(noteTombstoneKey(LOCAL_SCOPE, id));
    writeDeletedNotesMirror(keys);
}

export function isGlobalNoteDeleted(
    userId: string | null | undefined,
    noteId: string | number,
): boolean {
    const id = String(noteId).trim();
    if (!id) return false;
    const keys = readDeletedNotesKeys();
    return keys.has(noteTombstoneKey(userId, id)) || keys.has(noteTombstoneKey(LOCAL_SCOPE, id));
}

export function filterDeletedGlobalNotes<T extends { id?: string | number | null }>(
    notes: T[],
    userId?: string | null,
): T[] {
    const keys = readDeletedNotesKeys();
    if (keys.size === 0) return notes;
    return notes.filter((n) => {
        const id = n?.id != null ? String(n.id).trim() : '';
        if (!id) return true;
        return !(
            keys.has(noteTombstoneKey(userId, id)) || keys.has(noteTombstoneKey(LOCAL_SCOPE, id))
        );
    });
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
    memoryDeletedKeys = null;
    try {
        localStorage.removeItem(NOTES_DELETED_MIRROR_KEY);
    } catch {
        /* ignore */
    }
}
