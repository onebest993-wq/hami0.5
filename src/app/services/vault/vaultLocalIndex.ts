import SecureStoreService from '@/app/services/SecureStoreService';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { mergeSmartVaultDocs } from '@/app/services/vault/vaultDocUtils';
import { isVaultIdbStoragePath } from '@/app/services/vaultBlobStore';

export const VAULT_LOCAL_KEY = 'hami:smartvault:docs:v1';
/** مرآة فورية في localStorage — قراءة/كتابة متزامنة بدون انتظار IndexedDB */
const VAULT_LOCAL_MIRROR_KEY = 'hami:smartvault:mirror:v1';
/** معرّفات محذوفة محلياً — تمنع إعادة الظهور من KV عند فشل الحذف السحابي */
const VAULT_DELETED_MIRROR_KEY = 'hami:smartvault:deleted:v1';

const PERSIST_DEBOUNCE_MS = 350;
const PERSIST_FLUSH_TIMEOUT_MS = 5_000;

let memoryDocs: SmartVaultDoc[] | null = null;
let memoryDeletedKeys: Set<string> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistChain: Promise<void> = Promise.resolve();

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

export function filterDeletedVaultDocs(docs: SmartVaultDoc[]): SmartVaultDoc[] {
    const keys = readDeletedVaultKeys();
    if (keys.size === 0) return docs;
    return docs.filter((d) => !keys.has(vaultDocTombstoneKey(d.authorId, d.id)));
}

/** فهرس خفيف — بدون data URLs ضخمة (الملفات في IDB منفصلة) */
export function normalizeVaultDocForLocalPersist(doc: SmartVaultDoc): SmartVaultDoc {
    const path = doc.storagePath || '';
    if (isVaultIdbStoragePath(path)) {
        return { ...doc, signedUrl: null };
    }
    const signed = doc.signedUrl?.trim() || '';
    if (path.startsWith('local:vault:') && signed.startsWith('data:') && signed.length > 96_000) {
        return { ...doc, signedUrl: null };
    }
    return doc;
}

function readVaultMirrorPayload(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(VAULT_LOCAL_MIRROR_KEY);
    } catch {
        return null;
    }
}

function writeVaultMirrorPayload(payload: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(VAULT_LOCAL_MIRROR_KEY, payload);
    } catch {
        /* quota — SecureStore remains primary */
    }
}

function parseVaultDocsPayload(raw: string | null | undefined): SmartVaultDoc[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as SmartVaultDoc[]) : [];
    } catch {
        return [];
    }
}

/** قراءة متزامنة من الذاكرة أو المرآة أو الكاش — بدون انتظار IndexedDB */
export function readVaultLocalIndexSync(): SmartVaultDoc[] {
    if (memoryDocs !== null) return memoryDocs;
    const mirror = parseVaultDocsPayload(readVaultMirrorPayload());
    if (mirror.length > 0) {
        memoryDocs = mirror;
        return mirror;
    }
    /* بذور E2E / كتابات مباشرة على المفتاح الأساسي */
    if (typeof localStorage !== 'undefined') {
        try {
            const direct = parseVaultDocsPayload(localStorage.getItem(VAULT_LOCAL_KEY));
            if (direct.length > 0) {
                memoryDocs = direct;
                return direct;
            }
        } catch {
            /* ignore */
        }
    }
    const raw = SecureStoreService.getItemSync(VAULT_LOCAL_KEY);
    const parsed = parseVaultDocsPayload(raw);
    if (parsed.length > 0) memoryDocs = parsed;
    return parsed;
}

export async function readVaultLocalIndex(): Promise<SmartVaultDoc[]> {
    if (memoryDocs !== null) return memoryDocs;
    const sync = readVaultLocalIndexSync();
    if (sync.length > 0) return sync;
    try {
        const raw = await SecureStoreService.getItem(VAULT_LOCAL_KEY);
        if (!raw) {
            memoryDocs = [];
            return memoryDocs;
        }
        memoryDocs = parseVaultDocsPayload(raw);
        if (memoryDocs.length > 0) {
            writeVaultMirrorPayload(JSON.stringify(memoryDocs.map(normalizeVaultDocForLocalPersist)));
        }
        return memoryDocs;
    } catch {
        memoryDocs = [];
        return memoryDocs;
    }
}

export function peekVaultLocalIndex(): SmartVaultDoc[] | null {
    return memoryDocs;
}

export function writeVaultLocalIndexSync(docs: SmartVaultDoc[]): void {
    memoryDocs = docs;
}

function mergeVaultLocalDoc(current: SmartVaultDoc[], doc: SmartVaultDoc): SmartVaultDoc[] {
    const idx = current.findIndex((d) => d.id === doc.id);
    if (idx < 0) return [doc, ...current];
    const prev = current[idx]!;
    const next = [...current];
    next[idx] = {
        ...prev,
        ...doc,
        signedUrl: doc.signedUrl ?? prev.signedUrl ?? null,
        storagePath: doc.storagePath || prev.storagePath,
    };
    return next;
}

function writeVaultIndexPayload(docs: SmartVaultDoc[]): void {
    const payload = JSON.stringify(docs.map(normalizeVaultDocForLocalPersist));
    writeVaultMirrorPayload(payload);
    SecureStoreService.setItemSync(VAULT_LOCAL_KEY, payload);
}

