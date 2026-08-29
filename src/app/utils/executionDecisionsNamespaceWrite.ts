/**
 * Decisions namespace — write / prune / seed / flush.
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    executionDecisionsStorageKey,
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';
import {
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
} from '@/app/utils/executionDeviceStorageScope';
import { collectDecisionsStorageCandidateIds } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import {
    DECISIONS_NAMESPACE_INDEX_VERSION,
    executionDecisionsLegacyArchiveKey,
    executionDecisionsNamespaceIndexKey,
    executionDecisionsNamespaceStorageKey,
    readDecisionsNamespaceIndex,
    writeDecisionsNamespaceIndex,
} from './executionDecisionsNamespaceKeys';
import {
    deleteDecisionsStoreRaw,
    readDecisionsStoreRaw,
    writeDecisionsStoreRaw,
} from './executionDecisionsNamespaceStore';
import { ensureDecisionsNamespaceMigrated } from './executionDecisionsNamespaceMigrate';
import {
    resolveActiveDecisionsNamespaceSlug,
    resolveDecisionRowNamespaceSlug,
    stampDecisionRowsWithNamespace,
} from './executionDecisionsNamespaceResolve';
import { listDecisionsNamespaceStorageKeys, mergeDecisionRowsById } from './executionDecisionsNamespaceMerge';
import {
    readExecutorDecisionsUnionAcrossCandidateIds,
    readExecutorDecisionsUnionForExecution,
} from './executionDecisionsNamespaceRead';

/**
 * يوحّد كل صفوف المرشحين تحت المعرّف الأب ويزيل سلال التخزين الفرعية المكررة.
 * يُستدعى بعد كل حفظ ناجح لمنع المفاتيح اليتيمة.
 */
export function pruneRedundantDecisionsStorageAliases(
    canonicalId: string | undefined,
    executionData?: Record<string, unknown> | null,
): { prunedDossierIds: string[] } {
    const canonical = normalizeExecutionStorageId(canonicalId);
    if (!canonical || canonical === 'default') {
        return { prunedDossierIds: [] };
    }

    const union = readExecutorDecisionsUnionAcrossCandidateIds(canonical, executionData);
    const unionIds = new Set(
        union.map((r) => String(r.id ?? '').trim()).filter(Boolean)
    );
    if (unionIds.size === 0) {
        return { prunedDossierIds: [] };
    }

    writeExecutorDecisionsUnionForExecution(canonical, union, executionData);

    const candidates = collectDecisionsStorageCandidateIds(canonical, executionData);
    const prunedDossierIds: string[] = [];

    for (const cid of candidates) {
        if (cid === canonical) continue;
        const childRows = readExecutorDecisionsUnionForExecution(cid, executionData);
        if (childRows.length === 0) continue;
        const childIds = childRows
            .map((r) => String(r.id ?? '').trim())
            .filter(Boolean);
        if (childIds.length === 0) continue;
        const subset = childIds.every((id) => unionIds.has(id));
        if (!subset) continue;

        try {
            deleteDecisionsStoreRaw(executionDecisionsNamespaceIndexKey(cid));
            deleteDecisionsStoreRaw(executionDecisionsLegacyArchiveKey(cid));
            deleteDecisionsStoreRaw(executionDecisionsStorageKey(cid));
            const keys = SecureStoreService.listKeysSync();
            for (const k of keys) {
                const key = String(k || '').trim();
                const logical = stripExecutionDeviceStorageUserScope(key);
                if (logical.startsWith(`${executionStorageKey(cid)}_decisions_ns_`)) {
                    SecureStoreService.deleteItemSync(key);
                    if (logical !== key) SecureStoreService.deleteItemSync(logical);
                }
            }
            prunedDossierIds.push(cid);
        } catch {
            /* ignore */
        }
    }

    return { prunedDossierIds };
}

export type ExecutorDecisionsPersistOptions = {
    /** معرّفات إضافية لقراءة الاتحاد المخزّن قبل الدمج */
    extraIds?: string[];
    /** معرّفات صفوف حُذفت عمداً من اللقطة الواردة */
    removedIds?: string[];
};

/**
 * يدمج صفوفاً واردة من واجهة القرارات مع الاتحاد المخزّن — يمنع فقدان طلبات المحضر
 * عند حفظ بحالة React ناقصة (مثلاً إضافة قرار قبل اكتمال التحميل).
 */
