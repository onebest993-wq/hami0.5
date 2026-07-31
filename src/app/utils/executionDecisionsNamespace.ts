// @ts-nocheck
/**
 * Phase 5 — فصل تخزين القرارات حسب namespace المجال.
 * المفتاح: execution_{id}_decisions_ns_{module}__{perspective}
 * الترحيل من execution_{id}_decisions الموحّد يتم مرة واحدة.
 */

import SecureStoreService from '@/app/services/SecureStoreService';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    readExecutionDataForDomainGate,
    resolveExecutionDomainContext,
    type ExecutionClaimModule,
    type ExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import {
    executionDecisionsStorageKey,
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';
import {
    readScopedDeviceStorageItem,
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
} from '@/app/utils/executionDeviceStorageScope';
import { collectDecisionsStorageCandidateIds } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';

export const DECISIONS_NAMESPACE_INDEX_VERSION = 1;

export interface DecisionsNamespaceIndex {
    v: number;
    active: string;
    legacyMigrated: boolean;
    migratedAt?: string;
}

function parseStoredDecisionsArray(raw: string | null): Record<string, unknown>[] {
    if (!raw) return [];
    try {
        const v = JSON.parse(raw) as unknown;
        return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
    } catch {
        return [];
    }
}

/** قراءة قرارات: المفتاح المقيّد بالمالك أولاً ثم المنطقي */
function readDecisionsStoreRaw(logicalKey: string): string | null {
    return readScopedDeviceStorageItem(
        (k) => SecureStoreService.getItemSync(k),
        stripExecutionDeviceStorageUserScope(logicalKey),
    );
}

/** كتابة قرارات على المفتاح المقيّد عند وجود جلسة — يُزال التوأم غير المقيّد لتقليل تسرّب عبر الحسابات */
function writeDecisionsStoreRaw(logicalKey: string, value: string): void {
    const base = stripExecutionDeviceStorageUserScope(logicalKey);
    const writeKey = scopeExecutionDeviceStorageKey(base);
    SecureStoreService.setItemSync(writeKey, value);
    if (writeKey !== base) {
        try {
            SecureStoreService.deleteItemSync(base);
        } catch {
            /* best effort */
        }
    }
}

function deleteDecisionsStoreRaw(logicalKey: string): void {
    const base = stripExecutionDeviceStorageUserScope(logicalKey);
    const scoped = scopeExecutionDeviceStorageKey(base);
    SecureStoreService.deleteItemSync(scoped);
    if (scoped !== base) {
        SecureStoreService.deleteItemSync(base);
    }
}

export function sanitizeDecisionsNamespaceSlug(slug: string): string {
    const s = String(slug || 'unknown')
        .trim()
        .replace(/[^a-z0-9_]+/gi, '_')
        .replace(/^_+|_+$/g, '');
    return (s || 'unknown').slice(0, 80);
}

export function buildDecisionsNamespaceSlug(
    primaryClaimModule: ExecutionClaimModule | string,
    perspective: AppealUiPerspective
): string {
    return sanitizeDecisionsNamespaceSlug(`${primaryClaimModule}__${perspective}`);
}

export function buildDecisionsNamespaceSlugFromContext(ctx: ExecutionDomainContext): string {
    return buildDecisionsNamespaceSlug(ctx.primaryClaimModule, ctx.perspective);
}

export function executionDecisionsNamespaceStorageKey(
    executionId: string | undefined,
    namespaceSlug: string
): string {
    const id = normalizeExecutionStorageId(executionId);
    const slug = sanitizeDecisionsNamespaceSlug(namespaceSlug);
    return `${executionStorageKey(id)}_decisions_ns_${slug}`;
}

export function executionDecisionsNamespaceIndexKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_decisions_ns_index`;
}

export function executionDecisionsLegacyArchiveKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_decisions_legacy_archive`;
}

export function isExecutorDecisionsStorageKey(key: string): boolean {
    const k = stripExecutionDeviceStorageUserScope(String(key || '').trim());
    if (!k.startsWith('execution_')) return false;
    if (k.endsWith('_decisions_ns_index')) return false;
    if (k.endsWith('_decisions_legacy_archive')) return false;
    if (k.includes('_decisions_ns_')) return true;
    return k.endsWith('_decisions');
}

