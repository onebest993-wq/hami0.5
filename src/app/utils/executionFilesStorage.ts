import SecureStoreService from '@/app/services/SecureStoreService';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierPersistenceService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
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
/** حجر صحي للفهرس العام — لا يُسند تلقائياً لأول حساب يسجّل دخولاً */
const LEGACY_INDEX_QUARANTINE_OWNER = '__quarantined__';
const LEGACY_INDEX_QUARANTINE_KEY = `${EXECUTION_FILES_STORAGE_KEY}:${LEGACY_INDEX_QUARANTINE_OWNER}`;

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

/** يُبطِل كاش الفهرس — مطلوب بعد زرع متباعد في E2E/تشخيص */
export function invalidateExecutionFilesRawCache(): void {
    clearExecutionFilesCache();
}

/** مفتاح التخزين الأساسي للمالك الحالي (أو العام عند غياب المالك — اختبارات/إقلاع مبكر) */
export function resolveExecutionFilesStorageKey(userId?: string | null): string {
    return resolveExecutionFilesStorageKeyLite(userId);
}

function writeExecutionFilesSerializedToKey(key: string, serialized: string): void {
    const existing = readSecureOrDrainLegacySync(key);
    if (existing && shouldRejectDossierWipe(key, serialized, existing)) return;
    writeSecureAndClearLegacySync(key, serialized);
}

/** تفريغ قسري بعد ترحيل ناجح — wipe-guard يرفض كتابة [] فوق بيانات غير فارغة */
function forceClearExecutionFilesKey(key: string): void {
    try {
        SecureStoreService.deleteItemSync(key);
    } catch {
        /* ignore */
    }
    clearLegacyPlaintextMirror(key);
}

function clearLegacyExecutionIndexKeys(): void {
    forceClearExecutionFilesKey(EXECUTION_FILES_STORAGE_KEY);
    EXECUTION_FILES_STORAGE_KEYS_LEGACY.forEach((legacyKey) => {
        forceClearExecutionFilesKey(legacyKey);
    });
}

function readLegacyRows(): unknown[] | null {
    const primary = readSecureOrDrainLegacySync(EXECUTION_FILES_STORAGE_KEY);
    const parsedPrimary = parseExecutionFilesRaw(primary);
    if (parsedPrimary?.length) return parsedPrimary;

    for (const k of EXECUTION_FILES_STORAGE_KEYS_LEGACY) {
        try {
            const raw = readSecureOrDrainLegacySync(k);
            const parsed = parseExecutionFilesRaw(raw);
            if (parsed?.length) return parsed;
        } catch {
            /* ignore */
        }
    }
    return null;
}

/**
 * ترحيل آمن من المفتاح العام: يُحجَر في quarantine بدل إسناده تلقائياً لأول حساب.
 * الاستيراد الصريح عبر claimQuarantinedExecutionFilesIndex.
 */
function maybeMigrateLegacyIndexToOwner(ownerId: string): void {
    const claimed = readSecureOrDrainLegacySync(OWNER_MIGRATION_FLAG)?.trim();
    if (claimed === ownerId) return;
    // حساب آخر استورد الفهرس سابقاً — لا تُعاد الهجرة
    if (claimed && claimed !== LEGACY_INDEX_QUARANTINE_OWNER) return;

    const ownerKey = `${EXECUTION_FILES_STORAGE_KEY}:${ownerId}`;
    const existingOwner = parseExecutionFilesRaw(readSecureOrDrainLegacySync(ownerKey));
    if (existingOwner && existingOwner.length > 0) {
        writeSecureAndClearLegacySync(OWNER_MIGRATION_FLAG, ownerId);
        return;
    }

    // محجور مسبقاً — انتظار استيراد صريح
    if (claimed === LEGACY_INDEX_QUARANTINE_OWNER) return;

    const legacy = readLegacyRows();
    if (legacy && legacy.length > 0) {
        const serialized = JSON.stringify(legacy);
        writeExecutionFilesSerializedToKey(LEGACY_INDEX_QUARANTINE_KEY, serialized);
        clearLegacyExecutionIndexKeys();
        writeSecureAndClearLegacySync(OWNER_MIGRATION_FLAG, LEGACY_INDEX_QUARANTINE_OWNER);
        return;
    }

    writeSecureAndClearLegacySync(OWNER_MIGRATION_FLAG, ownerId);
}

