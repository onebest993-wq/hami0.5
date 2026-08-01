import SecureStoreService from '@/app/services/SecureStoreService';
import { debug } from '@/app/utils/debug';
import {
    loadExecutionFilesRaw,
    saveExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';
import { isExecutionDossierTombstoned } from '@/app/utils/executionDossierTombstones';
import { readScopedDeviceStorageItem, scopeExecutionDeviceStorageKey, stripExecutionDeviceStorageUserScope, isStorageKeyVisibleToCurrentUser } from '@/app/utils/executionDeviceStorageScope';
import {
    executionDossierIdFromStorageKey,
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeys';

const EXECUTION_BLOB_SATELLITE_MARKERS = [
    '_decisions_ns_',
    '_decisions',
    '_documents',
    '_document_folders',
    '_eviction_field_visit',
] as const;

type CacheTouchFn = (key: string, value: unknown) => void;

var executionBlobCacheTouch: CacheTouchFn | null = null;

/** يُسجَّل من storageCache لتجنّب الاستيراد الدائري */
export function registerExecutionBlobCacheTouch(fn: CacheTouchFn): void {
    executionBlobCacheTouch = fn;
}

function touchExecutionBlobCache(key: string, value: unknown, touch?: CacheTouchFn): void {
    if (touch) {
        touch(key, value);
        return;
    }
    executionBlobCacheTouch?.(key, value);
}


/** مفتاح الإضبارة الرئيسي execution_{id} — ليس executionFiles ولا مفاتيح قرارات/وثائق */
export function isExecutionDossierMainBlobKey(key: string): boolean {
    const k = stripExecutionDeviceStorageUserScope(String(key || '').trim());
    if (!k.startsWith('execution_')) return false;
    if (k === 'executionFiles' || k === 'execution_expenses') return false;
    if (k.startsWith('execution_form_')) return false;
    return !EXECUTION_BLOB_SATELLITE_MARKERS.some((m) => k.includes(m));
}

export function isExecutionSubDossierBlobKey(key: string): boolean {
    const logical = stripExecutionDeviceStorageUserScope(String(key || '').trim());
    return isExecutionDossierMainBlobKey(logical) && logical.includes('__sub__');
}

export function isExecutionParentDossierBlobKey(key: string): boolean {
    const logical = stripExecutionDeviceStorageUserScope(String(key || '').trim());
    return isExecutionDossierMainBlobKey(logical) && !logical.includes('__sub__');
}

function parseDossierBlob(raw: string | null | undefined): Record<string, unknown> | null {
    if (!raw?.trim()) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

function countMeaningfulDossierFields(blob: Record<string, unknown>): number {
    let score = 0;
    for (const [key, value] of Object.entries(blob)) {
        if (key === 'id' || key === 'updatedAt') continue;
        if (value == null) continue;
        if (Array.isArray(value)) {
            if (value.length > 0) score += 1;
            continue;
        }
        if (typeof value === 'object') {
            if (Object.keys(value as object).length > 0) score += 1;
            continue;
        }
        if (String(value).trim() !== '') score += 1;
    }
    return score;
}

/** يمنع استبدال إضبارة غنية ببيانات شبه فارغة */
export function shouldRejectExecutionDossierBlobWipe(
    storageKey: string,
    incomingRaw: string,
    existingRaw: string | null | undefined,
): boolean {
    if (!isExecutionDossierMainBlobKey(storageKey)) return false;
    if (!existingRaw?.trim()) return false;

    const trimmed = incomingRaw.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === '{}') return true;

    const existing = parseDossierBlob(existingRaw);
    const incoming = parseDossierBlob(incomingRaw);
    if (!existing || !incoming) return false;

    const existingScore = countMeaningfulDossierFields(existing);
    const incomingScore = countMeaningfulDossierFields(incoming);
    if (existingScore >= 3 && incomingScore === 0) return true;

    const existingTimeline = Array.isArray(existing.timelineEvents) ? existing.timelineEvents.length : 0;
    const incomingTimeline = Array.isArray(incoming.timelineEvents) ? incoming.timelineEvents.length : 0;
    if (existingTimeline > 0 && incomingTimeline === 0 && !Array.isArray(incoming.timelineEvents)) {
        return true;
    }

    return false;
}

function mergeExecutionFileIndexRow(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...existing, ...incoming };
    if (
        existing.executionTrashDeletedAt != null &&
        !Object.prototype.hasOwnProperty.call(incoming, 'executionTrashDeletedAt')
    ) {
        merged.executionTrashDeletedAt = existing.executionTrashDeletedAt;
    }
    if (
        existing.executionArchivedAt != null &&
        !Object.prototype.hasOwnProperty.call(incoming, 'executionArchivedAt')
    ) {
        merged.executionArchivedAt = existing.executionArchivedAt;
    }
    if (
        existing.debtor_absence_badge_dismissed === true &&
        !Object.prototype.hasOwnProperty.call(incoming, 'debtor_absence_badge_dismissed')
    ) {
        merged.debtor_absence_badge_dismissed = existing.debtor_absence_badge_dismissed;
    }
    if (
        existing.debtor_absence_badge_dismissed_by_debtor != null &&
        !Object.prototype.hasOwnProperty.call(incoming, 'debtor_absence_badge_dismissed_by_debtor')
    ) {
        merged.debtor_absence_badge_dismissed_by_debtor =
            existing.debtor_absence_badge_dismissed_by_debtor;
    }
    return merged;
}

/** يزامن صف الإضبارة في executionFiles مع الحمولة الحية */
export function syncExecutionFileInIndex(updatedFile: Record<string, unknown>): boolean {
    const id = normalizeExecutionStorageId(String(updatedFile.id ?? ''));
    if (!id || id === 'default') return false;
    if (isExecutionDossierTombstoned(id)) return false;

    const files = loadExecutionFilesRaw();
    const rows = Array.isArray(files) ? [...files] : [];
    const idx = rows.findIndex(
        (row) =>
            row &&
            typeof row === 'object' &&
            String((row as { id?: unknown }).id ?? '').trim() === id,
    );

    if (idx >= 0) {
        rows[idx] = mergeExecutionFileIndexRow(
            rows[idx] as Record<string, unknown>,
            { ...updatedFile, id, updatedAt: updatedFile.updatedAt ?? new Date().toISOString() },
        );
    } else {
        rows.push({
            ...updatedFile,
            id,
            updatedAt: updatedFile.updatedAt ?? new Date().toISOString(),
        });
    }

    saveExecutionFilesRaw(rows);
    return true;
}

function readLocalStorageRaw(storageKey: string): string | null {
    try {
        if (typeof globalThis.localStorage === 'undefined') return null;
        return globalThis.localStorage.getItem(storageKey);
    } catch {
        return null;
    }
}

function readExistingBlobRaw(key: string): string | null {
    try {
        if (isExecutionDossierMainBlobKey(key)) {
            const logical = stripExecutionDeviceStorageUserScope(key);
            const fromSecure = readScopedDeviceStorageItem(
                (k) => SecureStoreService.getItemSync(k),
                logical,
            );
            if (fromSecure != null && fromSecure !== '') return fromSecure;
            // e2e / زرع مباشر في LS قبل اكتمال مرآة SecureStore
            return readScopedDeviceStorageItem(readLocalStorageRaw, logical);
        }
        return SecureStoreService.getItemSync(key) ?? readLocalStorageRaw(key);
    } catch {
        return null;
    }
}

function writeExecutionBlobRaw(
    key: string,
    data: Record<string, unknown>,
    touch?: CacheTouchFn,
): boolean {
    const incomingRaw = JSON.stringify(data);
    const existingRaw = readExistingBlobRaw(key);
    if (shouldRejectExecutionDossierBlobWipe(key, incomingRaw, existingRaw)) {
        debug.warn(`[ExecutionPersist] رفض مسح مفتاح "${key}" — البيانات الحالية محفوظة.`);
        return false;
    }
    const logicalKey = isExecutionDossierMainBlobKey(key)
        ? stripExecutionDeviceStorageUserScope(key)
        : key;
    const writeKey = isExecutionDossierMainBlobKey(key)
        ? scopeExecutionDeviceStorageKey(logicalKey)
        : key;
    try {
        SecureStoreService.setItemSync(writeKey, incomingRaw);
        // ترحيل: إن كُتب المقيّد وما زال القديم موجوداً — أبقِ التوافق عبر القراءة المزدوجة فقط
    } catch (error) {
        // كان هذا الفرع صامتاً تماماً بينما فرع رفض المسح أعلاه يُحذّر: فقدان
        // كتابة حقيقي لا يُترك بلا أثر، وإلا ظهرت الواجهة محفوظة والقرص خالياً.
        debug.warn(`[ExecutionPersist] فشلت كتابة مفتاح "${writeKey}":`, error);
        return false;
    }
    touchExecutionBlobCache(writeKey, data, touch);
    if (writeKey !== logicalKey) {
        touchExecutionBlobCache(logicalKey, data, touch);
    }
    return true;
}

/**
 * نتيجة كتابة البلوب — «تولّيتُ المفتاح» شيء و«نجحت الكتابة» شيء آخر.
 *
 * كان الاثنان مضغوطين في `boolean` واحد، فبدا أن الدالة تُعيد `true` عند الفشل.
 * وهي في الحقيقة تُعلن التوجيه لا النجاح: لو أعادت `false` لسقطت الكتابة إلى
 * المسار العام في `storageCache.set` بمفتاح غير مقيَّد بالمالك — أسوأ من الفشل.
 * الخلل الحقيقي كان أن الفشل لا يُبلَّغ عنه أبداً، وهذا ما تُصلحه النتيجة.
 */
export type ExecutionBlobSetOutcome = 'not-execution-key' | 'persisted' | 'rejected-wipe' | 'invalid-payload';

export function applyExecutionDossierBlobSetWithOutcome(
    key: string,
    value: unknown,
    touch?: CacheTouchFn,
): ExecutionBlobSetOutcome {
    if (!isExecutionDossierMainBlobKey(key)) return 'not-execution-key';
    const data =
        value && typeof value === 'object' && !Array.isArray(value)
            ? ({ ...(value as Record<string, unknown>) } as Record<string, unknown>)
            : null;
    if (!data) return 'invalid-payload';

    if (!writeExecutionBlobRaw(key, data, touch)) return 'rejected-wipe';

    if (isExecutionParentDossierBlobKey(key)) {
        const id = executionDossierIdFromStorageKey(key);
        syncExecutionFileInIndex({ ...data, id });
    }
    return 'persisted';
}

/**
 * نقطة اعتراض storageCache.set — كل كتابة execution_{id} تمرّ من هنا.
 * @returns هل تولّى هذا المسار المفتاح (لا: هل نجحت الكتابة)
 */
export function applyExecutionDossierBlobSet(
    key: string,
    value: unknown,
    touch?: CacheTouchFn,
): boolean {
    const outcome = applyExecutionDossierBlobSetWithOutcome(key, value, touch);
    return outcome !== 'not-execution-key' && outcome !== 'invalid-payload';
}

/** @deprecated استخدم applyExecutionDossierBlobSet عبر storageCache.set */
export function routeExecutionBlobCacheSet(key: string, value: unknown): boolean {
    return applyExecutionDossierBlobSet(key, value);
}

export type PersistExecutionDossierBlobOptions = {
    /** افتراضي: true — يحدّث executionFiles مع الحمولة */
    syncIndex?: boolean;
};

/**
 * حفظ موحّد لإضبارة التنفيذ الأم: blob + فهرس executionFiles.
 */
export function persistExecutionDossierBlob(
    dossierId: string | undefined,
    data: Record<string, unknown>,
    options?: PersistExecutionDossierBlobOptions,
): boolean {
    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default') return false;

    const key = executionStorageKey(id);
    const stamped = { ...data, id, updatedAt: data.updatedAt ?? new Date().toISOString() };
    if (!writeExecutionBlobRaw(key, stamped)) return false;
    if (options?.syncIndex !== false) {
        syncExecutionFileInIndex(stamped);
    }
    return true;
}

/** دمج جزئي في blob + فهرس — لمسارات خارج لوحة التنفيذ المفتوحة */
export function patchExecutionDossierRecord(
    dossierId: string | undefined,
    patch: Record<string, unknown>,
): boolean {
    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default' || Object.keys(patch).length === 0) return false;

    const existing = readExecutionDossierBlob(id) ?? { id };
    const merged = {
        ...existing,
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
    };
    return applyExecutionDossierBlobSet(executionStorageKey(id), merged);
}

export function readExecutionDossierBlob(
    dossierId: string | undefined,
): Record<string, unknown> | null {
    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default') return null;
    return parseDossierBlob(readExistingBlobRaw(executionStorageKey(id)));
}

/**
 * يُسخّن بلوب الإضبارة في ذاكرة فك التشفير قبل القراءة المتزامنة.
 *
 * بعد إضافة `execution_` لبوادئ التشفير، `getItemSync` يعيد `null` للقيم
 * المشفّرة على القرص ما لم تُحمَّل أولاً عبر `getItem` غير المتزامن. بدون
 * هذا التسخين تفتح الإضبارة فارغة بعد إعادة التحميل رغم وجود البيانات.
 *
 * يُعيد الكتابة أيضاً لترحيل النص الصريح القديم إلى تشفير عند الراحة.
 */
export async function ensureExecutionDossierBlobReady(dossierId: string | undefined): Promise<void> {
    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default') return;

    const candidates = [
        scopeExecutionDeviceStorageKey(executionStorageKey(id)),
        executionStorageKey(id),
    ];
    const seen = new Set<string>();

    for (const key of candidates) {
        if (!key || seen.has(key)) continue;
        seen.add(key);
        try {
            const value = await SecureStoreService.getItem(key);
            if (value) {
                await SecureStoreService.setItem(key, value);
            }
        } catch {
            /* ignore per-key warm/migrate failures */
        }
    }
}

/**
 * قراءة إضبارة للمصالحة: جلسة الحالي أولاً ثم أي مفتاح :u: لنفس المعرّف
 * (يغطي زرع e2e / ترحيل / اختلاف نطاق المالك).
 */
export function readExecutionDossierBlobScanningScopes(
    dossierId: string | undefined,
): Record<string, unknown> | null {
    const primary = readExecutionDossierBlob(dossierId);
    if (primary) return primary;

    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default') return null;

    const tryKey = (rawKey: string, getItem: (k: string) => string | null): Record<string, unknown> | null => {
        const k = String(rawKey || '').trim();
        if (!k || !isExecutionParentDossierBlobKey(k)) return null;
        if (executionDossierIdFromStorageKey(k) !== id) return null;
        return parseDossierBlob(getItem(k));
    };

    try {
        for (const key of SecureStoreService.listKeysSync()) {
            if (!isStorageKeyVisibleToCurrentUser(key)) continue;
            const hit = tryKey(key, (k) => SecureStoreService.getItemSync(k));
            if (hit) return hit;
        }
    } catch {
        /* ignore */
    }

    try {
        if (typeof globalThis.localStorage !== 'undefined') {
            const ls = globalThis.localStorage;
            for (let i = 0; i < ls.length; i += 1) {
                const key = String(ls.key(i) || '');
                if (!isStorageKeyVisibleToCurrentUser(key)) continue;
                const hit = tryKey(key, (k) => {
                    try {
                        return ls.getItem(k);
                    } catch {
                        return null;
                    }
                });
                if (hit) return hit;
            }
        }
    } catch {
        /* ignore */
    }

    return null;
}
