import { readLatestDossierBackup } from '@/app/services/dossierPersistence/dossierBackupStore';
import type { BackupDomain } from '@/app/services/dossierPersistence/dossierPersistenceTypes';
import {
    backupDomainForStorageKey,
} from '@/app/services/dossierPersistence/protectedStorageKeys';
import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

const LAWYER_NOTES_STORAGE_KEY = 'lawyer_notes';

const ENCRYPTED_PREFIX = 'hami_enc_v2:';
const decryptRecoveryAttempted = new Set<string>();

function isEncryptedBlob(raw: string): boolean {
    return raw.startsWith(ENCRYPTED_PREFIX);
}

function readLegacyPlaintextFromLocalStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const ls = globalThis.localStorage;
        if (!ls) return null;
        const raw = ls.getItem(key);
        if (!raw?.trim() || isEncryptedBlob(raw)) return null;
        JSON.parse(raw);
        return raw;
    } catch {
        return null;
    }
}

function lawsuitDomainForKey(key: string): boolean {
    return key === LAWSUIT_FILES_STORAGE_KEY || LAWSUIT_FILES_STORAGE_KEYS_LEGACY.includes(key as never);
}

function executionDomainForKey(key: string): boolean {
    return key === EXECUTION_FILES_STORAGE_KEY || EXECUTION_FILES_STORAGE_KEYS_LEGACY.includes(key as never);
}

async function readBackup(domain: BackupDomain): Promise<string | null> {
    const backup = await readLatestDossierBackup(domain);
    if (!backup?.payload.length) return null;
    return JSON.stringify(backup.payload);
}

/** استعادة plaintext عند فشل فك التشفير — نسخة احتياطية أو localStorage قديم */
export async function recoverPlaintextAfterDecryptFailure(storageKey: string): Promise<string | null> {
    if (decryptRecoveryAttempted.has(storageKey)) return null;
    decryptRecoveryAttempted.add(storageKey);

    for (const legacyKey of LAWSUIT_FILES_STORAGE_KEYS_LEGACY) {
        if (storageKey === legacyKey || storageKey === LAWSUIT_FILES_STORAGE_KEY) {
            const fromLs = readLegacyPlaintextFromLocalStorage(legacyKey);
            if (fromLs) return fromLs;
        }
    }
    for (const legacyKey of EXECUTION_FILES_STORAGE_KEYS_LEGACY) {
        if (storageKey === legacyKey || storageKey === EXECUTION_FILES_STORAGE_KEY) {
            const fromLs = readLegacyPlaintextFromLocalStorage(legacyKey);
            if (fromLs) return fromLs;
        }
    }

    const fromPrimaryLs = readLegacyPlaintextFromLocalStorage(storageKey);
    if (fromPrimaryLs) return fromPrimaryLs;

    if (lawsuitDomainForKey(storageKey)) {
        return readBackup('lawsuit');
    }
    if (executionDomainForKey(storageKey)) {
        return readBackup('execution');
    }

    const backupDomain = backupDomainForStorageKey(storageKey);
    if (backupDomain && backupDomain !== 'lawsuit' && backupDomain !== 'execution') {
        return readBackup(backupDomain);
    }

    if (storageKey === LAWYER_NOTES_STORAGE_KEY) return readBackup('notes');
    if (storageKey === 'hami:community:posts:v1') return readBackup('community');
    if (storageKey === 'hami:smartvault:docs:v1') return readBackup('vault');
    if (storageKey === 'hami:calendar:events:v1') return readBackup('calendar');
    if (storageKey === 'hami_quantum_legal_tasks_v1') return readBackup('tasks');

    return null;
}

export function clearDecryptRecoveryAttempt(storageKey: string): void {
    decryptRecoveryAttempted.delete(storageKey);
}