/** هل يوجد فهرس تنفيذ محجور بانتظار استيراد صريح؟ */
export function hasQuarantinedExecutionFilesIndex(): boolean {
    const claimed = readSecureOrDrainLegacySync(OWNER_MIGRATION_FLAG)?.trim();
    if (claimed === LEGACY_INDEX_QUARANTINE_OWNER) {
        const rows = parseExecutionFilesRaw(readSecureOrDrainLegacySync(LEGACY_INDEX_QUARANTINE_KEY));
        return Boolean(rows && rows.length > 0);
    }
    // ترحيل/استيراد لمالك حقيقي اكتمل — بقايا المفتاح العام ليست حجراً
    if (claimed) return false;
    const legacy = readLegacyRows();
    return Boolean(legacy && legacy.length > 0);
}

/**
 * استيراد صريح للفهرس المحجور إلى مالك الجلسة الحالية.
 * لا يُستدعى تلقائياً عند bind.
 */
export function claimQuarantinedExecutionFilesIndex(userId?: string | null): boolean {
    const ownerId =
        normalizeExecutionFilesStorageOwnerId(userId) ||
        getActiveExecutionFilesStorageOwnerLite();
    if (!ownerId) return false;

    const claimed = readSecureOrDrainLegacySync(OWNER_MIGRATION_FLAG)?.trim();
    if (claimed && claimed !== LEGACY_INDEX_QUARANTINE_OWNER && claimed !== ownerId) {
        return false;
    }

    const quarantined = parseExecutionFilesRaw(readSecureOrDrainLegacySync(LEGACY_INDEX_QUARANTINE_KEY));
    let rows: unknown[] | null = quarantined;
    // بعد اكتمال الترحيل لمالك: لا تُسحب بقايا المفتاح العام مرة أخرى كـ«استيراد»
    if (claimed === ownerId) {
        if (!rows || rows.length === 0) return false;
    } else {
        rows = rows?.length ? rows : readLegacyRows();
    }
    if (!rows || rows.length === 0) return false;

    const ownerKey = `${EXECUTION_FILES_STORAGE_KEY}:${ownerId}`;
    const existingOwner = parseExecutionFilesRaw(readSecureOrDrainLegacySync(ownerKey)) || [];
    const merged = mergeExecutionFilesById(existingOwner, rows);
    const serialized = JSON.stringify(merged);
    writeExecutionFilesSerializedToKey(ownerKey, serialized);
    forceClearExecutionFilesKey(LEGACY_INDEX_QUARANTINE_KEY);
    clearLegacyExecutionIndexKeys();
    writeSecureAndClearLegacySync(OWNER_MIGRATION_FLAG, ownerId);
    clearExecutionFilesCache();
    return true;
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
        // جهاز بحساب واحد: لا تترك الحجر معلّقاً بعد bind (E2E/إقلاع بدون hydrate منفصل)
        if (hasQuarantinedExecutionFilesIndex() && !deviceHasOtherOwnedExecutionIndexes(ownerId)) {
            claimQuarantinedExecutionFilesIndex(ownerId);
        }
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
        LEGACY_INDEX_QUARANTINE_KEY,
    ];
    if (owner) {
        warmKeys.push(`${EXECUTION_FILES_STORAGE_KEY}:${owner}`);
    }
    await Promise.all(warmKeys.map((k) => SecureStoreService.getItem(k)));

    clearExecutionFilesCache();
    const key = bindExecutionFilesStorageOwner(userId);
    // جهاز بحساب واحد: اسمح باستيراد الحجر تلقائياً. أجهزة متعددة الحسابات تبقى محجورة.
    if (owner && hasQuarantinedExecutionFilesIndex() && !deviceHasOtherOwnedExecutionIndexes(owner)) {
        claimQuarantinedExecutionFilesIndex(owner);
    }
    await SecureStoreService.getItem(key);
    clearExecutionFilesCache();
    const rows = loadExecutionFilesRaw();
    return { key, rows };
}

function deviceHasOtherOwnedExecutionIndexes(exceptOwnerId: string): boolean {
    const prefix = `${EXECUTION_FILES_STORAGE_KEY}:`;
    try {
        for (const key of SecureStoreService.listKeysSync()) {
            if (!key.startsWith(prefix)) continue;
            if (key === LEGACY_INDEX_QUARANTINE_KEY) continue;
            if (key === `${prefix}${exceptOwnerId}`) continue;
            const rows = parseExecutionFilesRaw(readSecureOrDrainLegacySync(key));
            if (rows && rows.length > 0) return true;
        }
    } catch {
        /* ignore */
    }
    return false;
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
    const primary = readSecureOrDrainLegacySync(primaryKey);
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
                const raw = readSecureOrDrainLegacySync(k);
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
    const primary = readSecureOrDrainLegacySync(primaryKey);
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
