/**
 * Decisions namespace — one-shot legacy → namespace migration.
 */
import { executionDecisionsStorageKey, normalizeExecutionStorageId } from '@/app/utils/executionStorageKeysLite';
import {
    readExecutionDataForDomainGate,
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import {
    DECISIONS_NAMESPACE_INDEX_VERSION,
    buildDecisionsNamespaceSlugFromContext,
    executionDecisionsLegacyArchiveKey,
    executionDecisionsNamespaceStorageKey,
    readDecisionsNamespaceIndex,
    writeDecisionsNamespaceIndex,
} from './executionDecisionsNamespaceKeys';
import {
    parseStoredDecisionsArray,
    readDecisionsStoreRaw,
    writeDecisionsStoreRaw,
} from './executionDecisionsNamespaceStore';
import {
    inferLegacyRowNamespaceSlug,
    resolveActiveDecisionsNamespaceSlug,
    stampDecisionRowsWithNamespace,
} from './executionDecisionsNamespaceResolve';

/**
 * ترحيل execution_*_decisions الموحّد إلى سلات namespace — مرة واحدة.
 */
export function ensureDecisionsNamespaceMigrated(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
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
