import SecureStoreService from '@/app/services/SecureStoreService';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierPersistenceService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    __resetExecutionFilesStorageOwnerLiteForTests,
    getActiveExecutionFilesStorageOwnerLite,
    normalizeExecutionFilesStorageOwnerId,
    resolveExecutionFilesStorageKeyLite,
    setActiveExecutionFilesStorageOwnerLite,
} from '@/app/utils/executionFilesStorageOwnerLite';

export {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

const OWNER_MIGRATION_FLAG = 'hami:execution:files-owner-migrated:v1';

let executionFilesCacheRaw: string | null = null;
let executionFilesCacheParsed: unknown[] | null = null;

function cloneExecutionFiles(rows: unknown[]): unknown[] {
    return rows.map((row) =>
        row && typeof row === 'object' && !Array.isArray(row)
            ? { ...(row as Record<string, unknown>) }
            : row,
    );
}

function parseExecutionFilesRaw(raw: string | null): unknown[] | null {
    if (!raw) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function setExecutionFilesCache(raw: string | null, rows: unknown[] | null): void {
    executionFilesCacheRaw = raw;
    executionFilesCacheParsed = rows ? cloneExecutionFiles(rows) : null;
}

function clearExecutionFilesCache(): void {
    executionFilesCacheRaw = null;
    executionFilesCacheParsed = null;
}

/** مفتاح التخزين الأساسي للمالك الحالي (أو العام عند غياب المالك — اختبارات/إقلاع مبكر) */
export function resolveExecutionFilesStorageKey(userId?: string | null): string {
    return resolveExecutionFilesStorageKeyLite(userId);
}

function writeExecutionFilesSerializedToKey(key: string, serialized: string): void {
    const existing = SecureStoreService.getItemSync(key);
    if (existing && shouldRejectDossierWipe(key, serialized, existing)) return;
    SecureStoreService.setItemSync(key, serialized);
}

function readLegacyRows(): unknown[] | null {
    const primary = SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY);
    const parsedPrimary = parseExecutionFilesRaw(primary);
    if (parsedPrimary?.length) return parsedPrimary;

    for (const k of EXECUTION_FILES_STORAGE_KEYS_LEGACY) {
        try {
            const raw = SecureStoreService.getItemSync(k);
            const parsed = parseExecutionFilesRaw(raw);
            if (parsed?.length) return parsed;
        } catch {
            /* ignore */
        }
    }
    return null;
}

/**
 * ترحيل لمرة واحدة من المفتاح العام إلى مفتاح المالك — يمنع مشاركة الإضابير بين حسابين.
 * أول حساب حقيقي يسجّل دخولاً بعد الترقية يحصل على البيانات القديمة.
 */
function maybeMigrateLegacyIndexToOwner(ownerId: string): void {
    const claimed = SecureStoreService.getItemSync(OWNER_MIGRATION_FLAG)?.trim();
    if (claimed) return;

    const ownerKey = `${EXECUTION_FILES_STORAGE_KEY}:${ownerId}`;
    const existingOwner = parseExecutionFilesRaw(SecureStoreService.getItemSync(ownerKey));
    if (existingOwner && existingOwner.length > 0) {
        SecureStoreService.setItemSync(OWNER_MIGRATION_FLAG, ownerId);
        return;
    }

    const legacy = readLegacyRows();
    if (legacy && legacy.length > 0) {
        const serialized = JSON.stringify(legacy);
        writeExecutionFilesSerializedToKey(ownerKey, serialized);
        // إفراغ المفتاح العام حتى لا يُعاد ترحيله لحساب لاحق
        writeExecutionFilesSerializedToKey(EXECUTION_FILES_STORAGE_KEY, '[]');
        EXECUTION_FILES_STORAGE_KEYS_LEGACY.forEach((legacyKey) => {
            writeExecutionFilesSerializedToKey(legacyKey, '[]');
        });
    }
    SecureStoreService.setItemSync(OWNER_MIGRATION_FLAG, ownerId);
}

/**
 * يربط فهرس التنفيذ بمستخدم الجلسة. عند تبديل الحساب تُصفَّر الذاكرة المؤقتة.
 */
export function bindExecutionFilesStorageOwner(userId: string | null | undefined): string {
    const { ownerId, changed } = setActiveExecutionFilesStorageOwnerLite(userId);
    if (!changed) {
        return resolveExecutionFilesStorageKey();
    }
    clearExecutionFilesCache();
    if (ownerId) {
        maybeMigrateLegacyIndexToOwner(ownerId);
    }
    return resolveExecutionFilesStorageKey();
}

/**
 * تسخين IndexedDB + ربط المالك ثم قراءة الفهرس — لمسار eager hydrate عند الإقلاع.
 */
export async function hydrateExecutionFilesStorageForOwner(
    userId: string | null | undefined,
): Promise<{ key: string; rows: unknown[] }> {
    await SecureStoreService.ensurePersistedReady();
    const owner = normalizeExecutionFilesStorageOwnerId(userId);
    const warmKeys = [
        EXECUTION_FILES_STORAGE_KEY,
        ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
        OWNER_MIGRATION_FLAG,
    ];
    if (owner) {
        warmKeys.push(`${EXECUTION_FILES_STORAGE_KEY}:${owner}`);
    }
    await Promise.all(warmKeys.map((k) => SecureStoreService.getItem(k)));

    clearExecutionFilesCache();
    const key = bindExecutionFilesStorageOwner(userId);
    await SecureStoreService.getItem(key);
    clearExecutionFilesCache();
    const rows = loadExecutionFilesRaw();
    return { key, rows };
}

export function getActiveExecutionFilesStorageOwner(): string | null {
    return getActiveExecutionFilesStorageOwnerLite();
}

/** للاختبارات فقط */
export function __resetExecutionFilesStorageOwnerForTests(): void {
    __resetExecutionFilesStorageOwnerLiteForTests();
    clearExecutionFilesCache();
}

export function loadExecutionFilesRaw(): unknown[] {
    const primaryKey = resolveExecutionFilesStorageKey();
    const primary = SecureStoreService.getItemSync(primaryKey);
    if (primary && primary === executionFilesCacheRaw && executionFilesCacheParsed) {
        return cloneExecutionFiles(executionFilesCacheParsed);
    }

    const parsedPrimary = parseExecutionFilesRaw(primary);
    if (parsedPrimary) {
        setExecutionFilesCache(primary, parsedPrimary);
        return cloneExecutionFiles(parsedPrimary);
    }

    if (!primary) {
        setExecutionFilesCache(null, null);
    }

    // بدون مالك: اسلك مسار legacy القديم. مع مالك: لا تقرأ مفتاح حساب آخر.
    if (!getActiveExecutionFilesStorageOwnerLite()) {
        for (const k of EXECUTION_FILES_STORAGE_KEYS_LEGACY) {
            try {
                const raw = SecureStoreService.getItemSync(k);
                const parsed = parseExecutionFilesRaw(raw);
                if (!parsed) continue;
                saveExecutionFilesRawImmediate(parsed);
                return cloneExecutionFiles(parsed);
            } catch {
                /* ignore */
            }
        }
    }

    return [];
}

/**
 * قراءة صف واحد بالمعرّف بدون نسخ كامل القائمة — مسار التبديل بين تبويبات
 * الإضبارة الموحّدة كان ينسخ كل الصفوف ليجد صفاً واحداً.
 */
export function findExecutionFileRawById(id: string): unknown | null {
    const targetId = String(id ?? '').trim();
    if (!targetId) return null;

    const primaryKey = resolveExecutionFilesStorageKey();
    const primary = SecureStoreService.getItemSync(primaryKey);
    let rows: unknown[] | null = null;
    if (primary && primary === executionFilesCacheRaw && executionFilesCacheParsed) {
        rows = executionFilesCacheParsed;
    } else {
        const parsedPrimary = parseExecutionFilesRaw(primary);
        if (parsedPrimary) {
            setExecutionFilesCache(primary, parsedPrimary);
            rows = executionFilesCacheParsed;
        }
    }
    if (!rows) {
        rows = loadExecutionFilesRaw();
        const legacyRow = rows.find(
            (row) => row && String((row as { id?: unknown }).id) === targetId,
        );
        return legacyRow ?? null;
    }

    const row = rows.find((r) => r && String((r as { id?: unknown }).id) === targetId);
    if (!row) return null;
    return typeof row === 'object' && !Array.isArray(row)
        ? { ...(row as Record<string, unknown>) }
        : row;
}

export function saveExecutionFilesRaw(next: unknown[]): void {
    saveExecutionFilesRawImmediate(next);
}

export function mergeExecutionFilesById(primary: unknown[], incoming: unknown[]): unknown[] {
    const out: unknown[] = [];
    const seen = new Set<string>();
    const add = (v: unknown) => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return;
        const id = String((v as { id?: unknown }).id ?? '').trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(v);
    };
    primary.forEach(add);
    incoming.forEach(add);
    return out;
}