export function mergeExecutorDecisionsUnionForPersist(
    executionId: string | undefined,
    incoming: Record<string, unknown>[],
    executionData?: Record<string, unknown> | null,
    opts?: Pick<ExecutorDecisionsPersistOptions, 'removedIds' | 'extraIds'>,
): Record<string, unknown>[] {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return incoming;

    const stored = readExecutorDecisionsUnionAcrossCandidateIds(id, executionData, opts?.extraIds);
    const byId = new Map<string, Record<string, unknown>>();
    mergeDecisionRowsById(byId, stored);

    for (const rid of opts?.removedIds ?? []) {
        const t = String(rid ?? '').trim();
        if (t) byId.delete(t);
    }

    mergeDecisionRowsById(byId, incoming);

    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
        const ad = String(a.resolvedAt ?? a.date ?? '');
        const bd = String(b.resolvedAt ?? b.date ?? '');
        return bd.localeCompare(ad, undefined, { numeric: true });
    });
    return merged;
}

/**
 * يكتب كل صف في سلته حسب domainNamespace / requestKind — يمنع فقدان البيانات عند حفظ مركز القرارات.
 */
export function writeExecutorDecisionsUnionForExecution(
    executionId: string | undefined,
    arr: Record<string, unknown>[],
    executionData?: Record<string, unknown> | null,
): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;

    ensureDecisionsNamespaceMigrated(id, executionData);
    const data = executionData ?? readExecutionDataForDomainGate(id);
    const activeSlug = resolveActiveDecisionsNamespaceSlug(id, data);

    const bySlug = new Map<string, Record<string, unknown>[]>();
    for (const row of arr) {
        const slug = resolveDecisionRowNamespaceSlug(row, data, id);
        const stamped =
            String((row as { domainNamespace?: string }).domainNamespace || '').trim() === slug
                ? row
                : { ...row, domainNamespace: slug };
        const list = bySlug.get(slug) ?? [];
        list.push(stamped);
        bySlug.set(slug, list);
    }

    const slugsToWrite = new Set(bySlug.keys());
    slugsToWrite.add(activeSlug);
    for (const key of listDecisionsNamespaceStorageKeys(id)) {
        const slug = key.replace(`${executionStorageKey(id)}_decisions_ns_`, '');
        if (slug) slugsToWrite.add(slug);
    }

    for (const slug of slugsToWrite) {
        const incoming = bySlug.get(slug);
        const key = executionDecisionsNamespaceStorageKey(id, slug);
        /** لا نكتب [] فوق سلّة فيها بيانات عند غياب صفوف واردة لهذا الـ namespace */
        if (incoming === undefined) {
            continue;
        }
        /** استبدال محتوى السلّة بصفوف الاتحاد الوارد — لا دمج بالمعرّف يُبقي نسخ طعن محذوفة */
        const merged = stampDecisionRowsWithNamespace(incoming, slug);
        try {
            writeDecisionsStoreRaw(key, JSON.stringify(merged));
        } catch {
            /* ignore */
        }
    }

    try {
        writeDecisionsStoreRaw(executionDecisionsStorageKey(id), JSON.stringify([]));
    } catch {
        /* ignore */
    }

    const index = readDecisionsNamespaceIndex(id);
    if (!index || index.active !== activeSlug) {
        writeDecisionsNamespaceIndex(id, {
            v: DECISIONS_NAMESPACE_INDEX_VERSION,
            active: activeSlug,
            legacyMigrated: index?.legacyMigrated ?? true,
            migratedAt: index?.migratedAt ?? new Date().toISOString(),
        });
    }
}

export function writeExecutorDecisionsArray(
    executionId: string | undefined,
    arr: Record<string, unknown>[],
    executionData?: Record<string, unknown> | null,
): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;

    ensureDecisionsNamespaceMigrated(id, executionData);
    const data = executionData ?? readExecutionDataForDomainGate(id);
    const activeSlug = resolveActiveDecisionsNamespaceSlug(id, data);
    const stampedIncoming = stampDecisionRowsWithNamespace(arr, activeSlug);

    const union = readExecutorDecisionsUnionForExecution(id, data);
    const withoutActiveBucket = union.filter(
        (row) => resolveDecisionRowNamespaceSlug(row, data, id) !== activeSlug
    );
    const next = [...withoutActiveBucket, ...stampedIncoming];
    writeExecutorDecisionsUnionForExecution(id, next, data);
}

