import type { ExecutionFile } from '@/app/types/execution';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { isInabaSubFileId } from '@/app/domain/execution/dossier/ExecutionDossierScope';

export function inabaSubMetaStorageKey(parentId: string, subFileId: string): string {
    return `${String(parentId || '').trim()}__sub__${String(subFileId || '').trim()}__meta`;
}

function executionStoredBlobMatchesFileId(
    stored: ExecutionFile | null | undefined,
    fileId: string,
): boolean {
    if (!stored || !fileId) return false;
    const storedId = String(stored.id ?? '').trim();
    const expectedId = String(fileId).trim();
    if (!storedId || !expectedId) return false;
    return storedId === expectedId;
}

export function readScopedExecutionDossierFromCache(input: {
    fileId: string;
    storeId: string;
    parentLink: string;
    inDelegationView: boolean;
}): ExecutionFile | null {
    const { fileId, storeId, parentLink, inDelegationView } = input;
    const inabaMetaKey =
        inDelegationView && isInabaSubFileId(storeId) && parentLink
            ? executionStorageKey(inabaSubMetaStorageKey(parentLink, storeId))
            : '';
    const persistKey = inabaMetaKey ? '' : String(fileId || '').trim();
    const storageKey = inabaMetaKey || (persistKey ? executionStorageKey(persistKey) : '');
    let stored = storageKey ? (storageCache.get(storageKey) as ExecutionFile | null) : null;
    if (stored && persistKey && !executionStoredBlobMatchesFileId(stored, persistKey)) {
        stored = null;
    }
    return stored;
}

export function readExecutionDossierByIdFromCache(fileId: string): ExecutionFile | null {
    const persistedId = String(fileId || '').trim();
    if (!persistedId) return null;
    const stored = storageCache.get(executionStorageKey(persistedId)) as ExecutionFile | null;
    if (!executionStoredBlobMatchesFileId(stored, persistedId)) return null;
    return stored;
}

export function writeExecutionDossierByIdToCache(fileId: string, file: ExecutionFile): void {
    const persistedId = String(fileId || '').trim();
    if (!persistedId) return;
    storageCache.set(executionStorageKey(persistedId), file);
}

export function writeInabaExecutionDossierToCache(
    parentId: string,
    subFileId: string,
    file: ExecutionFile,
): void {
    const cacheKey = inabaSubMetaStorageKey(parentId, subFileId);
    writeExecutionDossierByIdToCache(cacheKey, file);
}
