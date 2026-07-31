/**
 * Tombstones لوثائق الخزنة — خفيف بلا SecureStore / vaultLocalIndex.
 * يمنع سحب فهرس الخزنة الكامل إلى مسار SecureStore / wipe-guard.
 */

const VAULT_DELETED_MIRROR_KEY = 'hami:smartvault:deleted:v1';

let memoryDeletedKeys: Set<string> | null = null;

function vaultDocTombstoneKey(authorId: string, docId: string): string {
  return `${authorId.trim()}:${docId.trim()}`;
}

function readDeletedVaultKeysMirror(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_DELETED_MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === 'string' && k.includes(':'))
      : [];
  } catch {
    return [];
  }
}

function writeDeletedVaultKeysMirror(keys: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(VAULT_DELETED_MIRROR_KEY, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

function readDeletedVaultKeys(): Set<string> {
  if (memoryDeletedKeys) return memoryDeletedKeys;
  memoryDeletedKeys = new Set(readDeletedVaultKeysMirror());
  return memoryDeletedKeys;
}

/** يُسجّل حذفاً محلياً — يمنع إعادة دمج الملف من KV/القرص */
export function markVaultDocDeleted(authorId: string, docId: string): void {
  const author = authorId.trim();
  const id = docId.trim();
  if (!author || !id) return;
  const keys = readDeletedVaultKeys();
  keys.add(vaultDocTombstoneKey(author, id));
  writeDeletedVaultKeysMirror(keys);
}

export function isVaultDocDeleted(authorId: string, docId: string): boolean {
  const author = authorId.trim();
  const id = docId.trim();
  if (!author || !id) return false;
  return readDeletedVaultKeys().has(vaultDocTombstoneKey(author, id));
}

export function filterDeletedVaultDocs<T extends { id: string; authorId: string }>(docs: T[]): T[] {
  const keys = readDeletedVaultKeys();
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
  memoryDeletedKeys = null;
}