/** تهيئة namespace فارغ لإضبارة جديدة */
export function seedFreshDecisionsNamespace(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    const slug = resolveActiveDecisionsNamespaceSlug(id, executionData);
    writeDecisionsStoreRaw(executionDecisionsNamespaceStorageKey(id, slug), JSON.stringify([]));
    writeDecisionsNamespaceIndex(id, {
        v: DECISIONS_NAMESPACE_INDEX_VERSION,
        active: slug,
        legacyMigrated: true,
        migratedAt: new Date().toISOString(),
    });
    try {
        writeDecisionsStoreRaw(executionDecisionsStorageKey(id), JSON.stringify([]));
    } catch {
        /* ignore */
    }
}

export function clearDecisionsNamespaceForTests(executionId: string | undefined): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    try {
        deleteDecisionsStoreRaw(executionDecisionsNamespaceIndexKey(id));
        deleteDecisionsStoreRaw(executionDecisionsLegacyArchiveKey(id));
        deleteDecisionsStoreRaw(executionDecisionsStorageKey(id));
        const keys = SecureStoreService.listKeysSync();
        for (const k of keys) {
            const key = String(k || '').trim();
            const logical = stripExecutionDeviceStorageUserScope(key);
            if (logical.startsWith(`${executionStorageKey(id)}_decisions_ns_`)) {
                SecureStoreService.deleteItemSync(key);
                if (logical !== key) SecureStoreService.deleteItemSync(logical);
            }
        }
    } catch {
        /* ignore */
    }
}

function collectExecutorDecisionPersistKeys(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): string[] {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return [];
    ensureDecisionsNamespaceMigrated(id, executionData);
    const keys = new Set<string>();
    keys.add(executionDecisionsNamespaceIndexKey(id));
    keys.add(executionDecisionsLegacyArchiveKey(id));
    keys.add(executionDecisionsStorageKey(id));
    for (const key of listDecisionsNamespaceStorageKeys(id)) {
        keys.add(key);
    }
    const activeSlug = resolveActiveDecisionsNamespaceSlug(id, executionData);
    keys.add(executionDecisionsNamespaceStorageKey(id, activeSlug));
    return [...keys];
}

/** يدفئ قرارات التنفيذ من IndexedDB إلى الكاش المتزامن قبل القراءة */
export async function warmExecutorDecisionsStorage(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): Promise<void> {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    try {
        await SecureStoreService.ensurePersistedReady();
    } catch {
        /* ignore */
    }
    ensureDecisionsNamespaceMigrated(id, executionData);
    for (const logicalKey of collectExecutorDecisionPersistKeys(id, executionData)) {
        const base = stripExecutionDeviceStorageUserScope(logicalKey);
        const scoped = scopeExecutionDeviceStorageKey(base);
        try {
            await SecureStoreService.getItem(scoped);
            if (scoped !== base) await SecureStoreService.getItem(base);
        } catch {
            /* ignore per-key */
        }
    }
}

/** يفرض كتابة فورية لمفاتيح قرارات التنفيذ (بدون انتظار) */
export function flushExecutorDecisionsStorageImmediate(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    try {
        SecureStoreService.flushHeavyPersistPending();
    } catch {
        /* ignore */
    }
    for (const logicalKey of collectExecutorDecisionPersistKeys(id, executionData)) {
        const raw = readDecisionsStoreRaw(logicalKey);
        if (raw == null) continue;
        writeDecisionsStoreRaw(logicalKey, raw);
    }
}

/** ينتظر اكتمال كتابة قرارات التنفيذ إلى IndexedDB */
export async function flushExecutorDecisionsStorageAwait(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): Promise<void> {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    flushExecutorDecisionsStorageImmediate(id, executionData);
    const writes: Promise<void>[] = [];
    for (const logicalKey of collectExecutorDecisionPersistKeys(id, executionData)) {
        const raw = readDecisionsStoreRaw(logicalKey);
        if (raw == null) continue;
        const base = stripExecutionDeviceStorageUserScope(logicalKey);
        const writeKey = scopeExecutionDeviceStorageKey(base);
        writes.push(
            SecureStoreService.setItem(writeKey, raw).then(() => undefined).catch(() => undefined),
        );
    }
    await Promise.all(writes);
}
