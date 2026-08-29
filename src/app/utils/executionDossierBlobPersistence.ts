import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import { debug } from '@/app/utils/debug';
import {
    loadExecutionFilesRaw,
    saveExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';
import { isExecutionDossierTombstoned } from '@/app/utils/executionDossierTombstones';
import { scopeExecutionDeviceStorageKey, stripExecutionDeviceStorageUserScope, isStorageKeyVisibleToCurrentUser } from '@/app/utils/executionDeviceStorageScope';
import { readScopedSecureOrDrainLegacySync } from '@/app/utils/readScopedSecureOrDrainLegacySync';
import {
    isExecutionDossierMainBlobKey as isExecutionDossierMainBlobKeyLite,
    parseDossierBlob,
    shouldRejectExecutionDossierBlobWipe as shouldRejectExecutionDossierBlobWipeLite,
} from '@/app/utils/executionDossierBlobKeyLite';
import {
    executionDossierIdFromStorageKey,
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';

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


/*
 * نسخة ثانية من الحارز كانت هنا حرفاً بحرف، تفترق عن الأصل بتجريد نطاق المستخدم
 * وحده. إصلاح أحدهما يترك الآخر مكشوفاً بلا إشارة — وهذا ما حدث فعلاً. الفرق
 * الوحيد يُستهلك هنا، والقرار يبقى في موضع واحد.
 */
function logicalBlobKey(key: string): string {
    return stripExecutionDeviceStorageUserScope(String(key || '').trim());
}

/** مفتاح الإضبارة الرئيسي execution_{id} — ليس executionFiles ولا مفاتيح قرارات/وثائق */
export function isExecutionDossierMainBlobKey(key: string): boolean {
    return isExecutionDossierMainBlobKeyLite(logicalBlobKey(key));
}

export function isExecutionSubDossierBlobKey(key: string): boolean {
    const logical = logicalBlobKey(key);
    return isExecutionDossierMainBlobKeyLite(logical) && logical.includes('__sub__');
}

export function isExecutionParentDossierBlobKey(key: string): boolean {
    const logical = logicalBlobKey(key);
    return isExecutionDossierMainBlobKeyLite(logical) && !logical.includes('__sub__');
}

/** يمنع استبدال إضبارة غنية ببيانات شبه فارغة */
export function shouldRejectExecutionDossierBlobWipe(
    storageKey: string,
    incomingRaw: string,
    existingRaw: string | null | undefined,
): boolean {
    return shouldRejectExecutionDossierBlobWipeLite(
        logicalBlobKey(storageKey),
        incomingRaw,
        existingRaw,
    );
}

function keepIndexListHint(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
    key: string,
): unknown {
    const next = incoming[key];
    if (Array.isArray(next) && next.length > 0) return next;
    if (next !== undefined && next !== null && String(next).trim() !== '') return next;
    const prev = existing[key];
    if (Array.isArray(prev) && prev.length > 0) return prev;
    if (prev !== undefined && prev !== null && String(prev).trim() !== '') return prev;
    return next !== undefined ? next : prev;
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
    const listHintKeys = [
        'claimType',
        'claimTypes',
        'docType',
        'classification',
        'category',
        'representedParty',
        'initiatorRole',
        'debtor_entity_kind',
        'debtor_entity_type',
        'total_remaining_balance',
        'remainingDebt',
    ] as const;
    for (const key of listHintKeys) {
        merged[key] = keepIndexListHint(existing, incoming, key);
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

function readExistingBlobRaw(key: string): string | null {
    try {
        if (isExecutionDossierMainBlobKey(key)) {
            const logical = stripExecutionDeviceStorageUserScope(key);
            return readScopedSecureOrDrainLegacySync(logical);
        }
        return readSecureOrDrainLegacySync(key);
    } catch {
        return null;
    }
}

function writeExecutionBlobRaw(
    key: string,
    data: Record<string, unknown>,
    touch?: CacheTouchFn,
): boolean {
    const logicalKey = isExecutionDossierMainBlobKey(key)
        ? stripExecutionDeviceStorageUserScope(key)
        : key;
    const dossierId = executionDossierIdFromStorageKey(logicalKey);
    if (dossierId && isExecutionDossierTombstoned(dossierId)) {
        debug.warn(`[ExecutionPersist] رفض إحياء بلوب لمقبرة "${logicalKey}".`);
        return false;
    }
    const incomingRaw = JSON.stringify(data);
    const existingRaw = readExistingBlobRaw(key);
    if (shouldRejectExecutionDossierBlobWipe(key, incomingRaw, existingRaw)) {
        debug.warn(`[ExecutionPersist] رفض مسح مفتاح "${key}" — البيانات الحالية محفوظة.`);
        return false;
    }
    const writeKey = isExecutionDossierMainBlobKey(key)
        ? scopeExecutionDeviceStorageKey(logicalKey)
        : key;
    try {
        if (SecureStoreService.setItemSync(writeKey, incomingRaw) === false) {
            debug.warn(`[ExecutionPersist] رُفضت كتابة مفتاح "${writeKey}" (setItemSync=false).`);
            return false;
        }
        clearLegacyPlaintextMirror(writeKey);
        // بعد كتابة مقيّدة ناجحة: احذف التوأم غير المقيّد حتى لا يقرأه حساب لاحق
        if (writeKey !== logicalKey) {
            try {
                SecureStoreService.deleteItemSync(logicalKey);
            } catch {
                /* ignore purge failures */
            }
            clearLegacyPlaintextMirror(logicalKey);
        }
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
    if (isExecutionDossierTombstoned(id)) return false;

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
    return applyExecutionDossierBlobSetWithOutcome(executionStorageKey(id), merged) === 'persisted';
}

export function readExecutionDossierBlob(
    dossierId: string | undefined,
): Record<string, unknown> | null {
    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default') return null;
    return parseDossierBlob(readExistingBlobRaw(executionStorageKey(id)));
}

/**
 * يُسخّن بلوب الإضبارة في الذاكرة قبل القراءة المتزامنة.
 * ترحيل `hami_enc_v2:` → plaintext مرة واحدة فقط عند وجود ciphertext على القرص
 * (لا إعادة كتابة IDB في كل فتح بعد اكتمال الترحيل).
 */
export async function ensureExecutionDossierBlobReady(dossierId: string | undefined): Promise<void> {
    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default') return;

    const candidates = [
        scopeExecutionDeviceStorageKey(executionStorageKey(id)),
        executionStorageKey(id),
    ];
    const seen = new Set<string>();
    const CIPHER_PREFIX = 'hami_enc_v2:';

    for (const key of candidates) {
        if (!key || seen.has(key)) continue;
        seen.add(key);
        try {
            const value = await SecureStoreService.getItem(key);
            if (!value) continue;
            const rawOnDisk = await SecureStoreService.peekRawFromDisk(key);
            if (rawOnDisk?.startsWith(CIPHER_PREFIX)) {
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
            const hit = tryKey(key, (k) => readSecureOrDrainLegacySync(k));
            if (hit) return hit;
        }
    } catch {
        /* ignore */
    }

    try {
        if (typeof globalThis.localStorage !== 'undefined') {
            const ls = globalThis.localStorage;
            const leftoverKeys: string[] = [];
            for (let i = 0; i < ls.length; i += 1) {
                leftoverKeys.push(String(ls.key(i) || ''));
            }
            for (const key of leftoverKeys) {
                if (!isStorageKeyVisibleToCurrentUser(key)) continue;
                const hit = tryKey(key, (k) => readSecureOrDrainLegacySync(k));
                if (hit) return hit;
            }
        }
    } catch {
        /* ignore */
    }

    return null;
}
