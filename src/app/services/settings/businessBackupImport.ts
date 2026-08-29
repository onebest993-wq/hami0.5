import SecureStoreService from '@/app/services/SecureStoreService';
import {
    MAX_BACKUP_PLAINTEXT_BYTES,
    validateBusinessBackupImport,
} from '@/app/services/settings/businessBackupSecurity';
import { VAULT_LOCAL_KEY } from '@/app/services/vault/vaultLocalIndex';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import type { BusinessBackupVaultBlob } from './businessBackupTypes';
import { fromBase64, sha256Hex, validateVaultBlobRecords } from './businessBackupEncoding';

export async function importBusinessBackupEntries(
    entries: Array<[string, string]>,
    vaultBlobInput: BusinessBackupVaultBlob[] = [],
) {
    const validation = validateBusinessBackupImport(entries);
    if (validation.ok === false) {
        throw new Error(validation.reason);
    }
    const vaultBlobs = validateVaultBlobRecords(vaultBlobInput);
    const vaultStore =
        vaultBlobs.length > 0 ? await import('@/app/services/vaultBlobStore') : null;
    const expectedVaultBlobPaths = new Set<string>();
    for (const [key, value] of entries) {
        if (key !== 'hami_docs_vault' && key !== VAULT_LOCAL_KEY) continue;
        const docs = JSON.parse(value) as unknown;
        if (!Array.isArray(docs)) continue;
        for (const candidate of docs) {
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
            const storagePath = (candidate as Record<string, unknown>).storagePath;
            if (typeof storagePath === 'string' && storagePath.startsWith('idb:vault:')) {
                expectedVaultBlobPaths.add(storagePath);
            }
        }
    }
    const preparedVaultBlobs: Array<{
        record: BusinessBackupVaultBlob;
        blob: Blob;
        previous: Blob | null;
    }> = [];
    if (vaultStore) {
        for (const record of vaultBlobs) {
            const expectedPath = vaultStore.buildVaultIdbPath(record.authorId, record.docId);
            if (!expectedVaultBlobPaths.has(expectedPath)) {
                throw new Error('vault blob is not referenced by the imported vault index');
            }
            const buffer = fromBase64(record.data, 'vault blob');
            if ((await sha256Hex(buffer)) !== record.sha256) {
                throw new Error('vault blob checksum mismatch');
            }
            preparedVaultBlobs.push({
                record,
                blob: new Blob([buffer], { type: record.mimeType }),
                previous: await vaultStore.getVaultBlob(record.authorId, record.docId),
            });
        }
    }

    const snapshot = new Map<string, string | null>();
    for (const [k] of entries) {
        if (typeof k !== 'string') continue;
        const prior = await SecureStoreService.getItem(k);
        snapshot.set(k, prior == null ? null : String(prior));
    }

    const written: string[] = [];
    const writtenVaultBlobs: typeof preparedVaultBlobs = [];
    try {
        for (const [k, v] of entries) {
            await SecureStoreService.setItem(k, v, { allowVerifiedEmptyOverwrite: true });
            if ((await SecureStoreService.getItem(k)) !== v) {
                throw new Error(`backup restore verification failed:${k}`);
            }
            written.push(k);
            persistenceRepository.synchronizeExternalWrite(k, v);
        }
        if (vaultStore) {
            for (const prepared of preparedVaultBlobs) {
                const { record, blob } = prepared;
                await vaultStore.putVaultBlobVerified(
                    record.authorId,
                    record.docId,
                    blob,
                    record.mimeType,
                );
                writtenVaultBlobs.push(prepared);
            }
        }
        const executionEntries = entries.filter(([key]) =>
            key === 'executionFiles' ||
            key.startsWith('executionFiles:') ||
            key.startsWith('execution_'),
        );
        if (executionEntries.length > 0) {
            const { storageCache } = await import('@/app/utils/storageCache');
            for (const [key, value] of executionEntries) {
                storageCache.touchCacheEntry(key, JSON.parse(value));
            }
        }
        window.dispatchEvent(
            new CustomEvent('hami:data-imported', {
                detail: { keys: entries.map(([key]) => key) },
            }),
        );
    } catch (err) {
        let rollbackIncomplete = false;
        if (vaultStore) {
            for (const prepared of writtenVaultBlobs.reverse()) {
                try {
                    if (prepared.previous) {
                        await vaultStore.putVaultBlobVerified(
                            prepared.record.authorId,
                            prepared.record.docId,
                            prepared.previous,
                            prepared.previous.type || prepared.record.mimeType,
                        );
                    } else {
                        await vaultStore.deleteVaultBlobVerified(
                            prepared.record.authorId,
                            prepared.record.docId,
                        );
                    }
                } catch {
                    rollbackIncomplete = true;
                }
            }
        }
        for (const k of written.reverse()) {
            const prior = snapshot.get(k);
            try {
                if (prior == null) {
                    await SecureStoreService.deleteItem(k);
                    if ((await SecureStoreService.getItem(k)) != null) {
                        throw new Error(`backup rollback delete verification failed:${k}`);
                    }
                    persistenceRepository.synchronizeExternalWrite(k, null);
                } else {
                    await SecureStoreService.setItem(k, prior, {
                        allowVerifiedEmptyOverwrite: true,
                    });
                    if ((await SecureStoreService.getItem(k)) !== prior) {
                        throw new Error(`backup rollback restore verification failed:${k}`);
                    }
                    persistenceRepository.synchronizeExternalWrite(k, prior);
                }
            } catch {
                rollbackIncomplete = true;
            }
        }
        if (rollbackIncomplete) {
            throw new Error('backup restore failed and rollback was incomplete', { cause: err });
        }
        throw err;
    }
}

