import SecureStoreService from '@/app/services/SecureStoreService';
import {
    MAX_BACKUP_PLAINTEXT_BYTES,
    validateBusinessBackupImport,
} from '@/app/services/settings/businessBackupSecurity';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { VAULT_LOCAL_KEY } from '@/app/services/vault/vaultLocalIndex';
import {
    EXECUTION_FILES_STORAGE_KEY,
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    MAX_BACKUP_VAULT_BINARY_BYTES,
    MAX_BACKUP_VAULT_BLOB_COUNT,
    type BusinessBackupCounts,
    type BusinessBackupSelection,
    type BusinessBackupVaultBlob,
} from './businessBackupTypes';
import { sha256Hex, toBase64, validateVaultBlobRecords } from './businessBackupEncoding';
import { extractDate, filterByRange } from './businessBackupRange';

async function readJson(key: string): Promise<unknown> {
    try {
        const v = await SecureStoreService.getItem(key);
        if (typeof v !== 'string' || !v.trim()) return null;
        return JSON.parse(v) as unknown;
    } catch {
        return null;
    }
}

export async function buildBusinessBackupPayload(
    selection: BusinessBackupSelection,
    options: { materializeVaultBlobs?: boolean } = {},
) {
    const items: Record<string, string> = {};
    const vaultBlobs: BusinessBackupVaultBlob[] = [];
    let estimatedVaultManifestBytes = 0;
    const materializeVaultBlobs = options.materializeVaultBlobs !== false;
    const counts: BusinessBackupCounts = {
        lawsuits: { items: 0, undated: 0 },
        execution: { items: 0, undated: 0 },
        notes: { items: 0, undated: 0 },
        vault: { items: 0, undated: 0, localFiles: 0, localBytes: 0 },
        urgent: { keys: 0 },
    };

    const includeKeys: string[] = [];

    if (selection.includeLawsuits) {
        includeKeys.push(
            STORAGE_KEYS.LAWYER_FILES,
            LAWSUIT_FILES_STORAGE_KEY,
            LAWSUIT_FILES_ACTIVE_KEY,
            LAWSUIT_FILES_ARCHIVED_KEY,
            LAWSUIT_FILES_TRASH_KEY,
            LAWSUIT_FILES_INDEX_KEY,
        );
    }
    if (selection.includeExecution) includeKeys.push(EXECUTION_FILES_STORAGE_KEY);
    if (selection.includeNotes) {
        includeKeys.push(STORAGE_KEYS.LAWYER_NOTES, 'globalNotes', 'global_notes', 'hami_notes_vault');
    }
    if (selection.includeVault) includeKeys.push('hami_docs_vault', VAULT_LOCAL_KEY);

    const allKeys = await SecureStoreService.listKeys();
    if (selection.includeExecution) {
        allKeys
            .filter(
                (k) =>
                    (k.startsWith('execution_') && k !== EXECUTION_FILES_STORAGE_KEY) ||
                    k.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`),
            )
            .forEach((k) => includeKeys.push(k));
    }
    if (selection.includeNotes) {
        allKeys.filter((k) => k.startsWith('hami_notes_vault_')).forEach((k) => includeKeys.push(k));
    }
    if (selection.includeUrgent) {
        const urgentKeys = allKeys.filter((k) => k.startsWith('hami:urgentActions:v1:'));
        urgentKeys.forEach((k) => includeKeys.push(k));
        counts.urgent.keys = urgentKeys.length;
    }

    const uniqueKeys = Array.from(new Set(includeKeys));

    for (const k of uniqueKeys) {
        const raw = await SecureStoreService.getItem(k);
        if (typeof raw === 'string') items[k] = raw;
    }

    const parseArrayCount = async (key: string) => {
        const v = await readJson(key);
        if (!Array.isArray(v)) return { items: 0, undated: 0, raw: null as unknown[] | null };
        const { filtered, undated } = filterByRange(v, selection);
        return { items: filtered.length, undated, raw: filtered };
    };

    if (selection.includeLawsuits) {
        const lawsuitCountKey = items[LAWSUIT_FILES_ACTIVE_KEY]
            ? LAWSUIT_FILES_ACTIVE_KEY
            : STORAGE_KEYS.LAWYER_FILES;
        if (items[lawsuitCountKey]) {
            const parsed = await parseArrayCount(lawsuitCountKey);
            counts.lawsuits.items = parsed.items;
            counts.lawsuits.undated = parsed.undated;
            items[lawsuitCountKey] = JSON.stringify(parsed.raw ?? []);
        }
        for (const key of [LAWSUIT_FILES_ARCHIVED_KEY, LAWSUIT_FILES_TRASH_KEY, STORAGE_KEYS.LAWYER_FILES]) {
            if (key === lawsuitCountKey || !items[key]) continue;
            const parsed = await parseArrayCount(key);
            items[key] = JSON.stringify(parsed.raw ?? []);
        }
    }

    const executionIndexKeys = Object.keys(items).filter(
        (key) => key === EXECUTION_FILES_STORAGE_KEY || key.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`),
    );
    if (selection.includeExecution && executionIndexKeys.length > 0) {
        let richest: { items: number; undated: number; raw: unknown[] | null; key: string } = {
            items: 0,
            undated: 0,
            raw: null,
            key: executionIndexKeys[0],
        };
        for (const key of executionIndexKeys) {
            const parsed = await parseArrayCount(key);
            items[key] = JSON.stringify(parsed.raw ?? []);
            if (parsed.items >= richest.items) {
                richest = { ...parsed, key };
            }
        }
        counts.execution.items = richest.items;
        counts.execution.undated = richest.undated;

        if (selection.from || selection.to) {
            const selectedIds = new Set(
                (richest.raw ?? [])
                    .map((item) => {
                        if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
                        const id = (item as Record<string, unknown>).id;
                        return typeof id === 'string' || typeof id === 'number' ? String(id).trim() : '';
                    })
                    .filter(Boolean),
            );
            const selectedDossierIds = [...selectedIds];
            for (const key of Object.keys(items)) {
                if (!key.startsWith('execution_') || key === EXECUTION_FILES_STORAGE_KEY) continue;
                if (key.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`)) continue;
                const belongsToSelectedDossier = selectedDossierIds.some((id) => {
                    const dossierBase = `execution_${id}`;
                    return (
                        key === dossierBase ||
                        key.startsWith(`${dossierBase}_`) ||
                        key.startsWith(`${dossierBase}:u:`) ||
                        key.startsWith(`execution_form_${id}`)
                    );
                });
                if (!belongsToSelectedDossier) delete items[key];
            }
        }
    }

    if (selection.includeNotes) {
        const noteKeys = Object.keys(items).filter(
            (key) =>
                key === STORAGE_KEYS.LAWYER_NOTES ||
                key === 'globalNotes' ||
                key === 'global_notes' ||
                key === 'hami_notes_vault' ||
                key.startsWith('hami_notes_vault_'),
        );
        for (const key of noteKeys) {
            const parsed = await parseArrayCount(key);
            counts.notes.items += parsed.items;
            counts.notes.undated += parsed.undated;
            items[key] = JSON.stringify(parsed.raw ?? []);
        }
    }

    if (selection.includeVault) {
        const selectedVaultDocs = new Map<string, Record<string, unknown>>();
        const undatedVaultDocs = new Set<string>();
        for (const key of ['hami_docs_vault', VAULT_LOCAL_KEY]) {
            if (!items[key]) continue;
            let raw: unknown;
            try {
                raw = JSON.parse(items[key]);
            } catch {
                raw = null;
            }
            if (!Array.isArray(raw)) {
                items[key] = '[]';
                continue;
            }
            const { filtered } = filterByRange(raw, selection);
            items[key] = JSON.stringify(filtered);
            raw.forEach((candidate, index) => {
                if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
                const doc = candidate as Record<string, unknown>;
                const id = typeof doc.id === 'string' ? doc.id.trim() : '';
                const authorId = typeof doc.authorId === 'string' ? doc.authorId.trim() : '';
                const identity = id && authorId ? `${authorId}:${id}` : `${key}:${index}`;
                if (!extractDate(doc)) undatedVaultDocs.add(identity);
            });
            filtered.forEach((candidate, index) => {
                if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
                const doc = candidate as Record<string, unknown>;
                const id = typeof doc.id === 'string' ? doc.id.trim() : '';
                const authorId = typeof doc.authorId === 'string' ? doc.authorId.trim() : '';
                const identity = id && authorId ? `${authorId}:${id}` : `${key}:${index}`;
                selectedVaultDocs.set(identity, doc);
            });
        }
        counts.vault.items = selectedVaultDocs.size;
        counts.vault.undated = undatedVaultDocs.size;

        const localDocs = [...selectedVaultDocs.values()].filter(
            (doc) => typeof doc.storagePath === 'string' && doc.storagePath.startsWith('idb:vault:'),
        );
        if (localDocs.length > MAX_BACKUP_VAULT_BLOB_COUNT) {
            throw new Error('عدد ملفات المخزن المحلي يتجاوز حد النسخة الآمن');
        }
        if (localDocs.length > 0 && !materializeVaultBlobs) {
            for (const doc of localDocs) {
                const size =
                    typeof doc.fileSize === 'number' &&
                    Number.isSafeInteger(doc.fileSize) &&
                    doc.fileSize >= 0
                        ? doc.fileSize
                        : 0;
                if (counts.vault.localBytes + size > MAX_BACKUP_VAULT_BINARY_BYTES) {
                    throw new Error('ملفات المخزن المحلي تتجاوز حد النسخة الآمن للهاتف');
                }
                counts.vault.localFiles += 1;
                counts.vault.localBytes += size;
                estimatedVaultManifestBytes += Math.ceil(size / 3) * 4 + 320;
            }
        } else if (localDocs.length > 0) {
            const vaultStore = await import('@/app/services/vaultBlobStore');
            await vaultStore.waitForVaultBlobWrites();
            for (const doc of localDocs) {
                const parsedPath = vaultStore.parseVaultIdbPath(String(doc.storagePath));
                if (!parsedPath) throw new Error('مسار ملف محلي غير صالح في المخزن الذكي');
                const blob = await vaultStore.getVaultBlob(parsedPath.userId, parsedPath.docId);
                if (!blob) {
                    throw new Error(`ملف المخزن المحلي غير متاح للنسخ: ${String(doc.fileName ?? doc.id ?? '')}`);
                }
                if (counts.vault.localBytes + blob.size > MAX_BACKUP_VAULT_BINARY_BYTES) {
                    throw new Error('ملفات المخزن المحلي تتجاوز حد النسخة الآمن للهاتف');
                }
                const buffer = await blob.arrayBuffer();
                const mimeType =
                    (typeof doc.mimeType === 'string' && doc.mimeType) ||
                    blob.type ||
                    'application/octet-stream';
                vaultBlobs.push({
                    authorId: parsedPath.userId,
                    docId: parsedPath.docId,
                    mimeType,
                    size: buffer.byteLength,
                    sha256: await sha256Hex(buffer),
                    data: toBase64(buffer),
                });
                counts.vault.localFiles += 1;
                counts.vault.localBytes += buffer.byteLength;
            }
        }
    }

    const payload = {
        kind: 'hami-business-backup',
        version: 2,
        createdAt: new Date().toISOString(),
        selection: {
            lawsuits: selection.includeLawsuits,
            execution: selection.includeExecution,
            notes: selection.includeNotes,
            vault: selection.includeVault,
            urgent: selection.includeUrgent,
        },
        range: {
            from: selection.from || null,
            to: selection.to || null,
            includeUndated: selection.includeUndated,
        },
        counts,
        items,
        vaultBlobs,
    };

    const text = JSON.stringify(payload);
    const entries = Object.entries(items);
    if (entries.length > 0) {
        const validation = validateBusinessBackupImport(entries);
        if (!validation.ok) throw new Error(validation.reason);
    }
    validateVaultBlobRecords(vaultBlobs);
    const bytes = new TextEncoder().encode(text).byteLength + estimatedVaultManifestBytes;
    if (bytes > MAX_BACKUP_PLAINTEXT_BYTES) {
        throw new Error('حجم النسخة يتجاوز الحد الآمن للأجهزة المحمولة');
    }
    return {
        payload,
        text,
        bytes,
        keys: Object.keys(items).length,
        counts,
    };
}