export function readDecisionsNamespaceIndex(
    executionId: string | undefined
): DecisionsNamespaceIndex | null {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return null;
    try {
        const raw = readDecisionsStoreRaw(executionDecisionsNamespaceIndexKey(id));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DecisionsNamespaceIndex;
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.active) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeDecisionsNamespaceIndex(
    executionId: string,
    index: DecisionsNamespaceIndex
): void {
    writeDecisionsStoreRaw(
        executionDecisionsNamespaceIndexKey(executionId),
        JSON.stringify(index)
    );
}

export function resolveActiveDecisionsNamespaceSlug(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): string {
    const id = normalizeExecutionStorageId(executionId);
    const data = executionData ?? readExecutionDataForDomainGate(id);
    if (!data || Object.keys(data).length === 0) {
        const index = readDecisionsNamespaceIndex(id);
        if (index?.active) return index.active;
    }
    const ctx = resolveExecutionDomainContext(data ?? {}, id);
    return buildDecisionsNamespaceSlugFromContext(ctx);
}

export function resolveActiveDecisionsStorageKey(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): string {
    const slug = resolveActiveDecisionsNamespaceSlug(executionId, executionData);
    return executionDecisionsNamespaceStorageKey(executionId, slug);
}

export function stampDecisionRowsWithNamespace(
    rows: Record<string, unknown>[],
    namespaceSlug: string
): Record<string, unknown>[] {
    const slug = sanitizeDecisionsNamespaceSlug(namespaceSlug);
    return rows.map((row) => {
        const existing = String((row as { domainNamespace?: string }).domainNamespace || '').trim();
        if (existing === slug) return row;
        return { ...row, domainNamespace: slug };
    });
}

export function resolveDecisionRowNamespaceSlug(
    row: Record<string, unknown>,
    executionData?: Record<string, unknown> | null,
    executionId?: string | undefined
): string {
    const id = normalizeExecutionStorageId(executionId);
    const data = executionData ?? readExecutionDataForDomainGate(id);
    const ctx = resolveExecutionDomainContext(data ?? {}, id);
    return inferLegacyRowNamespaceSlug(row, ctx);
}

function inferLegacyRowNamespaceSlug(
    row: Record<string, unknown>,
    ctx: ExecutionDomainContext
): string {
    const tagged = String((row as { domainNamespace?: string }).domainNamespace || '').trim();
    if (tagged) return sanitizeDecisionsNamespaceSlug(tagged);

    const kind = String(row.requestKind || '').trim();
    let module: ExecutionClaimModule | string = ctx.primaryClaimModule;

    if (
        kind === 'seizure' ||
        kind === 'guarantor_request' ||
        kind === 'unified_collection' ||
        kind === 'trust_disburse' ||
        kind === 'lawyer_fee_payout' ||
        kind === 'third_party_funds_received' ||
        kind === 'case_expense'
    ) {
        module = 'financial_debt';
    } else if (kind === 'eviction_procedure') {
        const branch = inferExecutorApprovalDecisionType({
            title: String(row.title || ''),
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: (row as { evictionWorkflowKey?: EvictionExecutorWorkflowKey })
                .evictionWorkflowKey,
        });
        if (branch === 'Marital Furniture Delivery') {
            module = 'marital_furniture';
        } else if (ctx.claimModules.includes('specific_delivery')) {
            module = 'specific_delivery';
        } else if (ctx.claimModules.includes('encroachment')) {
            module = 'encroachment';
        } else {
            module = 'eviction';
        }
    } else if (kind === 'personal_coercive') {
        module = ctx.flags.hidePersonalCoerciveFollowupTab
            ? ctx.primaryClaimModule
            : 'financial_debt';
    }

    return buildDecisionsNamespaceSlug(module, ctx.perspective);
}

function mergeRowsById(
    existing: Record<string, unknown>[],
    incoming: Record<string, unknown>[]
): Record<string, unknown>[] {
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of existing) {
        const id = String(row.id || '').trim();
        if (id) byId.set(id, row);
    }
    for (const row of incoming) {
        const id = String(row.id || '').trim();
        if (!id) continue;
        byId.set(id, row);
    }
    return Array.from(byId.values());
}

/**
 * ترحيل execution_*_decisions الموحّد إلى سلات namespace — مرة واحدة.
 */
export function ensureDecisionsNamespaceMigrated(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): boolean {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default' || id === 'undefined') return false;

    const index = readDecisionsNamespaceIndex(id);
    if (index?.legacyMigrated) {
        const activeSlug = resolveActiveDecisionsNamespaceSlug(id, executionData);
        if (index.active !== activeSlug) {
            writeDecisionsNamespaceIndex(id, {
                ...index,
                active: activeSlug,
            });
        }
        return false;
    }

    const ctx = resolveExecutionDomainContext(executionData ?? readExecutionDataForDomainGate(id), id);
    const activeSlug = buildDecisionsNamespaceSlugFromContext(ctx);
    const legacyKey = executionDecisionsStorageKey(id);
    const legacyRows = parseStoredDecisionsArray(readDecisionsStoreRaw(legacyKey));

    if (legacyRows.length === 0) {
        writeDecisionsNamespaceIndex(id, {
            v: DECISIONS_NAMESPACE_INDEX_VERSION,
            active: activeSlug,
            legacyMigrated: true,
            migratedAt: new Date().toISOString(),
        });
        return false;
    }

    const buckets = new Map<string, Record<string, unknown>[]>();
    for (const row of legacyRows) {
        const slug = inferLegacyRowNamespaceSlug(row, ctx);
        const list = buckets.get(slug) ?? [];
        list.push({ ...row, domainNamespace: slug });
        buckets.set(slug, list);
    }

    for (const [slug, rows] of buckets) {
        const nsKey = executionDecisionsNamespaceStorageKey(id, slug);
        const merged = stampDecisionRowsWithNamespace(rows, slug);
        writeDecisionsStoreRaw(nsKey, JSON.stringify(merged));
    }

    try {
        writeDecisionsStoreRaw(
            executionDecisionsLegacyArchiveKey(id),
            JSON.stringify(legacyRows)
        );
        writeDecisionsStoreRaw(legacyKey, JSON.stringify([]));
    } catch {
        /* ignore */
    }

    writeDecisionsNamespaceIndex(id, {
        v: DECISIONS_NAMESPACE_INDEX_VERSION,
        active: activeSlug,
        legacyMigrated: true,
        migratedAt: new Date().toISOString(),
    });

    return true;
}

