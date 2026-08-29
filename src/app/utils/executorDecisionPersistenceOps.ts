import SecureStoreService from '@/app/services/SecureStoreService';
import { readSecureOrDrainLegacySync, writeSecureAndClearLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    executionDecisionsNamespaceStorageKey,
    isExecutorDecisionsStorageKey,
    readExecutorDecisionsFromActiveNamespace,
    readExecutorDecisionsUnionForExecution,
    resolveDecisionRowNamespaceSlug,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';
import { mergeExecutorDecisionRows, type ExecutorDecisionRowLite } from '@/app/utils/executorDecisionSelectors';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';

type ExecutorPersistRow = Record<string, unknown>;

function parseStoredDecisionsArray(raw: string | null): ExecutorPersistRow[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as ExecutorPersistRow[]) : [];
    } catch {
        return [];
    }
}

export function patchExecutorDecisionRowInStorage(input: {
    executionId: string | undefined;
    decisionId: string;
    patch: Record<string, unknown>;
    onReload?: () => void;
}): boolean {
    const decisionId = String(input.decisionId || '').trim();
    if (!decisionId) return false;

    try {
        const executionData = readExecutionDataForDomainGate(input.executionId);
        const unionRows = readExecutorDecisionsUnionForExecution(input.executionId, executionData);
        const targetRow = unionRows.find((row) => String((row as { id?: string }).id ?? '') === decisionId);
        if (!targetRow) return false;

        const slug = resolveDecisionRowNamespaceSlug(targetRow, executionData, input.executionId);
        const bucketKey = executionDecisionsNamespaceStorageKey(input.executionId, slug);
        const bucketRows = parseStoredDecisionsArray(readSecureOrDrainLegacySync(bucketKey));
        let found = false;
        const nextBucketRows = bucketRows.map((row) => {
            if (String((row as { id?: string }).id ?? '') !== decisionId) return row;
            found = true;
            return { ...row, ...input.patch };
        });

        if (!found) {
            const activeRows = readExecutorDecisionsFromActiveNamespace(input.executionId, executionData);
            const nextActiveRows = activeRows.map((row) => {
                if (String((row as { id?: string }).id ?? '') !== decisionId) return row;
                found = true;
                return { ...row, ...input.patch };
            });
            if (!found) return false;
            writeExecutorDecisionsArray(input.executionId, nextActiveRows, executionData);
            input.onReload?.();
            return true;
        }

        writeSecureAndClearLegacySync(bucketKey, JSON.stringify(nextBucketRows));
        input.onReload?.();
        return true;
    } catch {
        return false;
    }
}

export function patchExecutorDecisionRowEverywhereInStorage(input: {
    decisionId: string;
    patch: Record<string, unknown>;
    scopeExecutionId?: string;
    onReload?: () => void;
}): { ok: boolean; patchedKeys: number } {
    const decisionId = String(input.decisionId || '').trim();
    if (!decisionId) return { ok: false, patchedKeys: 0 };

    const scopeId = String(input.scopeExecutionId ?? '').trim();
    const scopePrefix = scopeId ? executionStorageKey(scopeId) : '';

    try {
        const keys = SecureStoreService.listKeysSync();
        let patchedKeys = 0;

        for (const keyLike of keys) {
            const key = String(keyLike || '').trim();
            if (!key || !isExecutorDecisionsStorageKey(key)) continue;
            if (scopePrefix && !key.startsWith(scopePrefix)) continue;

            const rows = parseStoredDecisionsArray(readSecureOrDrainLegacySync(key));
            if (rows.length === 0) continue;

            let changed = false;
            const nextRows = rows.map((row) => {
                if (String((row as { id?: string }).id ?? '') !== decisionId) return row;
                changed = true;
                return { ...row, ...input.patch };
            });

            if (!changed) continue;
            writeSecureAndClearLegacySync(key, JSON.stringify(nextRows));
            patchedKeys += 1;
        }

        if (patchedKeys > 0) input.onReload?.();
        return { ok: patchedKeys > 0, patchedKeys };
    } catch {
        return { ok: false, patchedKeys: 0 };
    }
}

export function mergeExecutorDecisionsIntoStorage(input: {
    targetExecutionId: string | undefined;
    sourceExecutionIds: Array<string | undefined>;
    onReload?: () => void;
}): { merged: boolean; countBefore: number; countAfter: number } {
    const targetId = String(input.targetExecutionId ?? '').trim();
    if (!targetId || targetId === 'default' || targetId === 'undefined') {
        return { merged: false, countBefore: 0, countAfter: 0 };
    }

    const sourceIds = input.sourceExecutionIds
        .map((value) => String(value ?? '').trim())
        .filter((value) => value && value !== 'default' && value !== 'undefined' && value !== targetId);

    const executionData = readExecutionDataForDomainGate(targetId);
    const targetRows = readExecutorDecisionsUnionForExecution(targetId, executionData) as ExecutorDecisionRowLite[];
    const countBefore = targetRows.length;

    if (sourceIds.length === 0) {
        return { merged: false, countBefore, countAfter: countBefore };
    }

    try {
        const sourceGroups = sourceIds.map(
            (sourceId) =>
                readExecutorDecisionsUnionForExecution(
                    sourceId,
                    readExecutionDataForDomainGate(sourceId),
                ) as ExecutorDecisionRowLite[],
        );
        const { mergedRows, touched } = mergeExecutorDecisionRows(targetRows, sourceGroups);
        if (!touched) {
            return { merged: false, countBefore, countAfter: countBefore };
        }
        writeExecutorDecisionsArray(targetId, mergedRows as ExecutorPersistRow[], executionData);
        input.onReload?.();
        return { merged: true, countBefore, countAfter: mergedRows.length };
    } catch {
        return { merged: false, countBefore, countAfter: countBefore };
    }
}
