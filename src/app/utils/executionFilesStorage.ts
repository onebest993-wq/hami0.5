import SecureStoreService from '@/app/services/SecureStoreService';
import { persistDossierCollectionSync } from '@/app/services/dossierPersistence/dossierPersistenceService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

export {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

export function loadExecutionFilesRaw(): unknown[] {
    try {
        const primary = SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY);
        if (primary) {
            const parsed: unknown = JSON.parse(primary);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        /* ignore */
    }

    for (const k of EXECUTION_FILES_STORAGE_KEYS_LEGACY) {
        try {
            const raw = SecureStoreService.getItemSync(k);
            if (!raw) continue;
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) continue;
            saveExecutionFilesRawImmediate(parsed);
            return parsed;
        } catch {
            /* ignore */
        }
    }

    return [];
}

export function saveExecutionFilesRaw(next: unknown[]): void {
    saveExecutionFilesRawImmediate(next);
}

export function mergeExecutionFilesById(primary: unknown[], incoming: unknown[]): unknown[] {
    const out: unknown[] = [];
    const seen = new Set<string>();
    const add = (v: unknown) => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return;
        const id = String((v as { id?: unknown }).id ?? '').trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(v);
    };
    primary.forEach(add);
    incoming.forEach(add);
    return out;
}

/** حفظ فوري متزامn — للاختبارات والترحيل */
export function saveExecutionFilesRawImmediate(next: unknown[]): void {
    persistDossierCollectionSync('execution', Array.isArray(next) ? next : []);
}