/**
 * تحديث فوري في الذاكرة + الكاش المتزامن — لا ينتظر ensureWebReady/IDB.
 * يُستخدم في مسار الحفظ الحرج (رفع ملف، مسح، بطاقة).
 */
export function upsertVaultLocalIndexDocImmediate(doc: SmartVaultDoc): SmartVaultDoc[] {
    if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
    }
    const base = memoryDocs ?? readVaultLocalIndexSync();
    memoryDocs = mergeVaultLocalDoc(mergeSmartVaultDocs(base, []), doc);
    writeVaultIndexPayload(memoryDocs);
    return memoryDocs;
}

async function loadVaultLocalIndexFromStore(): Promise<SmartVaultDoc[]> {
    const sync = readVaultLocalIndexSync();
    if (sync.length > 0) return sync;
    try {
        const raw = await SecureStoreService.getItem(VAULT_LOCAL_KEY);
        return parseVaultDocsPayload(raw);
    } catch {
        return [];
    }
}

function persistVaultLocalIndexNow(docs: SmartVaultDoc[]): void {
    // memoryDocs هو المصدر الحقيقي — لا دمج مع قراءة قديمة من القرص (يعيد الملفات المحذوفة)
    const snapshot = memoryDocs ?? docs;
    memoryDocs = snapshot;
    writeVaultIndexPayload(snapshot);
}

async function persistVaultLocalIndexToDisk(docs: SmartVaultDoc[]): Promise<void> {
    persistVaultLocalIndexNow(docs);
    const payload = JSON.stringify((memoryDocs ?? docs).map(normalizeVaultDocForLocalPersist));
    await Promise.race([
        SecureStoreService.setItem(VAULT_LOCAL_KEY, payload),
        new Promise<void>((resolve) => setTimeout(resolve, PERSIST_FLUSH_TIMEOUT_MS)),
    ]);
}

/** حفظ فوري في الذاكرة ثم مزامنة IDB بخلفية محدودة الوقت */
export async function upsertVaultLocalIndexDocAndFlush(doc: SmartVaultDoc): Promise<void> {
    upsertVaultLocalIndexDocImmediate(doc);
    const snapshot = memoryDocs ?? [doc];
    await persistVaultLocalIndexToDisk(snapshot).catch(() => {
        scheduleVaultLocalIndexPersist(snapshot);
    });
}

/** تحديث فوري في الذاكرة — للمسارات غير الحرجة */
export function upsertVaultLocalIndexDoc(doc: SmartVaultDoc): void {
    upsertVaultLocalIndexDocImmediate(doc);
    scheduleVaultLocalIndexPersist(memoryDocs ?? [doc]);
}

export function removeVaultLocalIndexDoc(docId: string, authorId?: string): SmartVaultDoc[] {
    const id = docId.trim();
    if (!id) return memoryDocs ?? [];
    const current = memoryDocs ?? readVaultLocalIndexSync();
    const next = current.filter((d) => d.id !== id || (authorId ? d.authorId !== authorId : false));
    memoryDocs = next;
    if (authorId?.trim()) {
        markVaultDocDeleted(authorId, id);
    }
    writeVaultIndexPayload(next);
    scheduleVaultLocalIndexPersist(next);
    return next;
}

export function scheduleVaultLocalIndexPersist(docs: SmartVaultDoc[]): void {
    memoryDocs = memoryDocs?.length ? mergeSmartVaultDocs(docs, memoryDocs) : docs;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
        persistTimer = null;
        const snapshot = memoryDocs ?? docs;
        persistChain = persistChain
            .then(() => persistVaultLocalIndexToDisk(snapshot))
            .catch(() => undefined);
    }, PERSIST_DEBOUNCE_MS);
}

export async function flushVaultLocalIndexPersist(): Promise<void> {
    if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
    }
    const snapshot = memoryDocs;
    if (!snapshot) return;
    persistVaultLocalIndexNow(snapshot);
    await persistVaultLocalIndexToDisk(snapshot).catch(() => {
        scheduleVaultLocalIndexPersist(snapshot);
    });
}

export function queueVaultLocalIndexPersist(docs: SmartVaultDoc[]): void {
    memoryDocs = docs;
    writeVaultIndexPayload(docs);
    persistChain = persistChain
        .then(() => persistVaultLocalIndexToDisk(docs))
        .catch(() => undefined);
}

/** للاختبارات */
export function resetVaultLocalIndexForTests(): void {
    memoryDocs = null;
    memoryDeletedKeys = null;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = null;
    persistChain = Promise.resolve();
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(VAULT_DELETED_MIRROR_KEY);
    }
}

if (typeof document !== 'undefined' && !import.meta.env.VITEST) {
    const flush = () => void flushVaultLocalIndexPersist();
    let hiddenFlushTimer: number | null = null;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'hidden') {
            if (hiddenFlushTimer !== null) {
                window.clearTimeout(hiddenFlushTimer);
                hiddenFlushTimer = null;
            }
            return;
        }
        if (hiddenFlushTimer !== null) window.clearTimeout(hiddenFlushTimer);
        hiddenFlushTimer = window.setTimeout(() => {
            hiddenFlushTimer = null;
            if (document.visibilityState === 'hidden') flush();
        }, 900);
    });
    window.addEventListener('pagehide', () => {
        if (hiddenFlushTimer !== null) {
            window.clearTimeout(hiddenFlushTimer);
            hiddenFlushTimer = null;
        }
        flush();
    });
}
