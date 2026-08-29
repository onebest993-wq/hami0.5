import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { mergeSmartVaultDocs } from '@/app/services/vault/vaultDocUtils';
import { isVaultIdbStoragePath } from '@/app/services/vaultBlobStore';
import {
    markVaultDocDeleted,
    resetVaultDocsTombstonesForTests,
} from '@/app/services/vault/vaultDocsTombstonesLite';

export {
    filterDeletedVaultDocs,
    isVaultDocDeleted,
    markVaultDocDeleted,
} from '@/app/services/vault/vaultDocsTombstonesLite';

export const VAULT_LOCAL_KEY = 'hami:smartvault:docs:v1';
/*
 * مرآة قديمة نصّاً صريحاً — تُقرأ مرّة للترحيل ثم تُمحى، ولا يُكتب فيها بعد اليوم.
 *
 * كانت المرآة موجودة لتُتيح قراءة متزامنة بلا انتظار IndexedDB، وكانت أوسع ثقب في
 * المخزن: فهرسٌ فيه أسماء مستندات الموكّلين على القرص بلا تشفير، في أسهل موضع
 * وصولاً. وحين شُفِّر الفهرس بقيت المرآة تنسخه صريحاً — فالتشفير معها زينة.
 *
 * بديلها ليس جديداً: `memoryDocs` هنا، و`decryptedCache` في `SecureStoreService`
 * تُملأ من تسخين مفاتيح القشرة. فالقراءة المتزامنة قائمة على الذاكرة لا على القرص،
 * وهو ما كان يجب أن تكون عليه من البداية.
 */
const VAULT_LEGACY_PLAINTEXT_MIRROR_KEY = 'hami:smartvault:mirror:v1';

const PERSIST_DEBOUNCE_MS = 350;

let memoryDocs: SmartVaultDoc[] | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistChain: Promise<void> = Promise.resolve();

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

/**
 * يقرأ المرآة الصريحة القديمة ويمحوها في النفس نفسه.
 *
 * القراءة لأجل الترحيل وحده: جهازٌ حدّث التطبيق قد يحمل فهرسه هنا فقط. والمحو
 * فوراً لأن تركها يعني إبقاء الأسماء صريحةً على القرص إلى الأبد — وهي الحال التي
 * جاء هذا التغيير ليُنهيها. الناتج يُعاد كتابته مشفَّراً في مسار الحفظ العادي.
 */
function drainLegacyPlaintextMirror(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(VAULT_LEGACY_PLAINTEXT_MIRROR_KEY);
        if (raw !== null) localStorage.removeItem(VAULT_LEGACY_PLAINTEXT_MIRROR_KEY);
        return raw;
    } catch {
        return null;
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
    /*
     * الترحيل مرّة واحدة: ما وجدناه في المرآة القديمة يُعاد حفظه مشفَّراً، والمرآة
     * تُمحى في القراءة نفسها. لا يُنتظر الحفظ — القراءة متزامنة بحكم عقدها.
     */
    const legacy = parseVaultDocsPayload(drainLegacyPlaintextMirror());
    if (legacy.length > 0) {
        memoryDocs = legacy;
        scheduleVaultLocalIndexPersist(legacy);
        return legacy;
    }
    const parsed = parseVaultDocsPayload(readSecureOrDrainLegacySync(VAULT_LOCAL_KEY));
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
    /*
     * `setItemSync` تُحدّث `decryptedCache` فوراً ثم تُشفّر وتحفظ في IndexedDB خلفياً.
     * فالقراءة المتزامنة التالية تجدها في الذاكرة — وهو ما كانت المرآة الصريحة تفعله،
     * بلا نسخة على القرص.
     */
    writeSecureAndClearLegacySync(VAULT_LOCAL_KEY, payload);
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
    /*
     * لا `Promise.race` يحلّ عند المهلة: ذلك كان يُعلن نجاحاً والقرص ما زال
     * خلف IndexedDB. `setItemSync` حدّث الكاش؛ هذا الانتظار هو الكتابة الفعلية.
     * لا تخطَّ الكتابة إن طابق الكاش — وإلا لن تُستدعى `setItem` بعد `setItemSync`.
     */
    await SecureStoreService.setItem(VAULT_LOCAL_KEY, payload);
    clearLegacyPlaintextMirror(VAULT_LOCAL_KEY);
}

/** حفظ فوري في الذاكرة ثم انتظار IndexedDB — بلا مهلة تُحسب نجاحاً */
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
    resetVaultDocsTombstonesForTests();
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = null;
    persistChain = Promise.resolve();
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(VAULT_LEGACY_PLAINTEXT_MIRROR_KEY);
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