export function parseBusinessBackupFile(text: string): {
    version: 1 | 2;
    createdAt: string | null;
    selection: Record<string, unknown> | null;
    range: Record<string, unknown> | null;
    counts: Record<string, unknown> | null;
    keys: string[];
    entries: Array<[string, string]>;
    vaultBlobs: BusinessBackupVaultBlob[];
} {
    if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_PLAINTEXT_BYTES) {
        throw new Error('backup exceeds the mobile-safe import limit');
    }
    const parsed = JSON.parse(text) as unknown;
    const obj = parsed as {
        kind?: unknown;
        version?: unknown;
        createdAt?: unknown;
        selection?: unknown;
        range?: unknown;
        counts?: unknown;
        items?: unknown;
        vaultBlobs?: unknown;
    };
    if (
        obj?.kind !== 'hami-business-backup' ||
        (obj?.version !== 1 && obj?.version !== 2) ||
        !obj.items ||
        typeof obj.items !== 'object'
    ) {
        throw new Error('invalid backup');
    }
    const entriesAll = Object.entries(obj.items as Record<string, unknown>);
    const entries = entriesAll.filter(
        (e): e is [string, string] => typeof e[0] === 'string' && typeof e[1] === 'string',
    );
    if (entries.length !== entriesAll.length) {
        throw new Error('backup contains invalid records');
    }
    const validation = validateBusinessBackupImport(entries);
    if (!validation.ok) throw new Error(validation.reason);
    const vaultBlobs = validateVaultBlobRecords(obj.vaultBlobs);
    return {
        version: obj.version as 1 | 2,
        createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : null,
        selection: obj.selection && typeof obj.selection === 'object' ? (obj.selection as Record<string, unknown>) : null,
        range: obj.range && typeof obj.range === 'object' ? (obj.range as Record<string, unknown>) : null,
        counts: obj.counts && typeof obj.counts === 'object' ? (obj.counts as Record<string, unknown>) : null,
        keys: entries.map((e) => e[0]).sort((a, b) => a.localeCompare(b)),
        entries,
        vaultBlobs,
    };
}