export function readExecutorDecisionsFromActiveNamespace(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): Record<string, unknown>[] {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return [];

    ensureDecisionsNamespaceMigrated(id, executionData);

    const slug = resolveActiveDecisionsNamespaceSlug(id, executionData);
    const key = executionDecisionsNamespaceStorageKey(id, slug);
    try {
        return parseStoredDecisionsArray(readDecisionsStoreRaw(key));
    } catch {
        return [];
    }
}

function listDecisionsNamespaceStorageKeys(executionId: string): string[] {
    const id = normalizeExecutionStorageId(executionId);
    const prefix = `${executionStorageKey(id)}_decisions_ns_`;
    const logicalKeys = new Set<string>();
    try {
        for (const raw of SecureStoreService.listKeysSync()) {
            const logical = stripExecutionDeviceStorageUserScope(String(raw || '').trim());
            if (!logical.startsWith(prefix)) continue;
            if (logical.endsWith('_index')) continue;
            logicalKeys.add(logical);
        }
    } catch {
        return [];
    }
    return [...logicalKeys];
}

function mergeDecisionRowsById(
    target: Map<string, Record<string, unknown>>,
    rows: Record<string, unknown>[]
): void {
    for (const row of rows) {
        const rid = String(row.id ?? '').trim();
        if (!rid) continue;
        const prev = target.get(rid);
        if (!prev) {
            target.set(rid, row);
            continue;
        }
        const pd = String(prev.resolvedAt ?? prev.date ?? '');
        const nd = String(row.resolvedAt ?? row.date ?? '');
        const cmp = nd.localeCompare(pd, undefined, { numeric: true });
        if (cmp > 0) {
            target.set(rid, row);
        } else if (cmp < 0) {
            /* keep prev */
        } else {
            // نفس التاريخ — اللقطة الواردة تحمل تحديثاً (مثلاً تسجيل طعن يدوي)
            target.set(rid, { ...prev, ...row });
        }
    }
}

/** قراءة موحّدة لكل سلات namespace — يعرض طلبات محضر المتابعة في مركز القرارات */
export function readExecutorDecisionsUnionForExecution(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): Record<string, unknown>[] {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return [];

    ensureDecisionsNamespaceMigrated(id, executionData);

    const byId = new Map<string, Record<string, unknown>>();

    try {
        mergeDecisionRowsById(
            byId,
            parseStoredDecisionsArray(readDecisionsStoreRaw(executionDecisionsStorageKey(id)))
        );
    } catch {
        /* ignore */
    }

    for (const key of listDecisionsNamespaceStorageKeys(id)) {
        try {
            mergeDecisionRowsById(
                byId,
                parseStoredDecisionsArray(readDecisionsStoreRaw(key))
            );
        } catch {
            /* ignore */
        }
    }

    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
        const ad = String(a.resolvedAt ?? a.date ?? '');
        const bd = String(b.resolvedAt ?? b.date ?? '');
        return bd.localeCompare(ad, undefined, { numeric: true });
    });
    return merged;
}

/** قراءة اتحاد من كل مفاتيح التخزين المحتملة — يمنع فقدان صفوف عند اختلاف parent/child id */
export function readExecutorDecisionsUnionAcrossCandidateIds(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
    extraIds?: string[]
): Record<string, unknown>[] {
    const candidateIds = collectDecisionsStorageCandidateIds(executionId, executionData, extraIds);
    const byId = new Map<string, Record<string, unknown>>();

    for (const cid of candidateIds) {
        mergeDecisionRowsById(byId, readExecutorDecisionsUnionForExecution(cid, executionData));
    }

    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
        const ad = String(a.resolvedAt ?? a.date ?? '');
        const bd = String(b.resolvedAt ?? b.date ?? '');
        return bd.localeCompare(ad, undefined, { numeric: true });
    });
    return merged;
}

/**
 * يوحّد كل صفوف المرشحين تحت المعرّف الأب ويزيل سلال التخزين الفرعية المكررة.
 * يُستدعى بعد كل حفظ ناجح لمنع المفاتيح اليتيمة.
 */
export function pruneRedundantDecisionsStorageAliases(
    canonicalId: string | undefined,
    executionData?: Record<string, unknown> | null
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
    opts?: Pick<ExecutorDecisionsPersistOptions, 'removedIds' | 'extraIds'>
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
    executionData?: Record<string, unknown> | null
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
    executionData?: Record<string, unknown> | null
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
    executionData?: Record<string, unknown> | null
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
