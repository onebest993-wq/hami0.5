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
} from '@/app/utils/executionStorageKeys';

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
    const k = String(key || '').trim();
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
        const raw = SecureStoreService.getItemSync(executionDecisionsNamespaceIndexKey(id));
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
    SecureStoreService.setItemSync(
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
        module = 'eviction';
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
    const legacyRows = parseStoredDecisionsArray(SecureStoreService.getItemSync(legacyKey));

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
        const prev = parseStoredDecisionsArray(SecureStoreService.getItemSync(nsKey));
        const merged = stampDecisionRowsWithNamespace(mergeRowsById(prev, rows), slug);
        SecureStoreService.setItemSync(nsKey, JSON.stringify(merged));
    }

    try {
        SecureStoreService.setItemSync(
            executionDecisionsLegacyArchiveKey(id),
            JSON.stringify(legacyRows)
        );
        SecureStoreService.setItemSync(legacyKey, JSON.stringify([]));
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
        return parseStoredDecisionsArray(SecureStoreService.getItemSync(key));
    } catch {
        return [];
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
    const slug = resolveActiveDecisionsNamespaceSlug(id, executionData);
    const stamped = stampDecisionRowsWithNamespace(arr, slug);
    const key = executionDecisionsNamespaceStorageKey(id, slug);
    SecureStoreService.setItemSync(key, JSON.stringify(stamped));

    const index = readDecisionsNamespaceIndex(id);
    if (!index || index.active !== slug) {
        writeDecisionsNamespaceIndex(id, {
            v: DECISIONS_NAMESPACE_INDEX_VERSION,
            active: slug,
            legacyMigrated: index?.legacyMigrated ?? true,
            migratedAt: index?.migratedAt ?? new Date().toISOString(),
        });
    }
}

/** تهيئة namespace فارغ لإضبارة جديدة */
export function seedFreshDecisionsNamespace(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    const slug = resolveActiveDecisionsNamespaceSlug(id, executionData);
    SecureStoreService.setItemSync(executionDecisionsNamespaceStorageKey(id, slug), JSON.stringify([]));
    writeDecisionsNamespaceIndex(id, {
        v: DECISIONS_NAMESPACE_INDEX_VERSION,
        active: slug,
        legacyMigrated: true,
        migratedAt: new Date().toISOString(),
    });
    try {
        SecureStoreService.setItemSync(executionDecisionsStorageKey(id), JSON.stringify([]));
    } catch {
        /* ignore */
    }
}

export function clearDecisionsNamespaceForTests(executionId: string | undefined): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    try {
        SecureStoreService.removeItemSync(executionDecisionsNamespaceIndexKey(id));
        SecureStoreService.removeItemSync(executionDecisionsLegacyArchiveKey(id));
        SecureStoreService.removeItemSync(executionDecisionsStorageKey(id));
        const keys = SecureStoreService.listKeysSync();
        for (const k of keys) {
            const key = String(k || '').trim();
            if (key.startsWith(`${executionStorageKey(id)}_decisions_ns_`)) {
                SecureStoreService.removeItemSync(key);
            }
        }
    } catch {
        /* ignore */
    }
}