/** حفظ فوري متزامن — للاختبارات والترحيل */
export function saveExecutionFilesRawImmediate(next: unknown[]): void {
    const rows = Array.isArray(next) ? next : [];
    const serialized = JSON.stringify(rows);
    const primaryKey = resolveExecutionFilesStorageKey();
    writeExecutionFilesSerializedToKey(primaryKey, serialized);
    // عند غياب المالك فقط نكتب للمفاتيح legacy (توافق الاختبارات القديمة)
    if (!getActiveExecutionFilesStorageOwnerLite()) {
        EXECUTION_FILES_STORAGE_KEYS_LEGACY.forEach((legacyKey) => {
            writeExecutionFilesSerializedToKey(legacyKey, serialized);
        });
    }
    setExecutionFilesCache(serialized, rows);
}

/**
 * حفظ متزامن + تأكيد IndexedDB — يمنع فقدان الفهرس عند إعادة التحميل السريعة
 * قبل اكتمال الكتابة غير المتزامنة من setItemSync.
 */
export async function saveExecutionFilesRawDurable(next: unknown[]): Promise<void> {
    saveExecutionFilesRawImmediate(next);
    const rows = Array.isArray(next) ? next : [];
    const serialized = JSON.stringify(rows);
    const primaryKey = resolveExecutionFilesStorageKey();
    try {
        await SecureStoreService.setItem(primaryKey, serialized);
    } catch {
        /* الذاكرة + المسار المتزامن كافيان كاحتياط */
    }
}
