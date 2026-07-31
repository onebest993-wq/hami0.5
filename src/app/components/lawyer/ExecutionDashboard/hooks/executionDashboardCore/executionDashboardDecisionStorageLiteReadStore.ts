import SecureStoreService from '@/app/services/SecureStoreService';
import { executionDecisionsStorageKey } from '@/app/utils/executionStorageKeyPrimitives';
import {
    decisionsNamespaceIndexKey,
    decisionsNamespacePrefix,
    type ExecutionDecisionRowLite,
    normalizeExecutionStorageId,
    parseStoredDecisionRows,
} from './executionDashboardDecisionStorageLiteCore';

export function readDecisionRowsByKey(key: string): ExecutionDecisionRowLite[] {
    return parseStoredDecisionRows(SecureStoreService.getItemSync(key));
}

export function listDecisionCandidateKeys(executionId: string): string[] {
    const exId = normalizeExecutionStorageId(executionId);
    const prefix = decisionsNamespacePrefix(exId);
    const indexKey = decisionsNamespaceIndexKey(exId);
    const namespaceKeys = SecureStoreService.listKeysSync().filter(
        (key) => key.startsWith(prefix) && key !== indexKey,
    );
    return Array.from(new Set([executionDecisionsStorageKey(exId), ...namespaceKeys]));
}

export function resolveActiveDecisionStorageKey(executionId: string): string {
    const exId = normalizeExecutionStorageId(executionId);
    const indexRaw = SecureStoreService.getItemSync(decisionsNamespaceIndexKey(exId));
    if (indexRaw) {
        try {
            const parsed = JSON.parse(indexRaw) as { active?: string };
            const activeSlug = String(parsed?.active || '').trim();
            if (activeSlug) {
                return `${decisionsNamespacePrefix(exId)}${activeSlug}`;
            }
        } catch {
            /* ignore */
        }
    }
    return executionDecisionsStorageKey(exId);
}

export function allDecisionStorageKeys(): string[] {
    return SecureStoreService.listKeysSync().filter((key) => {
        if (!key.startsWith('execution_')) return false;
        return key.endsWith('_decisions') || key.includes('_decisions_ns_');
    });
}
