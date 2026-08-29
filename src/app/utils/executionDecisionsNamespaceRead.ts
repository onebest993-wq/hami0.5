/**
 * Decisions namespace — read active / union / across candidates.
 */
import { executionDecisionsStorageKey, normalizeExecutionStorageId } from '@/app/utils/executionStorageKeysLite';
import { collectDecisionsStorageCandidateIds } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { executionDecisionsNamespaceStorageKey } from './executionDecisionsNamespaceKeys';
import {
    parseStoredDecisionsArray,
    readDecisionsStoreRaw,
} from './executionDecisionsNamespaceStore';
import { ensureDecisionsNamespaceMigrated } from './executionDecisionsNamespaceMigrate';
import { resolveActiveDecisionsNamespaceSlug } from './executionDecisionsNamespaceResolve';
import {
    listDecisionsNamespaceStorageKeys,
    mergeDecisionRowsById,
} from './executionDecisionsNamespaceMerge';

export function readExecutorDecisionsFromActiveNamespace(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
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

/** قراءة موحّدة لكل سلات namespace — يعرض طلبات محضر المتابعة في مركز القرارات */
export function readExecutorDecisionsUnionForExecution(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
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
    extraIds?: string[],
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
