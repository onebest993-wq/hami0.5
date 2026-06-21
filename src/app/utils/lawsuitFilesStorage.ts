import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    loadDossierCollectionSync,
    persistDossierCollectionSync,
} from '@/app/services/dossierPersistence/dossierPersistenceService';
import {
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

export {
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

function readJsonArray(key: string): unknown[] | null {
    try {
        const raw = SecureStoreService.getItemSync(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** تحميل ملفات الدعاوى — يفضّل `lawyer_files` ثم يدمج المفاتيح القديمة. */
export function loadLawsuitFilesRaw(): unknown[] {
    const fromDossier = loadDossierCollectionSync('lawsuit');
    if (fromDossier.length > 0) {
        const primaryOnly = readJsonArray(LAWSUIT_FILES_STORAGE_KEY);
        if (primaryOnly === null || primaryOnly.length === 0) {
            saveLawsuitFilesRawImmediate(fromDossier);
        }
        return fromDossier;
    }

    try {
        const fromRepo = persistenceRepository.load<unknown[]>(LAWSUIT_FILES_STORAGE_KEY);
        if (Array.isArray(fromRepo) && fromRepo.length > 0) {
            return fromRepo;
        }
    } catch {
        /* persistence may be mocked in tests */
    }

    for (const legacyKey of LAWSUIT_FILES_STORAGE_KEYS_LEGACY) {
        const legacy = readJsonArray(legacyKey);
        if (legacy !== null && legacy.length > 0) {
            saveLawsuitFilesRawImmediate(legacy);
            return legacy;
        }
    }

    return fromDossier;
}

/** حفظ ملفات الدعاوى — مصدر واحد + مرآة للمفاتيح القديمة لتوافق الإصدارات السابقة. */
export function saveLawsuitFilesRaw(next: unknown[]): void {
    saveLawsuitFilesRawImmediate(next);
}

/** حفظ فوري متزامn — للاختبارات والترحيل */
export function saveLawsuitFilesRawImmediate(next: unknown[]): void {
    const payload = Array.isArray(next) ? next : [];
    persistDossierCollectionSync('lawsuit', payload);
    try {
        persistenceRepository.save(LAWSUIT_FILES_STORAGE_KEY, payload);
    } catch {
        /* persistence may be mocked in tests */
    }
}
